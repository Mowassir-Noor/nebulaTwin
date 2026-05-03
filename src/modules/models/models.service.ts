import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ModelFormat } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_EXTENSIONS = ['.glb', '.gltf', '.obj'];
const EXTENSION_TO_FORMAT: Record<string, ModelFormat> = {
  '.glb': ModelFormat.GLB,
  '.gltf': ModelFormat.GLTF,
  '.obj': ModelFormat.OBJ,
};

@Injectable()
export class ModelsService {
  private readonly logger = new Logger(ModelsService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly cdnBaseUrl: string;
  private readonly metadataCache = new Map<string, { data: any; ts: number }>();
  private readonly CACHE_TTL = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
    this.maxFileSize = this.config.get<number>('MAX_FILE_SIZE', 104857600);
    this.cdnBaseUrl = this.config.get<string>('CDN_BASE_URL', '');
  }

  private resolveFileUrl(relativePath: string): string {
    if (this.cdnBaseUrl) {
      return `${this.cdnBaseUrl}${relativePath}`;
    }
    return relativePath;
  }

  // ─── Upload & Create ──────────────────────────────────────

  async uploadModel(
    tenantId: string,
    file: Express.Multer.File,
    data: { twinId: string; name?: string; description?: string },
  ) {
    // Validate twin belongs to tenant
    const twin = await this.prisma.digitalTwin.findFirst({
      where: { id: data.twinId, tenantId },
    });
    if (!twin) throw new NotFoundException('Digital twin not found');

    // Validate file
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Invalid file format. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File too large. Max size: ${(this.maxFileSize / 1024 / 1024).toFixed(0)}MB`);
    }

    const format = EXTENSION_TO_FORMAT[ext];

    // Ensure upload directory exists
    const modelsDir = path.join(this.uploadDir, 'models');
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    // Save file with unique name
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(modelsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const fileUrl = this.resolveFileUrl(`/uploads/models/${fileName}`);
    const modelName = data.name || file.originalname.replace(ext, '');

    // Parse mesh structure (extract mesh names from file)
    const meshNames = this.parseMeshNames(file.buffer, ext);

    // Create model + parts in transaction
    const model = await this.prisma.$transaction(async (tx) => {
      const m = await tx.model3D.create({
        data: {
          name: modelName,
          description: data.description || '',
          fileUrl,
          format,
          sizeBytes: file.size,
          meshStructure: meshNames,
          twinId: data.twinId,
          tenantId,
        },
      });

      // Create model parts for each mesh
      if (meshNames.length > 0) {
        await tx.modelPart.createMany({
          data: meshNames.map((meshName: string) => ({
            id: uuidv4(),
            name: meshName,
            modelId: m.id,
            metadata: {},
          })),
        });
      }

      return tx.model3D.findUnique({ where: { id: m.id }, include: { modelParts: true } });
    });

    this.invalidateCache(tenantId);
    this.logger.log(`Model uploaded: ${model!.id} (${file.originalname}, ${meshNames.length} parts)`);
    return model;
  }

  // ─── Upload New Version ─────────────────────────────────────

  async uploadNewVersion(
    tenantId: string,
    parentModelId: string,
    file: Express.Multer.File,
    data: { name?: string; description?: string },
  ) {
    const parent = await this.findById(parentModelId, tenantId);
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Invalid file format. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File too large. Max: ${(this.maxFileSize / 1048576).toFixed(0)}MB`);
    }

    const format = EXTENSION_TO_FORMAT[ext];
    const modelsDir = path.join(this.uploadDir, 'models');
    if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });

    const fileName = `${uuidv4()}${ext}`;
    fs.writeFileSync(path.join(modelsDir, fileName), file.buffer);
    const fileUrl = this.resolveFileUrl(`/uploads/models/${fileName}`);

    // Determine next version number
    const maxVersion = await this.prisma.model3D.aggregate({
      where: { tenantId, OR: [{ id: parentModelId }, { parentModelId }] },
      _max: { version: true },
    });
    const nextVersion = (maxVersion._max.version || 1) + 1;

    const meshNames = this.parseMeshNames(file.buffer, ext);

    const model = await this.prisma.$transaction(async (tx) => {
      // Demote current latest
      await tx.model3D.updateMany({
        where: { tenantId, isLatest: true, OR: [{ id: parentModelId }, { parentModelId }] },
        data: { isLatest: false },
      });

      const m = await tx.model3D.create({
        data: {
          name: data.name || parent.name,
          description: data.description ?? parent.description,
          fileUrl,
          format,
          sizeBytes: file.size,
          meshStructure: meshNames,
          twinId: parent.twinId,
          tenantId,
          version: nextVersion,
          isLatest: true,
          parentModelId,
        },
      });

      if (meshNames.length > 0) {
        await tx.modelPart.createMany({
          data: meshNames.map((meshName: string) => ({ id: uuidv4(), name: meshName, modelId: m.id, metadata: {} })),
        });
      }

      return tx.model3D.findUnique({ where: { id: m.id }, include: { modelParts: true } });
    });

    this.invalidateCache(tenantId);
    this.logger.log(`New version v${nextVersion} of model ${parentModelId}: ${model!.id}`);
    return model;
  }

  // ─── Rollback ─────────────────────────────────────────────

  async rollbackToVersion(id: string, tenantId: string) {
    const target = await this.findById(id, tenantId);

    // Demote all siblings + parent
    const rootId = target.parentModel?.id || target.id;
    await this.prisma.model3D.updateMany({
      where: { tenantId, isLatest: true, OR: [{ id: rootId }, { parentModelId: rootId }] },
      data: { isLatest: false },
    });

    // Promote target
    const result = await this.prisma.model3D.update({ where: { id }, data: { isLatest: true }, include: { modelParts: true } });

    this.invalidateCache(tenantId);
    this.logger.log(`Rolled back to model ${id} (v${target.version})`);
    return result;
  }

  // ─── CRUD ─────────────────────────────────────────────────

  async findAllByTenant(tenantId: string, twinId?: string, includeDeleted = false) {
    const cacheKey = `list:${tenantId}:${twinId || 'all'}:${includeDeleted}`;
    const cached = this.metadataCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) return cached.data;

    const where: any = { tenantId };
    if (twinId) where.twinId = twinId;
    if (!includeDeleted) where.deletedAt = null;

    const result = await this.prisma.model3D.findMany({ where, include: { modelParts: true, twin: true }, orderBy: { createdAt: 'desc' } });
    this.metadataCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  async findById(id: string, tenantId: string, allowDeleted = false) {
    const cacheKey = `model:${id}`;
    const cached = this.metadataCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) return cached.data;

    const where: any = { id, tenantId };
    if (!allowDeleted) where.deletedAt = null;

    const model = await this.prisma.model3D.findFirst({
      where,
      include: { modelParts: { include: { sensors: true } }, twin: true, childVersions: { where: { deletedAt: null }, select: { id: true, version: true, createdAt: true, isLatest: true } }, parentModel: { select: { id: true, version: true, name: true } } },
    });
    if (!model) throw new NotFoundException('Model not found');

    this.metadataCache.set(cacheKey, { data: model, ts: Date.now() });
    return model;
  }

  // ─── Version History ────────────────────────────────────

  async getVersionHistory(id: string, tenantId: string) {
    const model = await this.findById(id, tenantId);
    // Walk up to root
    let rootId = model.id;
    let current: any = model;
    while (current.parentModel) {
      rootId = current.parentModel.id;
      current = (await this.prisma.model3D.findFirst({ where: { id: rootId, tenantId, deletedAt: null }, include: { parentModel: { select: { id: true, version: true, name: true } } } })) as any;
      if (!current) break;
    }

    return this.prisma.model3D.findMany({ where: { tenantId, deletedAt: null, OR: [{ id: rootId }, { parentModelId: rootId }] }, select: { id: true, version: true, name: true, isLatest: true, createdAt: true, fileUrl: true, sizeBytes: true }, orderBy: { version: 'desc' } });
  }

  private invalidateCache(tenantId?: string) {
    for (const key of this.metadataCache.keys()) {
      if (!tenantId || key.includes(tenantId) || key.startsWith('model:')) this.metadataCache.delete(key);
    }
  }

  async update(id: string, tenantId: string, data: { name?: string; description?: string }) {
    await this.findById(id, tenantId);
    const result = await this.prisma.model3D.update({ where: { id }, data, include: { modelParts: true } });
    this.invalidateCache(tenantId);
    return result;
  }

  // ─── Soft Delete ────────────────────────────────────────

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);

    const result = await this.prisma.model3D.update({ where: { id }, data: { deletedAt: new Date(), isLatest: false } });

    if (result.parentModelId) {
      const parent = await this.prisma.model3D.findFirst({ where: { id: result.parentModelId, deletedAt: null } });
      if (parent) await this.prisma.model3D.update({ where: { id: parent.id }, data: { isLatest: true } });
    }

    this.invalidateCache(tenantId);
    this.logger.log(`Model ${id} soft-deleted`);
    return result;
  }

  async restore(id: string, tenantId: string) {
    const model = await this.findById(id, tenantId, true);
    if (!model.deletedAt) throw new ConflictException('Model is not deleted');

    const result = await this.prisma.model3D.update({ where: { id }, data: { deletedAt: null, isLatest: true }, include: { modelParts: true } });

    if (model.parentModelId) {
      await this.prisma.model3D.updateMany({ where: { parentModelId: model.parentModelId, isLatest: true, id: { not: id }, deletedAt: null }, data: { isLatest: false } });
    }

    this.invalidateCache(tenantId);
    this.logger.log(`Model ${id} restored`);
    return result;
  }

  async permanentRemove(id: string, tenantId: string) {
    const model = await this.prisma.model3D.findFirst({ where: { id, tenantId }, include: { modelParts: true } });
    if (!model) throw new NotFoundException('Model not found');

    const partIds = model.modelParts.map((p) => p.id);
    if (partIds.length > 0) {
      await this.prisma.sensor.updateMany({ where: { modelPartId: { in: partIds } }, data: { modelPartId: null } });
    }

    try {
      const filePath = path.join(process.cwd(), model.fileUrl.startsWith('/') ? model.fileUrl.slice(1) : model.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      this.logger.warn(`Failed to delete model file: ${(err as Error).message}`);
    }

    this.invalidateCache(tenantId);
    this.logger.log(`Model ${id} permanently deleted`);
    return this.prisma.model3D.delete({ where: { id } });
  }

  // ─── Get bound sensor count ───────────────────────────────

  async getBoundSensorCount(id: string, tenantId: string): Promise<number> {
    const model = await this.findById(id, tenantId);
    const partIds = model.modelParts.map((p: any) => p.id);
    if (partIds.length === 0) return 0;
    return this.prisma.sensor.count({ where: { modelPartId: { in: partIds } } });
  }

  // ─── Mesh Parsing ─────────────────────────────────────────

  private parseMeshNames(buffer: Buffer, ext: string): string[] {
    try {
      if (ext === '.gltf') return this.parseGltfJson(buffer);
      if (ext === '.glb') return this.parseGlbMeshes(buffer);
      return ['Part_1'];
    } catch (err) {
      this.logger.warn(`Mesh parsing failed: ${(err as Error).message}, using defaults`);
      return ['Root'];
    }
  }

  private parseGltfJson(buffer: Buffer): string[] {
    try {
      const json = JSON.parse(buffer.toString('utf-8'));
      const meshes = json.meshes || [];
      return meshes.map((m: any, i: number) => m.name || `Mesh_${i}`);
    } catch {
      return ['Root'];
    }
  }

  private parseGlbMeshes(buffer: Buffer): string[] {
    try {
      if (buffer.length < 20) return ['Root'];
      const magic = buffer.readUInt32LE(0);
      if (magic !== 0x46546c67) return ['Root']; // 'glTF'
      const jsonLength = buffer.readUInt32LE(12);
      const jsonBuffer = buffer.subarray(20, 20 + jsonLength);
      const json = JSON.parse(jsonBuffer.toString('utf-8'));
      const meshes = json.meshes || [];
      const nodes = json.nodes || [];
      const meshNames: string[] = [];
      for (const node of nodes) {
        if (node.mesh !== undefined) meshNames.push(node.name || meshes[node.mesh]?.name || `Mesh_${node.mesh}`);
      }
      return meshNames.length > 0 ? meshNames : meshes.map((m: any, i: number) => m.name || `Mesh_${i}`);
    } catch {
      return ['Root'];
    }
  }
}
