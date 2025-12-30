-- Table untuk menyimpan data temperature realtime (streaming ke app)
-- Jalankan query ini di Supabase SQL Editor

-- Create table temperature_realtime
CREATE TABLE IF NOT EXISTS temperature_realtime (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  temperature FLOAT,
  humidity FLOAT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE temperature_realtime ENABLE ROW LEVEL SECURITY;

-- Policy untuk authenticated users bisa read data mereka sendiri
CREATE POLICY "Users can read their own temperature data"
  ON temperature_realtime
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy untuk service role bisa insert/update (dari backend)
CREATE POLICY "Service role can insert temperature data"
  ON temperature_realtime
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update temperature data"
  ON temperature_realtime
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Enable Realtime untuk table ini
-- Pergi ke Supabase Dashboard > Database > Replication
-- Atau jalankan:
ALTER PUBLICATION supabase_realtime ADD TABLE temperature_realtime;

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_temperature_realtime_user_id 
  ON temperature_realtime(user_id);

CREATE INDEX IF NOT EXISTS idx_temperature_realtime_updated_at 
  ON temperature_realtime(updated_at DESC);

-- Trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_temperature_realtime_updated_at
  BEFORE UPDATE ON temperature_realtime
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
