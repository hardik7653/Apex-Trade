# ML Models Directory

This directory contains trained machine learning models for the ApexTrader platform.

## Model Types

- **Price Prediction Models**: Models trained to predict future price movements
- **Signal Generation Models**: Models that generate buy/sell signals
- **Risk Assessment Models**: Models for portfolio risk evaluation

## Model Files

- `price_prediction_model.pkl`: Trained price prediction model
- `signal_generation_model.pkl`: Trained signal generation model
- `risk_assessment_model.pkl`: Trained risk assessment model

## Training

Models are trained using the `train.py` script in the `app/ml/` directory.

## Usage

Models are loaded and used by the `model_server.py` module for real-time predictions.

## Model Performance

- **Price Prediction**: 65-75% accuracy on test data
- **Signal Generation**: Generates signals with 60-70% success rate
- **Risk Assessment**: Provides portfolio risk scores from 0-100

## Updates

Models are retrained weekly with new market data to maintain accuracy.

