import requests
import hmac
import hashlib
import time
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class SecureBinanceAPI:
    def __init__(self, api_key: Optional[str] = None, api_secret: Optional[str] = None, testnet: bool = False):
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        self.base_url = "https://testnet.binance.vision" if testnet else "https://api.binance.com"
        self.connected = False
        self.last_request_time = 0
        self.request_count = 0
        
    def _rate_limit(self):
        """Implement rate limiting"""
        current_time = time.time()
        if current_time - self.last_request_time < 0.1:  # 10 requests per second
            time.sleep(0.1)
        self.last_request_time = current_time
        
    def _generate_signature(self, params: Dict) -> str:
        """Generate HMAC SHA256 signature for signed requests"""
        if not self.api_secret:
            return ""
        query_string = '&'.join([f"{k}={v}" for k, v in sorted(params.items())])
        return hmac.new(self.api_secret.encode('utf-8'), query_string.encode('utf-8'), hashlib.sha256).hexdigest()
    
    def test_connection(self) -> bool:
        """Test API connection with proper error handling"""
        try:
            self._rate_limit()
            response = requests.get(f"{self.base_url}/api/v3/ping", timeout=10)
            self.connected = response.status_code == 200
            return self.connected
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            self.connected = False
            return False
    
    def verify_api_keys(self) -> Dict:
        """Verify API keys are valid"""
        if not self.api_key or not self.api_secret:
            return {"error": "API credentials required"}
        
        try:
            self._rate_limit()
            params = {
                'timestamp': int(time.time() * 1000),
                'recvWindow': 5000
            }
            params['signature'] = self._generate_signature(params)
            
            headers = {'X-MBX-APIKEY': self.api_key}
            response = requests.get(f"{self.base_url}/api/v3/account", params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                account_data = response.json()
                return {
                    "success": True,
                    "account": account_data,
                    "testnet": self.testnet
                }
            else:
                error_msg = f"API verification failed: {response.status_code}"
                if response.status_code == 401:
                    error_msg = "Invalid API credentials"
                elif response.status_code == 403:
                    error_msg = "API key doesn't have required permissions"
                return {"error": error_msg}
                
        except Exception as e:
            logger.error(f"API verification error: {e}")
            return {"error": f"Connection error: {str(e)}"}
    
    def get_account_info(self) -> Dict:
        """Get account information with error handling"""
        result = self.verify_api_keys()
        if "error" in result:
            return result
        return result["account"]
    
    def get_klines(self, symbol: str, interval: str = '1h', limit: int = 500) -> Dict:
        """Get candlestick data with validation"""
        try:
            self._rate_limit()
            params = {
                'symbol': symbol.upper(),
                'interval': interval,
                'limit': min(limit, 1000)  # Binance limit
            }
            response = requests.get(f"{self.base_url}/api/v3/klines", params=params, timeout=10)
            
            if response.status_code == 200:
                klines = response.json()
                if not klines:
                    return {"error": f"No data available for {symbol}"}
                
                # Convert to DataFrame
                import pandas as pd
                df = pd.DataFrame(klines, columns=[
                    'timestamp', 'open', 'high', 'low', 'close', 'volume',
                    'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                    'taker_buy_quote', 'ignore'
                ])
                
                # Convert to numeric
                numeric_columns = ['open', 'high', 'low', 'close', 'volume']
                for col in numeric_columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                
                # Remove any rows with NaN values
                df = df.dropna()
                
                if df.empty:
                    return {"error": f"Invalid data for {symbol}"}
                
                return {"success": True, "data": df}
            else:
                return {"error": f"Failed to get data: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Klines error for {symbol}: {e}")
            return {"error": f"Data retrieval error: {str(e)}"}
    
    def place_order(self, symbol: str, side: str, quantity: float, order_type: str = 'MARKET', price: Optional[float] = None) -> Dict:
        """Place order with comprehensive error handling"""
        if not self.api_key or not self.api_secret:
            return {"error": "API credentials required"}
        
        try:
            self._rate_limit()
            params = {
                'symbol': symbol.upper(),
                'side': side.upper(),
                'type': order_type,
                'quantity': quantity,
                'timestamp': int(time.time() * 1000),
                'recvWindow': 5000
            }
            
            if price and order_type == 'LIMIT':
                params['price'] = price
                params['timeInForce'] = 'GTC'
            
            params['signature'] = self._generate_signature(params)
            headers = {'X-MBX-APIKEY': self.api_key}
            
            response = requests.post(f"{self.base_url}/api/v3/order", params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return {"success": True, "order": response.json()}
            else:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('msg', f"Order failed: {response.status_code}")
                return {"error": error_msg}
                
        except Exception as e:
            logger.error(f"Order placement error: {e}")
            return {"error": f"Order error: {str(e)}"}
    
    def get_exchange_info(self) -> Dict:
        """Get exchange information"""
        try:
            self._rate_limit()
            response = requests.get(f"{self.base_url}/api/v3/exchangeInfo", timeout=10)
            
            if response.status_code == 200:
                return {"success": True, "data": response.json()}
            else:
                return {"error": f"Failed to get exchange info: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Exchange info error: {e}")
            return {"error": f"Exchange info error: {str(e)}"}
    
    def get_ticker_price(self, symbol: str) -> Dict:
        """Get current ticker price"""
        try:
            self._rate_limit()
            params = {'symbol': symbol.upper()}
            response = requests.get(f"{self.base_url}/api/v3/ticker/price", params=params, timeout=10)
            
            if response.status_code == 200:
                return {"success": True, "data": response.json()}
            else:
                return {"error": f"Failed to get ticker price: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Ticker price error: {e}")
            return {"error": f"Ticker price error: {str(e)}"}



