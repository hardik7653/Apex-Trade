from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import requests
import hmac
import hashlib
import time
import logging
import os
import json
import threading
from datetime import datetime, timedelta
from dotenv import load_dotenv
import numpy as np
import pandas as pd

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global trading bot instance
trading_bot = None
bot_status = {
    'running': False,
    'symbols': [],
    'last_signal': None,
    'total_trades': 0,
    'win_rate': 0.0
}

class BinanceAPIManager:
    def __init__(self, api_key=None, api_secret=None, testnet=False):
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        self.base_url = "https://testnet.binance.vision" if testnet else "https://api.binance.com"
        self.connected = False
        
    def _generate_signature(self, params):
        """Generate HMAC SHA256 signature for signed requests"""
        if not self.api_secret:
            return ""
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        return hmac.new(self.api_secret.encode('utf-8'), query_string.encode('utf-8'), hashlib.sha256).hexdigest()
    
    def test_connection(self):
        """Test API connection"""
        try:
            response = requests.get(f"{self.base_url}/api/v3/ping", timeout=10)
            self.connected = response.status_code == 200
            return self.connected
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            self.connected = False
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
    
    def get_klines(self, symbol, interval='1h', limit=100):
        """Get candlestick data with real-time validation"""
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
                    # Validate data before processing
                    open_price = float(kline[1]) if kline[1] and kline[1] != '0' else None
                    high_price = float(kline[2]) if kline[2] and kline[2] != '0' else None
                    low_price = float(kline[3]) if kline[3] and kline[3] != '0' else None
                    close_price = float(kline[4]) if kline[4] and kline[4] != '0' else None
                    volume = float(kline[5]) if kline[5] and kline[5] != '0' else None
                    
                    # Only add valid data
                    if all(v is not None and v > 0 for v in [open_price, high_price, low_price, close_price, volume]):
                        formatted_klines.append({
                            'timestamp': kline[0],
                            'open': open_price,
                            'high': high_price,
                            'low': low_price,
                            'close': close_price,
                            'volume': volume,
                            'close_time': kline[6],
                            'quote_volume': float(kline[7]) if kline[7] and kline[7] != '0' else 0,
                            'trades': int(kline[8]) if kline[8] and kline[8] != '0' else 0,
                            'taker_buy_base': float(kline[9]) if kline[9] and kline[9] != '0' else 0,
                            'taker_buy_quote': float(kline[10]) if kline[10] and kline[10] != '0' else 0
                        })
                
                return formatted_klines
            else:
                logger.error(f"Klines fetch failed: {response.status_code}")
                return {"error": f"Failed to fetch klines: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Klines fetch error: {e}")
            return {"error": str(e)}
    
    def get_order_book(self, symbol, limit=20):
        """Get order book with validation"""
        try:
            params = {'symbol': symbol, 'limit': limit}
            response = requests.get(f"{self.base_url}/api/v3/depth", params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate and clean data
                bids = []
                asks = []
                
                for price, qty in data.get('bids', []):
                    if price and qty and price != '0' and qty != '0':
                        bids.append([float(price), float(qty)])
                
                for price, qty in data.get('asks', []):
                    if price and qty and price != '0' and qty != '0':
                        asks.append([float(price), float(qty)])
                
                return {
                    'lastUpdateId': data.get('lastUpdateId', 0),
                    'bids': bids,
                    'asks': asks
                }
            else:
                logger.error(f"Order book fetch failed: {response.status_code}")
                return {"error": f"Failed to fetch order book: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Order book fetch error: {e}")
            return {"error": str(e)}
    
    def get_ticker_price(self, symbol):
        """Get current price with validation"""
        try:
            response = requests.get(f"{self.base_url}/api/v3/ticker/price", params={'symbol': symbol}, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                price = float(data.get('price', 0))
                
                # Validate price
                if price > 0:
                    return {'symbol': symbol, 'price': price}
                else:
                    return {"error": "Invalid price data"}
            else:
                return {"error": f"Failed to fetch price: {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Price fetch error: {e}")
            return {"error": str(e)}

# Global API instance
api_manager = None

class NotificationManager:
    def __init__(self):
        self.telegram_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.telegram_chat_id = os.getenv('TELEGRAM_CHAT_ID')
        self.email_smtp = os.getenv('EMAIL_SMTP')
        self.email_user = os.getenv('EMAIL_USER')
        self.email_password = os.getenv('EMAIL_PASSWORD')
        self.email_to = os.getenv('EMAIL_TO')
    
    def send_telegram(self, message):
        """Send Telegram notification"""
        if not self.telegram_token or not self.telegram_chat_id:
            return False
        
        try:
            url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
            data = {
                'chat_id': self.telegram_chat_id,
                'text': message,
                'parse_mode': 'HTML'
            }
            response = requests.post(url, data=data, timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Telegram notification failed: {e}")
            return False
    
    def send_email(self, subject, message):
        """Send email notification"""
        if not all([self.email_smtp, self.email_user, self.email_password, self.email_to]):
            return False
        
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart()
            msg['From'] = self.email_user
            msg['To'] = self.email_to
            msg['Subject'] = subject
            
            msg.attach(MIMEText(message, 'html'))
            
            server = smtplib.SMTP(self.email_smtp, 587)
            server.starttls()
            server.login(self.email_user, self.email_password)
            text = msg.as_string()
            server.sendmail(self.email_user, self.email_to, text)
            server.quit()
            
            return True
        except Exception as e:
            logger.error(f"Email notification failed: {e}")
            return False

# Initialize notification manager
notification_manager = NotificationManager()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Enhanced health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'bot_running': bot_status['running'],
        'api_connected': api_manager.connected if api_manager else False,
        'testnet': api_manager.testnet if api_manager else None
    })

@app.route('/api/connect', methods=['POST'])
def connect():
    """Connect to Binance API with validation"""
    global api_manager
    
    try:
        data = request.get_json()
        api_key = data.get('api_key')
        api_secret = data.get('api_secret')
        testnet = data.get('testnet', True)
        
        if not api_key or not api_secret:
            return jsonify({'error': 'API key and secret are required'}), 400
        
        # Create new API instance
        api_manager = BinanceAPIManager(api_key, api_secret, testnet)
        
        # Test connection
        if api_manager.test_connection():
            logger.info(f"Successfully connected to {'Testnet' if testnet else 'Live'} Binance")
            
            # Send notification
            notification_manager.send_telegram(f"🔗 <b>Binance Connected</b>\nMode: {'Testnet' if testnet else 'Live'}\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
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
    """Get current connection and bot status"""
    if not api_manager:
        return jsonify({'connected': False, 'message': 'Not connected'})
    
    try:
        if api_manager.test_connection():
            return jsonify({
                'connected': True,
                'testnet': api_manager.testnet,
                'message': f"Connected to {'Testnet' if api_manager.testnet else 'Live'} Binance",
                'bot_status': bot_status
            })
        else:
            return jsonify({'connected': False, 'message': 'Connection lost'})
    except Exception as e:
        return jsonify({'connected': False, 'message': str(e)})

@app.route('/api/klines/<symbol>', methods=['GET'])
def get_klines_route(symbol):
    """Get candlestick data with real-time validation"""
    try:
        interval = request.args.get('interval', '1h')
        limit = request.args.get('limit', 100, type=int)
        
        if api_manager:
            klines = api_manager.get_klines(symbol, interval, limit)
        else:
            return jsonify({'error': 'Not connected'}), 401
        
        # Validate data before sending
        if isinstance(klines, list) and klines:
            # Ensure no NaN values
            for kline in klines:
                for key, value in kline.items():
                    if isinstance(value, (int, float)) and (np.isnan(value) or np.isinf(value)):
                        kline[key] = 0.0
        
        return jsonify(klines)
    except Exception as e:
        logger.error(f"Klines error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orderbook/<symbol>', methods=['GET'])
def get_orderbook_route(symbol):
    """Get order book with validation"""
    try:
        limit = request.args.get('limit', 20, type=int)
        
        if api_manager:
            orderbook = api_manager.get_order_book(symbol, limit)
        else:
            return jsonify({'error': 'Not connected'}), 401
        
        return jsonify(orderbook)
    except Exception as e:
        logger.error(f"Order book error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/price/<symbol>', methods=['GET'])
def get_price_route(symbol):
    """Get current price with validation"""
    try:
        if api_manager:
            price_data = api_manager.get_ticker_price(symbol)
        else:
            return jsonify({'error': 'Not connected'}), 401
        
        return jsonify(price_data)
    except Exception as e:
        logger.error(f"Price error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/bot/start', methods=['POST'])
def start_bot():
    """Start the AI trading bot"""
    global trading_bot, bot_status
    
    try:
        data = request.get_json()
        symbols = data.get('symbols', ['BTCUSDT', 'ETHUSDT'])
        interval = data.get('interval', '1h')
        
        if not api_manager or not api_manager.connected:
            return jsonify({'error': 'Not connected to Binance API'}), 401
        
        # Initialize trading bot (import here to avoid circular imports)
        try:
            from trading_bot import AdvancedTradingBot
            trading_bot = AdvancedTradingBot(
                api_key=api_manager.api_key,
                api_secret=api_manager.api_secret,
                testnet=api_manager.testnet
            )
            
            # Start trading loop
            trading_bot.start_trading_loop(symbols, interval)
            
            bot_status['running'] = True
            bot_status['symbols'] = symbols
            
            # Send notification
            notification_manager.send_telegram(f"🤖 <b>Trading Bot Started</b>\nSymbols: {', '.join(symbols)}\nInterval: {interval}\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            return jsonify({
                'success': True,
                'message': 'Trading bot started successfully',
                'symbols': symbols,
                'interval': interval
            })
            
        except ImportError as e:
            logger.error(f"Failed to import trading bot: {e}")
            return jsonify({'error': 'Trading bot module not available'}), 500
        
    except Exception as e:
        logger.error(f"Error starting bot: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/bot/stop', methods=['POST'])
def stop_bot():
    """Stop the AI trading bot"""
    global trading_bot, bot_status
    
    try:
        if trading_bot:
            trading_bot.stop_trading()
            bot_status['running'] = False
            
            # Send notification
            notification_manager.send_telegram(f"🛑 <b>Trading Bot Stopped</b>\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            return jsonify({
                'success': True,
                'message': 'Trading bot stopped successfully'
            })
        else:
            return jsonify({'error': 'No bot running'}), 400
        
    except Exception as e:
        logger.error(f"Error stopping bot: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/bot/status', methods=['GET'])
def get_bot_status():
    """Get current bot status"""
    global trading_bot, bot_status
    
    try:
        if trading_bot:
            status = trading_bot.get_current_status()
            bot_status.update(status)
        else:
            status = bot_status
        
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Error getting bot status: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/bot/signals', methods=['GET'])
def get_bot_signals():
    """Get current trading signals"""
    global trading_bot
    
    try:
        if trading_bot:
            signals = trading_bot.signals
        else:
            signals = {}
        
        return jsonify(signals)
        
    except Exception as e:
        logger.error(f"Error getting signals: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/bot/performance', methods=['GET'])
def get_bot_performance():
    """Get bot performance metrics"""
    global trading_bot
    
    try:
        if trading_bot:
            performance = trading_bot.get_performance_metrics()
        else:
            performance = {"message": "No bot running"}
        
        return jsonify(performance)
        
    except Exception as e:
        logger.error(f"Error getting performance: {e}")
        return jsonify({'error': str(e)}), 500

# Socket.IO events for real-time updates
@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to ApexTrader AI Bot'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('subscribe_market_data')
def handle_market_data_subscription(data):
    """Handle real-time market data subscription"""
    symbol = data.get('symbol')
    if symbol:
        logger.info(f"Client {request.sid} subscribed to {symbol} market data")
        
        # Start sending real-time updates
        def send_updates():
            while True:
                try:
                    if api_manager and api_manager.connected:
                        # Get latest data
                        price_data = api_manager.get_ticker_price(symbol)
                        orderbook = api_manager.get_order_book(symbol, limit=10)
                        
                        if 'error' not in price_data and 'error' not in orderbook:
                            emit('market_data_update', {
                                'symbol': symbol,
                                'price': price_data,
                                'orderbook': orderbook,
                                'timestamp': datetime.now().isoformat()
                            })
                    
                    time.sleep(5)  # Update every 5 seconds
                    
                except Exception as e:
                    logger.error(f"Error in market data updates: {e}")
                    time.sleep(10)
        
        # Start update thread
        update_thread = threading.Thread(target=send_updates)
        update_thread.daemon = True
        update_thread.start()

if __name__ == '__main__':
    logger.info("Starting ApexTrader AI Trading Bot...")
    logger.info("Environment: Production Ready")
    logger.info("Features: AI Trading, Real-time Data, Notifications")
    
    # Start the application
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)

