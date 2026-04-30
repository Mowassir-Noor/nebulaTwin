import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { SensorsService } from '../sensors/sensors.service';
import { RedisService } from '../../common/redis/redis.service';

describe('IngestionService', () => {
  let service: IngestionService;
  let sensorsService: jest.Mocked<SensorsService>;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockSensors = {
      ingestData: jest.fn().mockResolvedValue({ accepted: true }),
    };
    const mockRedis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: SensorsService, useValue: mockSensors },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(IngestionService);
    sensorsService = module.get(SensorsService);
    redis = module.get(RedisService);
  });

  it('should ingest valid payload', async () => {
    const result = await service.ingestSingle({ sensor_id: 's1', value: 42 });
    expect(result.accepted).toBe(true);
    expect(sensorsService.ingestData).toHaveBeenCalledWith('s1', 42, undefined);
  });

  it('should reject invalid sensor_id', async () => {
    await expect(
      service.ingestSingle({ sensor_id: '', value: 42 }),
    ).rejects.toThrow('sensor_id is required');
  });

  it('should reject NaN value', async () => {
    await expect(
      service.ingestSingle({ sensor_id: 's1', value: NaN }),
    ).rejects.toThrow('value is required');
  });

  it('should rate limit when exceeding threshold', async () => {
    (redis.incr as jest.Mock).mockResolvedValue(21); // over limit of 20

    const result = await service.ingestSingle({ sensor_id: 's1', value: 42 });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('rate_limited');
    expect(sensorsService.ingestData).not.toHaveBeenCalled();
  });

  it('should track metrics', async () => {
    await service.ingestSingle({ sensor_id: 's1', value: 42 });
    const metrics = service.getMetrics();
    expect(metrics.totalIngested).toBe(1);
    expect(metrics.totalRejected).toBe(0);
  });

  describe('batch ingestion', () => {
    it('should process batch with mixed results', async () => {
      (sensorsService.ingestData as jest.Mock)
        .mockResolvedValueOnce({ accepted: true })
        .mockResolvedValueOnce({ accepted: false, reason: 'sensor_in_manual_mode' })
        .mockResolvedValueOnce({ accepted: true });

      const result = await service.ingestBatch({
        data: [
          { sensor_id: 's1', value: 10 },
          { sensor_id: 's2', value: 20 },
          { sensor_id: 's3', value: 30 },
        ],
      });

      expect(result.ingested).toBe(2);
      expect(result.rejected).toBe(1);
      expect(result.errors).toBe(0);
    });
  });
});
