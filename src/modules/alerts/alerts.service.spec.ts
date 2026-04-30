import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../../database/prisma.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      alert: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(AlertsService);
    prisma = module.get(PrismaService);
  });

  it('should find alerts by tenant', async () => {
    await service.findByTenant('t1');
    expect(prisma.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 't1' },
        take: 50,
      }),
    );
  });

  it('should find unacknowledged alerts', async () => {
    await service.findUnacknowledged('t1');
    expect(prisma.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 't1', acknowledged: false },
      }),
    );
  });

  it('should acknowledge a single alert', async () => {
    await service.acknowledge('a1', 't1');
    expect(prisma.alert.updateMany).toHaveBeenCalledWith({
      where: { id: 'a1', tenantId: 't1' },
      data: { acknowledged: true },
    });
  });

  it('should acknowledge all alerts', async () => {
    await service.acknowledgeAll('t1');
    expect(prisma.alert.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 't1', acknowledged: false },
      data: { acknowledged: true },
    });
  });

  it('should return stats', async () => {
    (prisma.alert.count as jest.Mock)
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(3)  // unacknowledged
      .mockResolvedValueOnce(1)  // critical
      .mockResolvedValueOnce(2); // warning

    const stats = await service.getStats('t1');
    expect(stats).toEqual({ total: 10, unacknowledged: 3, critical: 1, warning: 2 });
  });
});
