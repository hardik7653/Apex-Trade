-- Initialize ApexTrader Database
-- This script runs when the PostgreSQL container starts

-- Create the apex database if it doesn't exist
SELECT 'CREATE DATABASE apex'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'apex')\gexec

-- Connect to the apex database
\c apex;

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE apex TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;

-- Set timezone
SET timezone = 'UTC';

-- Create custom types if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_side') THEN
        CREATE TYPE trade_side AS ENUM ('BUY', 'SELL');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('PENDING', 'FILLED', 'CANCELLED', 'REJECTED');
    END IF;
END$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_ts ON trades(ts);
CREATE INDEX IF NOT EXISTS idx_candles_symbol ON candles(symbol);
CREATE INDEX IF NOT EXISTS idx_candles_open_time ON candles("openTime");

-- Create views for common queries
CREATE OR REPLACE VIEW recent_trades AS
SELECT * FROM trades 
ORDER BY ts DESC 
LIMIT 100;

CREATE OR REPLACE VIEW symbol_summary AS
SELECT 
    symbol,
    COUNT(*) as trade_count,
    AVG(price) as avg_price,
    SUM(CASE WHEN side = 'BUY' THEN size ELSE 0 END) as total_buy_size,
    SUM(CASE WHEN side = 'SELL' THEN size ELSE 0 END) as total_sell_size
FROM trades 
GROUP BY symbol;

-- Grant permissions on views
GRANT SELECT ON recent_trades TO postgres;
GRANT SELECT ON symbol_summary TO postgres;

-- Log successful initialization
SELECT 'ApexTrader database initialized successfully' as status;

