import pandas as pd
import numpy as np
from ta.momentum import RSIIndicator
from ta.trend import MACD, SMAIndicator, EMAIndicator
from ta.volatility import AverageTrueRange

def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # ensure numeric
    for c in ['open','high','low','close','volume']:
        df[c] = pd.to_numeric(df[c], errors='coerce')
    df['return_1'] = df['close'].pct_change()
    df['sma_5'] = SMAIndicator(df['close'], window=5).sma_indicator()
    df['sma_10'] = SMAIndicator(df['close'], window=10).sma_indicator()
    df['ema_9'] = EMAIndicator(df['close'], window=9).ema_indicator()
    df['ema_21'] = EMAIndicator(df['close'], window=21).ema_indicator()
    macd = MACD(df['close'])
    df['macd'] = macd.macd()
    df['macd_sig'] = macd.macd_signal()
    rsi = RSIIndicator(df['close'], window=14)
    df['rsi'] = rsi.rsi()
    atr = AverageTrueRange(df['high'], df['low'], df['close'], window=14)
    df['atr'] = atr.average_true_range()
    df['vol_rolling_std'] = df['close'].rolling(window=10).std()
    # fill na
    df.fillna(method='bfill', inplace=True)
    df.fillna(method='ffill', inplace=True)
    df.replace([np.inf, -np.inf], 0, inplace=True)
    return df
