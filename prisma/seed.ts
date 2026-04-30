import { PrismaClient, Role, AssetType, SensorMode } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant-id' },
    update: {},
    create: {
      id: 'default-tenant-id',
      name: 'NebulaTwin Demo Org',
    },
  });

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nebulatwin.io' },
    update: {},
    create: {
      email: 'admin@nebulatwin.io',
      passwordHash,
      name: 'System Admin',
      role: Role.ADMIN,
      tenantId: tenant.id,
    },
  });

  // Create a sample digital twin
  const twin = await prisma.digitalTwin.upsert({
    where: { id: 'demo-twin-id' },
    update: {},
    create: {
      id: 'demo-twin-id',
      name: 'Smart Factory Alpha',
      description: 'Demo digital twin of a manufacturing facility',
      tenantId: tenant.id,
    },
  });

  // Create asset hierarchy: factory → line → machine → component
  const factory = await prisma.asset.upsert({
    where: { id: 'demo-factory-id' },
    update: {},
    create: {
      id: 'demo-factory-id',
      name: 'Factory Floor A',
      type: AssetType.FACTORY,
      twinId: twin.id,
    },
  });

  const line = await prisma.asset.upsert({
    where: { id: 'demo-line-id' },
    update: {},
    create: {
      id: 'demo-line-id',
      name: 'Assembly Line 1',
      type: AssetType.LINE,
      twinId: twin.id,
      parentId: factory.id,
    },
  });

  const machine = await prisma.asset.upsert({
    where: { id: 'demo-machine-id' },
    update: {},
    create: {
      id: 'demo-machine-id',
      name: 'CNC Machine X200',
      type: AssetType.MACHINE,
      twinId: twin.id,
      parentId: line.id,
    },
  });

  const component = await prisma.asset.upsert({
    where: { id: 'demo-component-id' },
    update: {},
    create: {
      id: 'demo-component-id',
      name: 'Spindle Motor',
      type: AssetType.COMPONENT,
      twinId: twin.id,
      parentId: machine.id,
    },
  });

  // Create sample sensors
  const sensors = [
    { id: 'sensor-temp-01', name: 'Temperature Sensor', type: 'temperature', unit: '°C' },
    { id: 'sensor-vibr-01', name: 'Vibration Sensor', type: 'vibration', unit: 'mm/s' },
    { id: 'sensor-pres-01', name: 'Pressure Sensor', type: 'pressure', unit: 'bar' },
    { id: 'sensor-rpm-01', name: 'RPM Sensor', type: 'rpm', unit: 'RPM' },
  ];

  for (const s of sensors) {
    await prisma.sensor.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        name: s.name,
        type: s.type,
        unit: s.unit,
        mode: SensorMode.REAL,
        assetId: component.id,
        tenantId: tenant.id,
      },
    });
  }

  console.log('Seed completed successfully');
  console.log(`  Tenant: ${tenant.name}`);
  console.log(`  Admin: ${admin.email}`);
  console.log(`  Twin: ${twin.name}`);
  console.log(`  Sensors: ${sensors.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
