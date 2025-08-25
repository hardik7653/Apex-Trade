ApexTrader — Advanced Prototype with ML Training

How to run (Docker - recommended):
1. Download/unzip project
2. (optional) cp .env.template .env and edit
3. docker compose up --build
4. Open http://localhost:3000 (frontend) and http://localhost:8001/docs (backend docs)

Key features:
- FastAPI backend with training pipeline (RandomizedSearchCV + HistGradientBoostingClassifier)
- Feature engineering (SMA, EMA, RSI, MACD, ATR, returns)
- /train endpoint to start background training job; /model/status to check latest model
- DB (Postgres) seeded with synthetic candles for BTCUSDT and EURUSD
- Frontend includes Train button and model status
- Charts are client-only to avoid hydration issues

Next steps after testing:
- Add real market data ingestion (Binance) and periodic retraining
- Replace synthetic seed data with historical OHLCV for better model accuracy
- Add authentication, role management, safety checks for trading endpoints
- Add model monitoring and drift detection
