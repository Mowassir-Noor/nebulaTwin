import { Injectable, Logger } from '@nestjs/common';
import { TimescaleService } from '../../database/timescale.service';

export interface AnomalyResult {
  sensorId: string;
  anomalyScore: number; // 0-100
  isAnomaly: boolean;
  reason: string;
  currentValue: number;
  mean: number;
  stdDev: number;
  zScore: number;
}

// Configurable thresholds
const Z_SCORE_THRESHOLD = 3.0; // 3 standard deviations
const SPIKE_THRESHOLD = 2.5;   // For sudden spike detection
const MIN_SAMPLES = 10;        // Minimum samples for statistical significance

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);
  // Rolling statistics per sensor (in-memory for speed)
  private readonly sensorStats = new Map<string, {
    values: number[];
    mean: number;
    stdDev: number;
    lastValue: number;
    windowSize: number;
  }>();

  private readonly DEFAULT_WINDOW = 100;

  constructor(private readonly timescale: TimescaleService) {}

  /**
   * Analyze a single sensor value for anomalies.
   * Uses rolling mean + std deviation with z-score analysis.
   */
  analyzeValue(sensorId: string, value: number): AnomalyResult {
    let stats = this.sensorStats.get(sensorId);

    if (!stats) {
      stats = {
        values: [],
        mean: value,
        stdDev: 0,
        lastValue: value,
        windowSize: this.DEFAULT_WINDOW,
      };
      this.sensorStats.set(sensorId, stats);
    }

    // Add to rolling window
    stats.values.push(value);
    if (stats.values.length > stats.windowSize) {
      stats.values.shift();
    }

    const prevMean = stats.mean;
    const prevStdDev = stats.stdDev;

    // Update rolling statistics
    stats.mean = stats.values.reduce((a, b) => a + b, 0) / stats.values.length;
    const variance = stats.values.reduce((sum, v) => sum + Math.pow(v - stats!.mean, 2), 0) / stats.values.length;
    stats.stdDev = Math.sqrt(variance);

    // Not enough data for meaningful analysis
    if (stats.values.length < MIN_SAMPLES) {
      stats.lastValue = value;
      return {
        sensorId,
        anomalyScore: 0,
        isAnomaly: false,
        reason: 'insufficient_data',
        currentValue: value,
        mean: stats.mean,
        stdDev: stats.stdDev,
        zScore: 0,
      };
    }

    // Z-score: how many std deviations from mean
    const zScore = stats.stdDev > 0 ? Math.abs(value - prevMean) / prevStdDev : 0;

    // Spike detection: sudden change from last value
    const deltaFromLast = Math.abs(value - stats.lastValue);
    const spikeScore = prevStdDev > 0 ? deltaFromLast / prevStdDev : 0;

    // Combined anomaly score (0-100)
    const zScoreNormalized = Math.min(zScore / Z_SCORE_THRESHOLD, 1) * 60; // 60% weight
    const spikeNormalized = Math.min(spikeScore / SPIKE_THRESHOLD, 1) * 40;  // 40% weight
    const anomalyScore = Math.round(Math.min(zScoreNormalized + spikeNormalized, 100));

    const isAnomaly = zScore >= Z_SCORE_THRESHOLD || spikeScore >= SPIKE_THRESHOLD;

    let reason = 'normal';
    if (zScore >= Z_SCORE_THRESHOLD && spikeScore >= SPIKE_THRESHOLD) {
      reason = 'spike_and_outlier';
    } else if (zScore >= Z_SCORE_THRESHOLD) {
      reason = 'statistical_outlier';
    } else if (spikeScore >= SPIKE_THRESHOLD) {
      reason = 'sudden_spike';
    }

    stats.lastValue = value;

    if (isAnomaly) {
      this.logger.warn(
        `Anomaly detected: sensor=${sensorId} value=${value.toFixed(2)} ` +
        `zScore=${zScore.toFixed(2)} spike=${spikeScore.toFixed(2)} score=${anomalyScore}`,
      );
    }

    return {
      sensorId,
      anomalyScore,
      isAnomaly,
      reason,
      currentValue: value,
      mean: stats.mean,
      stdDev: stats.stdDev,
      zScore,
    };
  }

  /**
   * Bootstrap sensor stats from historical data (call on init).
   */
  async bootstrapSensor(sensorId: string, windowSize = 100): Promise<void> {
    try {
      const to = new Date();
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000); // Last 24h
      const history = await this.timescale.querySensorData(sensorId, from, to, windowSize);
      if (history && history.length > 0) {
        const values = history.map((p: any) => p.value);
        const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        const variance = values.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / values.length;
        this.sensorStats.set(sensorId, {
          values,
          mean,
          stdDev: Math.sqrt(variance),
          lastValue: values[values.length - 1],
          windowSize,
        });
        this.logger.debug(`Bootstrapped anomaly stats for sensor ${sensorId} (${values.length} points)`);
      }
    } catch (err) {
      this.logger.warn(`Failed to bootstrap sensor ${sensorId}: ${(err as Error).message}`);
    }
  }

  /**
   * Get current stats for a sensor.
   */
  getStats(sensorId: string) {
    const stats = this.sensorStats.get(sensorId);
    if (!stats) return null;
    return {
      sensorId,
      sampleCount: stats.values.length,
      mean: stats.mean,
      stdDev: stats.stdDev,
      lastValue: stats.lastValue,
    };
  }
}
