import os
import time
from typing import Dict, List, Optional, Any
from binance.client import Client
from binance.exceptions import BinanceAPIException, BinanceOrderException
from cryptography.fernet import Fernet
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BinanceService:
    def __init__(self):
        self.client = None
        self.encryption_key = None
        self._setup_encryption()
    
    def _setup_encryption(self):
        """Setup encryption key for storing API secrets"""
        key_file = ".encryption_key"
        if os.path.exists(key_file):
            with open(key_file, "rb") as f:
                self.encryption_key = f.read()
        else:
            self.encryption_key = Fernet.generate_key()
            with open(key_file, "wb") as f:
                f.write(self.encryption_key)
    
    def encrypt_secret(self, secret: str) -> str:
        """Encrypt API secret"""
        if not self.encryption_key:
            raise ValueError("Encryption key not available")
        f = Fernet(self.encryption_key)
        return f.encrypt(secret.encode()).decode()
    
    def decrypt_secret(self, encrypted_secret: str) -> str:
        """Decrypt API secret"""
        if not self.encryption_key:
            raise ValueError("Encryption key not available")
        f = Fernet(self.encryption_key)
        return f.decrypt(encrypted_secret.encode()).decode()
    
    def connect(self, api_key: str, api_secret: str) -> bool:
        """Connect to Binance API with enhanced validation"""
        if not api_key or not api_secret:
            logger.error("Missing API credentials")
            raise ValueError("API key and secret are required")
            
        try:
            # Clear existing client if any
            self.client = None
            
            # Create new client
            self.client = Client(api_key, api_secret)
            
            # Test connection with explicit validation
            account = self.client.get_account()
            
            # Verify we got valid account data
            if not account or 'balances' not in account:
                logger.error("Invalid response from Binance API")
                self.client = None
                raise ValueError("Invalid response from Binance API")
                
            logger.info("Successfully connected to Binance API")
            return True
            
        except BinanceAPIException as e:
            logger.error(f"Binance API error: {e}")
            self.client = None
            
            # Provide more specific error messages based on error code
            if e.code == -2015:
                raise ValueError("Invalid API key format")
            elif e.code == -2014:
                raise ValueError("API key authentication failed")
            elif e.code == -1022:
                raise ValueError("Signature for this request is not valid")
            else:
                raise ValueError(f"Invalid API credentials: {e.message}")
                
        except Exception as e:
            logger.error(f"Connection error: {e}")
            self.client = None
            raise ValueError(f"Failed to connect: {str(e)}")
    
    def get_account_info(self) -> Dict[str, Any]:
        """Get account information"""
        if not self.client:
            raise ValueError("Not connected to Binance API")
        
        try:
            account = self.client.get_account()
            balances = []
            
            for balance in account['balances']:
                if float(balance['free']) > 0 or float(balance['locked']) > 0:
                    balances.append({
                        'asset': balance['asset'],
                        'free': float(balance['free']),
                        'locked': float(balance['locked']),
                        'total': float(balance['free']) + float(balance['locked'])
                    })
            
            return {
                'account_type': account['accountType'],
                'permissions': account['permissions'],
                'balances': balances,
                'maker_commission': account['makerCommission'],
                'taker_commission': account['takerCommission']
            }
        except BinanceAPIException as e:
            logger.error(f"Failed to get account info: {e}")
            raise ValueError(f"Failed to get account info: {e.message}")
    
    def get_klines(self, symbol: str, interval: str = '1m', limit: int = 500) -> List[Dict]:
        """Get candlestick data"""
        if not self.client:
            raise ValueError("Not connected to Binance API")
        
        try:
            klines = self.client.get_klines(
                symbol=symbol,
                interval=interval,
                limit=limit
            )
            
            formatted_klines = []
            for kline in klines:
                formatted_klines.append({
                    'openTime': kline[0],
                    'open': float(kline[1]),
                    'high': float(kline[2]),
                    'low': float(kline[3]),
                    'close': float(kline[4]),
                    'volume': float(kline[5]),
                    'closeTime': kline[6],
                    'quoteVolume': float(kline[7]),
                    'trades': int(kline[8]),
                    'takerBuyBaseVolume': float(kline[9]),
                    'takerBuyQuoteVolume': float(kline[10])
                })
            
            return formatted_klines
        except BinanceAPIException as e:
            logger.error(f"Failed to get klines for {symbol}: {e}")
            raise ValueError(f"Failed to get market data: {e.message}")
    
    def get_ticker_price(self, symbol: str) -> Dict[str, Any]:
        """Get current price for a symbol"""
        if not self.client:
            raise ValueError("Not connected to Binance API")
        
        try:
            ticker = self.client.get_symbol_ticker(symbol=symbol)
            return {
                'symbol': ticker['symbol'],
                'price': float(ticker['price'])
            }
        except BinanceAPIException as e:
            logger.error(f"Failed to get ticker for {symbol}: {e}")
            raise ValueError(f"Failed to get price: {e.message}")
    
    def get_order_book(self, symbol: str, limit: int = 10) -> Dict[str, Any]:
        """Get order book for a symbol"""
        if not self.client:
            raise ValueError("Not connected to Binance API")
        
        try:
            order_book = self.client.get_order_book(symbol=symbol, limit=limit)
            return {
                'symbol': symbol,
                'bids': [[float(price), float(qty)] for price, qty in order_book['bids']],
                'asks': [[float(price), float(qty)] for price, qty in order_book['asks']],
                'lastUpdateId': order_book['lastUpdateId']
            }
        except BinanceAPIException as e:
            logger.error(f"Failed to get order book for {symbol}: {e}")
            raise ValueError(f"Failed to get order book: {e.message}")
    
    def place_order(self, symbol: str, side: str, order_type: str, 
                   quantity: float, price: Optional[float] = None) -> Dict[str, Any]:
        """Place an order"""
        if not self.client:
            raise ValueError("Not connected to Binance API")
        
        try:
            if order_type.upper() == 'MARKET':
                if side.upper() == 'BUY':
                    order = self.client.order_market_buy(
                        symbol=symbol,
                        quantity=quantity
                    )
                else:
                    order = self.client.order_market_sell(
                        symbol=symbol,
                        quantity=quantity
                    )
            elif order_type.upper() == 'LIMIT':
                if not price:
                    raise ValueError("Price is required for limit orders")
                
                if side.upper() == 'BUY':
                    order = self.client.order_limit_buy(
                        symbol=symbol,
                        quantity=quantity,
                        price=str(price)
                    )
                else:
                    order = self.client.order_limit_sell(
                        symbol=symbol,
                        quantity=quantity,
                        price=str(price)
                    )
            else:
                raise ValueError(f"Unsupported order type: {order_type}")
            
            return {
                'orderId': order['orderId'],
                'symbol': order['symbol'],
                'side': order['side'],
                'type': order['type'],
                'quantity': float(order['origQty']),
                'price': float(order['price']) if order['price'] != '0' else None,
                'status': order['status'],
                'time': order['time']
            }
        except BinanceOrderException as e:
            logger.error(f"Order placement failed: {e}")
            raise ValueError(f"Order failed: {e.message}")
        except BinanceAPIException as e:
            logger.error(f"API error during order placement: {e}")
            raise ValueError(f"API error: {e.message}")
    
    def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get open orders"""
        if not self.client:
            raise ValueError("Not connected to Binance API")
        
        try:
            orders = self.client.get_open_orders(symbol=symbol)
            formatted_orders = []
            
            for order in orders:
                formatted_orders.append({
                    'orderId': order['orderId'],
                    'symbol': order['symbol'],
                    'side': order['side'],
                    'type': order['type'],
                    'quantity': float(order['origQty']),
                    'price': float(order['price']),
                    'status': order['status'],
                    'time': order['time']
                })
            
            return formatted_orders
        except BinanceAPIException as e:
            logger.error(f"Failed to get open orders: {e}")
            raise ValueError(f"Failed to get open orders: {e.message}")
    
    def cancel_order(self, symbol: str, order_id: int) -> bool:
        """Cancel an order"""
        if not self.client:
            raise ValueError("Not connected to Binance API")
        
        try:
            result = self.client.cancel_order(symbol=symbol, orderId=order_id)
            return result['status'] == 'CANCELED'
        except BinanceAPIException as e:
            logger.error(f"Failed to cancel order: {e}")
            raise ValueError(f"Failed to cancel order: {e.message}")

# Global instance
binance_service = BinanceService()

