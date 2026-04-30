-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create sensor_data hypertable for time-series data
CREATE TABLE IF NOT EXISTS sensor_data (
    time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sensor_id   TEXT        NOT NULL,
    value       DOUBLE PRECISION NOT NULL,
    metadata    JSONB
);

-- Convert to hypertable (partitioned by time)
SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_id ON sensor_data (sensor_id, time DESC);

-- Add compression policy (compress chunks older than 7 days)
-- ALTER TABLE sensor_data SET (timescaledb.compress, timescaledb.compress_segmentby = 'sensor_id');
-- SELECT add_compression_policy('sensor_data', INTERVAL '7 days');

-- Add retention policy (drop data older than 90 days) - enable in production
-- SELECT add_retention_policy('sensor_data', INTERVAL '90 days');
