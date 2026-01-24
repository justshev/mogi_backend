-- Feature Store Migration
-- Run this migration to create the feature_store and inference_results tables

-- Create feature_store table for aggregated ML features
CREATE TABLE IF NOT EXISTS feature_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    
    -- Aggregation metadata
    window_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'custom'
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    sample_count INTEGER NOT NULL DEFAULT 0,
    
    -- Temperature features
    temp_avg DOUBLE PRECISION NOT NULL,
    temp_min DOUBLE PRECISION NOT NULL,
    temp_max DOUBLE PRECISION NOT NULL,
    temp_std DOUBLE PRECISION NOT NULL DEFAULT 0,
    temp_trend DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Humidity features
    humidity_avg DOUBLE PRECISION NOT NULL,
    humidity_min DOUBLE PRECISION NOT NULL,
    humidity_max DOUBLE PRECISION NOT NULL,
    humidity_std DOUBLE PRECISION NOT NULL DEFAULT 0,
    humidity_trend DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Warmth features
    warmth_avg DOUBLE PRECISION NOT NULL,
    warmth_min DOUBLE PRECISION NOT NULL,
    warmth_max DOUBLE PRECISION NOT NULL,
    warmth_std DOUBLE PRECISION NOT NULL DEFAULT 0,
    warmth_trend DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Business context
    baglog_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for upsert operations
    CONSTRAINT unique_feature_window 
        UNIQUE (user_id, device_id, window_type, window_start)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_feature_store_user_window 
    ON feature_store(user_id, window_type, window_start);
    
CREATE INDEX IF NOT EXISTS idx_feature_store_device_window 
    ON feature_store(device_id, window_type, window_start);
    
CREATE INDEX IF NOT EXISTS idx_feature_store_time_range 
    ON feature_store(window_start, window_end);

-- Create inference_results table for audit trail
CREATE TABLE IF NOT EXISTS inference_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    feature_store_id UUID REFERENCES feature_store(id) ON DELETE SET NULL,
    
    -- Model versioning
    model_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    
    -- Predictions
    harvest_time_days DOUBLE PRECISION NOT NULL,
    risk_fail INTEGER NOT NULL CHECK (risk_fail IN (0, 1)),
    risk_probability DOUBLE PRECISION,
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    anomaly_score DOUBLE PRECISION,
    
    -- Recommendations (JSON string)
    recommendations TEXT NOT NULL,
    
    -- Request metadata
    request_latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for inference results
CREATE INDEX IF NOT EXISTS idx_inference_results_user_time 
    ON inference_results(user_id, created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_inference_results_device_time 
    ON inference_results(device_id, created_at DESC);

-- Add warmth column to logs table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'logs' AND column_name = 'warmth'
    ) THEN
        ALTER TABLE logs ADD COLUMN warmth DOUBLE PRECISION;
    END IF;
END $$;

-- Add indexes to logs table for efficient aggregation queries
CREATE INDEX IF NOT EXISTS idx_logs_user_timestamp 
    ON logs(user_id, timestamp);
    
CREATE INDEX IF NOT EXISTS idx_logs_device_timestamp 
    ON logs(device_id, timestamp);
    
CREATE INDEX IF NOT EXISTS idx_logs_timestamp 
    ON logs(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE feature_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE inference_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (cast user_id to text for comparison with auth.uid())
CREATE POLICY "Users can view own features" 
    ON feature_store FOR SELECT 
    USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own features" 
    ON feature_store FOR INSERT 
    WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own features" 
    ON feature_store FOR UPDATE 
    USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view own inference results" 
    ON inference_results FOR SELECT 
    USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own inference results" 
    ON inference_results FOR INSERT 
    WITH CHECK (user_id::text = auth.uid()::text);

-- Grant permissions for service role (bypass RLS)
GRANT ALL ON feature_store TO service_role;
GRANT ALL ON inference_results TO service_role;

-- Create updated_at trigger for feature_store
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_store_updated_at
    BEFORE UPDATE ON feature_store
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE feature_store IS 'Aggregated sensor features for ML inference (feature store pattern)';
COMMENT ON TABLE inference_results IS 'ML prediction results for audit and analysis';
