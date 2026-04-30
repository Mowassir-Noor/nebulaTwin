import { Test, TestingModule } from '@nestjs/testing';
import { SensorsService } from './sensors.service';
import { PrismaService } from '../../database/prisma.service';
import { TimescaleService } from '../../database/timescale.service';
import { EventBusService } from '../../common/event-bus/event-bus.service';
import { SensorMode } from '@prisma/client';

describe('SensorsService', () => {
  let service: SensorsService;
  let prisma: jest.Mocked<PrismaService>;
  let timescale: jest.Mocked<TimescaleService>;
  let eventBus: jest.Mocked<EventBusService>;

  beforeEach(async () => {
    const mockPrisma = {
      sensor: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      alert: {
        create: jest.fn(),
      },
    };
    const mockTimescale = { insertSensorData: jest.fn() };
    const mockEventBus = {
      publishSensorData: jest.fn(),
      publishAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TimescaleService, useValue: mockTimescale },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get(SensorsService);
    prisma = module.get(PrismaService);
    timescale = module.get(TimescaleService);
    eventBus = module.get(EventBusService);
  });

  describe('ingestData', () => {
    it('should accept data when sensor is in REAL mode', async () => {
      (prisma.sensor.findUnique as jest.Mock).mockResolvedValue({
        id: 's1', tenantId: 't1', name: 'Test', mode: SensorMode.REAL,
        alertMinThreshold: null, alertMaxThreshold: null,
      });

      const result = await service.ingestData('s1', 42.0);
      expect(result.accepted).toBe(true);
      expect(timescale.insertSensorData).toHaveBeenCalledWith('s1', 42.0, undefined);
      expect(eventBus.publishSensorData).toHaveBeenCalled();
    });

    it('should reject data when sensor is in MANUAL mode', async () => {
      (prisma.sensor.findUnique as jest.Mock).mockResolvedValue({
        id: 's1', tenantId: 't1', name: 'Test', mode: SensorMode.MANUAL,
      });

      const result = await service.ingestData('s1', 42.0);
      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('sensor_in_manual_mode');
      expect(timescale.insertSensorData).not.toHaveBeenCalled();
    });

    it('should reject data when sensor is in STREAM mode', async () => {
      (prisma.sensor.findUnique as jest.Mock).mockResolvedValue({
        id: 's1', tenantId: 't1', name: 'Test', mode: SensorMode.STREAM,
      });

      const result = await service.ingestData('s1', 42.0);
      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('sensor_in_stream_mode');
    });

    it('should return not found for missing sensor', async () => {
      (prisma.sensor.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.ingestData('nonexistent', 42.0);
      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('sensor_not_found');
    });
  });

  describe('setOverride', () => {
    it('should stop active stream when setting override', async () => {
      const stopCb = jest.fn();
      service.registerStopStreamCallback(stopCb);

      (prisma.sensor.findFirst as jest.Mock).mockResolvedValue({
        id: 's1', tenantId: 't1', name: 'Test', streamActive: true,
        alertMinThreshold: null, alertMaxThreshold: null,
      });
      (prisma.sensor.update as jest.Mock).mockResolvedValue({
        id: 's1', mode: SensorMode.MANUAL, streamActive: false, manualValue: 50,
      });

      await service.setOverride('s1', 't1', 50);

      expect(stopCb).toHaveBeenCalledWith('s1');
      expect(prisma.sensor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mode: SensorMode.MANUAL,
            streamActive: false,
            manualValue: 50,
          }),
        }),
      );
    });

    it('should not call stop callback if no stream active', async () => {
      const stopCb = jest.fn();
      service.registerStopStreamCallback(stopCb);

      (prisma.sensor.findFirst as jest.Mock).mockResolvedValue({
        id: 's1', tenantId: 't1', name: 'Test', streamActive: false,
        alertMinThreshold: null, alertMaxThreshold: null,
      });
      (prisma.sensor.update as jest.Mock).mockResolvedValue({
        id: 's1', mode: SensorMode.MANUAL, manualValue: 50,
      });

      await service.setOverride('s1', 't1', 50);
      expect(stopCb).not.toHaveBeenCalled();
    });
  });

  describe('alert thresholds', () => {
    it('should create WARNING alert when value exceeds max threshold', async () => {
      (prisma.sensor.findUnique as jest.Mock).mockResolvedValue({
        id: 's1', tenantId: 't1', name: 'Pressure',
        mode: SensorMode.REAL,
        alertMinThreshold: 10, alertMaxThreshold: 90,
      });
      (prisma.alert.create as jest.Mock).mockResolvedValue({
        id: 'a1', severity: 'WARNING', message: 'test', value: 95,
        sensorId: 's1', tenantId: 't1', createdAt: new Date(),
      });

      await service.ingestData('s1', 95);

      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: 'WARNING',
            sensorId: 's1',
          }),
        }),
      );
      expect(eventBus.publishAlert).toHaveBeenCalled();
    });

    it('should not create alert when value is within thresholds', async () => {
      (prisma.sensor.findUnique as jest.Mock).mockResolvedValue({
        id: 's1', tenantId: 't1', name: 'Pressure',
        mode: SensorMode.REAL,
        alertMinThreshold: 10, alertMaxThreshold: 90,
      });

      await service.ingestData('s1', 50);
      expect(prisma.alert.create).not.toHaveBeenCalled();
    });
  });
});
