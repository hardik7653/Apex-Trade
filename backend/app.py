from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import requests
import hmac
import hashlib
import time
import logging
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BinanceAPI:
    def __init__(self, api_key=None, api_secret=None, testnet=False):
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        self.base_url = "https://testnet.binance.vision" if testnet else "https://api.binance.com"
        self.ws_url = "wss://testnet.binance.vision/ws" if testnet else "wss://stream.binance.com:9443/ws"
        
    def _generate_signature(self, params):
        """Generate HMAC SHA256 signature for signed requests"""
        if not self.api_secret:
            return ""
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        return hmac.new(self.api_secret.encode('utf-8'), query_string.encode('utf-8'), hashlib.sha256).hexdigest()
    
    def ping(self):
        """Test connectivity to Binance API"""
        try:
            response = requests.get(f"{self.base_url}/api/v3/ping", timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ping failed: {e}")
            return False
    
    def get_account_info(self):
        """Get account information"""
        if not self.api_key or not self.api_secret:
            return {"error": "API credentials required"}
        
        try:
            params = {
                'timestamp': int(time.time() * 1000),
                'recvWindow': 5000
            }
            params['signature'] = self._generate_signature(params)
            
            headers = {'X-MBX-APIKEY': self.api_key}
            response = requests.get(f"{self.base_url}/api/v3/account", params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Account info failed: {response.status_code} - {response.text}")
                return {"error": f"Failed to get account info: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Account info error: {e}")
            return {"error": str(e)}
    
    def get_balances(self):
        """Get account balances"""
        account_info = self.get_account_info()
        if 'error' in account_info:
            return account_info
        
        try:
            balances = []
            for balance in account_info.get('balances', []):
                free = float(balance['free'])
                locked = float(balance['locked'])
                total = free + locked
                
                if total > 0:  # Only show non-zero balances
                    balances.append({
                        'asset': balance['asset'],
                        'free': free,
                        'locked': locked,
                        'total': total,
                        'usdt_value': 0  # Will be calculated later
                    })
            
            # Calculate USDT values for better accuracy
            balances = self._calculate_usdt_values(balances)
            return balances
            
        except Exception as e:
            logger.error(f"Balance calculation error: {e}")
            return {"error": str(e)}
    
    def _calculate_usdt_values(self, balances):
        """Calculate USDT equivalent values for all balances"""
        try:
            for balance in balances:
                if balance['asset'] == 'USDT':
                    balance['usdt_value'] = balance['total']
                else:
                    # Get current price in USDT
                    symbol = f"{balance['asset']}USDT"
                    price_data = self.get_symbol_price(symbol)
                    if price_data and 'price' in price_data:
                        price = float(price_data['price'])
                        balance['usdt_value'] = balance['total'] * price
                    else:
                        balance['usdt_value'] = 0
            
            # Sort by USDT value (highest first)
            balances.sort(key=lambda x: x['usdt_value'], reverse=True)
            return balances
            
        except Exception as e:
            logger.error(f"USDT calculation error: {e}")
            return balances
    
    def get_symbol_price(self, symbol):
        """Get current price for a symbol"""
        try:
            response = requests.get(f"{self.base_url}/api/v3/ticker/price", params={'symbol': symbol}, timeout=10)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Price fetch error for {symbol}: {e}")
            return None
    
    def get_open_orders(self, symbol=None):
        """Get open orders"""
        if not self.api_key or not self.api_secret:
            return {"error": "API credentials required"}
        
        try:
            params = {
                'timestamp': int(time.time() * 1000),
                'recvWindow': 5000
            }
            
            if symbol:
                params['symbol'] = symbol
                
            params['signature'] = self._generate_signature(params)
            headers = {'X-MBX-APIKEY': self.api_key}
            
            response = requests.get(f"{self.base_url}/api/v3/openOrders", params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Open orders failed: {response.status_code} - {response.text}")
                return {"error": f"Failed to get open orders: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Open orders error: {e}")
            return {"error": str(e)}
    
    def place_order(self, symbol, side, order_type, quantity, price=None, time_in_force='GTC'):
        """Place a new order with improved accuracy"""
        if not self.api_key or not self.api_secret:
            return {"error": "API credentials required"}
        
        try:
            # Validate inputs
            if not symbol or not side or not order_type or not quantity:
                return {"error": "Missing required parameters"}
            
            if order_type == 'LIMIT' and not price:
                return {"error": "Price required for limit orders"}
            
            # Validate quantity and price precision
            symbol_info = self._get_symbol_info(symbol)
            if symbol_info:
                quantity = self._format_quantity(quantity, symbol_info)
                if price:
                    price = self._format_price(price, symbol_info)
            
            params = {
                'symbol': symbol,
                'side': side,
                'type': order_type,
                'quantity': quantity,
                'timestamp': int(time.time() * 1000),
                'recvWindow': 5000
            }
            
            if price:
                params['price'] = price
            if time_in_force:
                params['timeInForce'] = time_in_force
                
            params['signature'] = self._generate_signature(params)
            headers = {'X-MBX-APIKEY': self.api_key}
            
            response = requests.post(f"{self.base_url}/api/v3/order", params=params, headers=headers, timeout=15)
            
            if response.status_code == 200:
                order_data = response.json()
                logger.info(f"Order placed successfully: {order_data}")
                
                # Emit socket event for real-time updates
                socketio.emit('order_placed', {
                    'order': order_data,
                    'timestamp': datetime.now().isoformat()
                })
                
                return order_data
            else:
                error_msg = f"Order placement failed: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {"error": error_msg}
                
        except Exception as e:
            error_msg = f"Order placement error: {e}"
            logger.error(error_msg)
            return {"error": error_msg}
    
    def _get_symbol_info(self, symbol):
        """Get symbol information for precision requirements"""
        try:
            response = requests.get(f"{self.base_url}/api/v3/exchangeInfo", timeout=10)
            if response.status_code == 200:
                exchange_info = response.json()
                for symbol_info in exchange_info.get('symbols', []):
                    if symbol_info['symbol'] == symbol:
                        return symbol_info
            return None
        except Exception as e:
            logger.error(f"Symbol info error: {e}")
            return None
    
    def _format_quantity(self, quantity, symbol_info):
        """Format quantity according to symbol precision requirements"""
        try:
            lot_size_filter = next((f for f in symbol_info.get('filters', []) if f['filterType'] == 'LOT_SIZE'), None)
            if lot_size_filter:
                step_size = float(lot_size_filter['stepSize'])
                precision = len(str(step_size).split('.')[-1].rstrip('0'))
                return round(float(quantity), precision)
            return float(quantity)
        except Exception as e:
            logger.error(f"Quantity formatting error: {e}")
            return float(quantity)
    
    def _format_price(self, price, symbol_info):
        """Format price according to symbol precision requirements"""
        try:
            price_filter = next((f for f in symbol_info.get('filters', []) if f['filterType'] == 'PRICE_FILTER'), None)
            if price_filter:
                tick_size = float(price_filter['tickSize'])
                precision = len(str(tick_size).split('.')[-1].rstrip('0'))
                return round(float(price), precision)
            return float(price)
        except Exception as e:
            logger.error(f"Price formatting error: {e}")
            return float(price)
    
    def cancel_order(self, symbol, order_id):
        """Cancel an existing order"""
        if not self.api_key or not self.api_secret:
            return {"error": "API credentials required"}
        
        try:
            params = {
                'symbol': symbol,
                'orderId': order_id,
                'timestamp': int(time.time() * 1000),
                'recvWindow': 5000
            }
            params['signature'] = self._generate_signature(params)
            headers = {'X-MBX-APIKEY': self.api_key}
            
            response = requests.delete(f"{self.base_url}/api/v3/order", params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                cancel_data = response.json()
                logger.info(f"Order cancelled successfully: {cancel_data}")
                
                # Emit socket event
                socketio.emit('order_cancelled', {
                    'order': cancel_data,
                    'timestamp': datetime.now().isoformat()
                })
                
                return cancel_data
            else:
                error_msg = f"Order cancellation failed: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {"error": error_msg}
                
        except Exception as e:
            error_msg = f"Order cancellation error: {e}"
            logger.error(error_msg)
            return {"error": error_msg}
    
    def get_trades(self, symbol, limit=50):
        """Get recent trades for a symbol"""
        try:
            params = {'symbol': symbol, 'limit': limit}
            response = requests.get(f"{self.base_url}/api/v3/trades", params=params, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Trades fetch failed: {response.status_code}")
                return {"error": f"Failed to fetch trades: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Trades fetch error: {e}")
            return {"error": str(e)}
    
    def get_klines(self, symbol, interval='1h', limit=100):
        """Get candlestick data with improved accuracy"""
        try:
            params = {
                'symbol': symbol,
                'interval': interval,
                'limit': limit
            }
            response = requests.get(f"{self.base_url}/api/v3/klines", params=params, timeout=10)
            
            if response.status_code == 200:
                klines = response.json()
                formatted_klines = []
                
                for kline in klines:
                    formatted_klines.append({
                        'timestamp': kline[0],
                        'open': float(kline[1]),
                        'high': float(kline[2]),
                        'low': float(kline[3]),
                        'close': float(kline[4]),
                        'volume': float(kline[5]),
                        'close_time': kline[6],
                        'quote_volume': float(kline[7]),
                        'trades': int(kline[8]),
                        'taker_buy_base': float(kline[9]),
                        'taker_buy_quote': float(kline[10])
                    })
                
                return formatted_klines
            else:
                logger.error(f"Klines fetch failed: {response.status_code}")
                return {"error": f"Failed to fetch klines: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Klines fetch error: {e}")
            return {"error": str(e)}
    
    def get_order_book(self, symbol, limit=20):
        """Get order book with improved accuracy"""
        try:
            params = {'symbol': symbol, 'limit': limit}
            response = requests.get(f"{self.base_url}/api/v3/depth", params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'lastUpdateId': data['lastUpdateId'],
                    'bids': [[float(price), float(qty)] for price, qty in data['bids']],
                    'asks': [[float(price), float(qty)] for price, qty in data['asks']]
                }
            else:
                logger.error(f"Order book fetch failed: {response.status_code}")
                return {"error": f"Failed to fetch order book: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Order book fetch error: {e}")
            return {"error": str(e)}

# Global API instance
binance_api = None

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'testnet': binance_api.testnet if binance_api else None
    })

@app.route('/api/connect', methods=['POST'])
def connect():
    """Connect to Binance API"""
    global binance_api
    
    try:
        data = request.get_json()
        api_key = data.get('api_key')
        api_secret = data.get('api_secret')
        testnet = data.get('testnet', False)
        
        if not api_key or not api_secret:
            return jsonify({'error': 'API key and secret are required'}), 400
        
        # Create new API instance
        binance_api = BinanceAPI(api_key, api_secret, testnet)
        
        # Test connection
        if binance_api.ping():
            logger.info(f"Successfully connected to {'Testnet' if testnet else 'Live'} Binance")
            return jsonify({
                'success': True,
                'message': f"Connected to {'Testnet' if testnet else 'Live'} Binance",
                'testnet': testnet,
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': 'Failed to connect to Binance API'}), 400
            
    except Exception as e:
        logger.error(f"Connection error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current connection status"""
    if not binance_api:
        return jsonify({'connected': False, 'message': 'Not connected'})
    
    try:
        if binance_api.ping():
            return jsonify({
                'connected': True,
                'testnet': binance_api.testnet,
                'message': f"Connected to {'Testnet' if binance_api.testnet else 'Live'} Binance"
            })
        else:
            return jsonify({'connected': False, 'message': 'Connection lost'})
    except Exception as e:
        return jsonify({'connected': False, 'message': str(e)})

@app.route('/api/balances', methods=['GET'])
def get_balances():
    """Get account balances"""
    if not binance_api:
        return jsonify({'error': 'Not connected'}), 401
    
    try:
        balances = binance_api.get_balances()
        return jsonify(balances)
    except Exception as e:
        logger.error(f"Balances error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Get open orders"""
    if not binance_api:
        return jsonify({'error': 'Not connected'}), 401
    
    try:
        symbol = request.args.get('symbol')
        orders = binance_api.get_open_orders(symbol)
        return jsonify(orders)
    except Exception as e:
        logger.error(f"Orders error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
def place_order():
    """Place a new order"""
    if not binance_api:
        return jsonify({'error': 'Not connected'}), 401
    
    try:
        data = request.get_json()
        result = binance_api.place_order(
            symbol=data.get('symbol'),
            side=data.get('side'),
            order_type=data.get('order_type'),
            quantity=data.get('quantity'),
            price=data.get('price'),
            time_in_force=data.get('time_in_force', 'GTC')
        )
        
        if 'error' in result:
            return jsonify(result), 400
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Order placement error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/<symbol>/<order_id>', methods=['DELETE'])
def cancel_order_route(symbol, order_id):
    """Cancel an order"""
    if not binance_api:
        return jsonify({'error': 'Not connected'}), 401
    
    try:
        result = binance_api.cancel_order(symbol, order_id)
        if 'error' in result:
            return jsonify(result), 400
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Order cancellation error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/trades/<symbol>', methods=['GET'])
def get_trades_route(symbol):
    """Get recent trades"""
    if not binance_api:
        return jsonify({'error': 'Not connected'}), 401
    
    try:
        limit = request.args.get('limit', 50, type=int)
        trades = binance_api.get_trades(symbol, limit)
        return jsonify(trades)
    except Exception as e:
        logger.error(f"Trades error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/klines/<symbol>', methods=['GET'])
def get_klines_route(symbol):
    """Get candlestick data"""
    try:
        interval = request.args.get('interval', '1h')
        limit = request.args.get('limit', 100, type=int)
        
        if binance_api:
            klines = binance_api.get_klines(symbol, interval, limit)
        else:
            # Fallback to public endpoint for unauthenticated users
            temp_api = BinanceAPI(testnet=False)
            klines = temp_api.get_klines(symbol, interval, limit)
        
        return jsonify(klines)
    except Exception as e:
        logger.error(f"Klines error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orderbook/<symbol>', methods=['GET'])
def get_orderbook_route(symbol):
    """Get order book"""
    try:
        limit = request.args.get('limit', 20, type=int)
        
        if binance_api:
            orderbook = binance_api.get_order_book(symbol, limit)
        else:
            # Fallback to public endpoint
            temp_api = BinanceAPI(testnet=False)
            orderbook = temp_api.get_order_book(symbol, limit)
        
        return jsonify(orderbook)
    except Exception as e:
        logger.error(f"Order book error: {e}")
        return jsonify({'error': str(e)}), 500

# Socket.IO events
@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to ApexTrader'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('subscribe_price')
def handle_price_subscription(data):
    """Handle real-time price subscription"""
    symbol = data.get('symbol')
    if symbol:
        logger.info(f"Client {request.sid} subscribed to {symbol} price updates")

if __name__ == '__main__':
    logger.info("Starting ApexTrader Backend...")
    logger.info("Environment: Production Ready")
    logger.info("Features: Enhanced Accuracy, Real-time Data, Secure Trading")
    
    # Start the application
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)



