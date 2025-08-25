from flask import Flask, request, jsonify, session
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
import secrets
from functools import wraps

# Import our custom modules
from secure_binance_api import SecureBinanceAPI
from advanced_ml_bot import AdvancedMLTradingBot

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', secrets.token_hex(32))
CORS(app, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/trading_app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

# Global variables
trading_bot = None
bot_status = {
    'running': False,
    'symbols': [],
    'last_signal': None,
    'total_trades': 0,
    'win_rate': 0.0,
    'total_pnl': 0.0,
    'current_balance': 0.0
}

# Session storage for API keys (in-memory, not persistent)
api_sessions = {}

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = request.cookies.get('session_id')
        if not session_id or session_id not in api_sessions:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# API Routes
@app.route('/', methods=['GET'])
def root():
    """Root endpoint for basic readiness check"""
    return jsonify({
        'app': 'ApexTrader AI Bot',
        'status': 'ok',
        'docs': '/api/health'
    })

@app.route('/api/login', methods=['POST'])
def login():
    """Login with API credentials"""
    try:
        data = request.get_json()
        api_key = data.get('api_key', '').strip()
        api_secret = data.get('api_secret', '').strip()
        testnet = data.get('testnet', True)
        
        if not api_key or not api_secret:
            return jsonify({'error': 'API key and secret are required'}), 400
        
        # Create API instance and verify credentials
        api = SecureBinanceAPI(api_key, api_secret, testnet)
        verify_result = api.verify_api_keys()
        
        if "error" in verify_result:
            return jsonify(verify_result), 401
        
        # Generate session ID
        session_id = secrets.token_hex(32)
        api_sessions[session_id] = {
            'api_key': api_key,
            'api_secret': api_secret,
            'testnet': testnet,
            'created_at': datetime.now()
        }
        
        response = jsonify({
            'success': True,
            'message': 'Login successful',
            'testnet': testnet,
            'account': verify_result['account']
        })
        response.set_cookie('session_id', session_id, httponly=True, secure=False, samesite='Lax')
        
        return response
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500

# Backward-compatibility shim for older clients/tests
@app.route('/api/connect', methods=['POST'])
def connect():
    """Legacy endpoint placeholder to indicate backend is reachable.
    Accepts optional {"testnet": bool} and responds 200 for compatibility.
    """
    try:
        data = request.get_json(silent=True) or {}
        testnet = bool(data.get('testnet', True))
        return jsonify({'success': True, 'testnet': testnet}), 200
    except Exception as e:
        logger.error(f"Connect shim error: {e}")
        return jsonify({'error': 'Connect failed'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout and clear session"""
    try:
        session_id = request.cookies.get('session_id')
        if session_id in api_sessions:
            del api_sessions[session_id]
        
        response = jsonify({'success': True, 'message': 'Logged out successfully'})
        response.delete_cookie('session_id')
        return response
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'error': 'Logout failed'}), 500

@app.route('/api/account', methods=['GET'])
@require_auth
def get_account():
    """Get account information"""
    try:
        session_id = request.cookies.get('session_id')
        session_data = api_sessions.get(session_id)
        
        if not session_data:
            return jsonify({'error': 'Session not found'}), 401
        
        api = SecureBinanceAPI(
            session_data['api_key'],
            session_data['api_secret'],
            session_data['testnet']
        )
        
        account_info = api.get_account_info()
        return jsonify(account_info)
        
    except Exception as e:
        logger.error(f"Account info error: {e}")
        return jsonify({'error': 'Failed to get account info'}), 500

@app.route('/api/market-data/<symbol>', methods=['GET'])
@require_auth
def get_market_data(symbol):
    """Get market data for symbol"""
    try:
        session_id = request.cookies.get('session_id')
        session_data = api_sessions.get(session_id)
        
        if not session_data:
            return jsonify({'error': 'Session not found'}), 401
        
        api = SecureBinanceAPI(
            session_data['api_key'],
            session_data['api_secret'],
            session_data['testnet']
        )
        
        interval = request.args.get('interval', '1h')
        limit = int(request.args.get('limit', 100))
        
        result = api.get_klines(symbol, interval, limit)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Market data error: {e}")
        return jsonify({'error': 'Failed to get market data'}), 500

# Backward-compatibility shim: /api/klines/<symbol>/<interval>/<limit>
@app.route('/api/klines/<symbol>/<interval>/<int:limit>', methods=['GET'])
def get_klines_legacy(symbol, interval, limit):
    """Public klines provider for legacy tests without requiring login/session."""
    try:
        # Use Binance public REST for klines to avoid requiring API keys
        base_url = 'https://api.binance.com/api/v3/klines'
        params = {
            'symbol': symbol.upper(),
            'interval': interval,
            'limit': min(int(limit), 1000)
        }
        resp = requests.get(base_url, params=params, timeout=10)
        if resp.status_code != 200:
            return jsonify({'error': 'Failed to fetch klines', 'status': resp.status_code}), 502
        data = resp.json()
        return jsonify({'data': data, 'symbol': symbol.upper(), 'interval': interval})
    except Exception as e:
        logger.error(f"Legacy klines error: {e}")
        return jsonify({'error': 'Failed to get klines'}), 500

@app.route('/api/train-models', methods=['POST'])
@require_auth
def train_models():
    """Train ML models for symbols"""
    try:
        session_id = request.cookies.get('session_id')
        session_data = api_sessions.get(session_id)
        
        if not session_data:
            return jsonify({'error': 'Session not found'}), 401
        
        data = request.get_json()
        symbols = data.get('symbols', [])
        
        if not symbols:
            return jsonify({'error': 'Symbols are required'}), 400
        
        # Create trading bot instance
        global trading_bot
        trading_bot = AdvancedMLTradingBot(
            session_data['api_key'],
            session_data['api_secret'],
            session_data['testnet']
        )
        
        results = {}
        for symbol in symbols:
            result = trading_bot.train_models(symbol)
            results[symbol] = result
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Train models error: {e}")
        return jsonify({'error': 'Failed to train models'}), 500

@app.route('/api/start-trading', methods=['POST'])
@require_auth
def start_trading():
    """Start automated trading"""
    try:
        session_id = request.cookies.get('session_id')
        session_data = api_sessions.get(session_id)
        
        if not session_data:
            return jsonify({'error': 'Session not found'}), 401
        
        data = request.get_json()
        symbols = data.get('symbols', [])
        
        if not symbols:
            return jsonify({'error': 'Symbols are required'}), 400
        
        # Create trading bot if not exists
        global trading_bot
        if not trading_bot:
            trading_bot = AdvancedMLTradingBot(
                session_data['api_key'],
                session_data['api_secret'],
                session_data['testnet']
            )
        
        result = trading_bot.start_trading(symbols)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Start trading error: {e}")
        return jsonify({'error': 'Failed to start trading'}), 500

@app.route('/api/stop-trading', methods=['POST'])
@require_auth
def stop_trading():
    """Stop automated trading"""
    try:
        global trading_bot
        if not trading_bot:
            return jsonify({'error': 'No trading bot running'}), 400
        
        result = trading_bot.stop_trading()
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Stop trading error: {e}")
        return jsonify({'error': 'Failed to stop trading'}), 500

@app.route('/api/bot-status', methods=['GET'])
@require_auth
def get_bot_status():
    """Get trading bot status"""
    try:
        global bot_status, trading_bot
        
        if trading_bot:
            # Update status from trading bot
            bot_status.update({
                'running': trading_bot.running,
                'symbols': trading_bot.symbols,
                'last_signal': trading_bot.signals[-1] if trading_bot.signals else None,
                'total_trades': len(trading_bot.trades),
                'win_rate': trading_bot._calculate_win_rate(),
                'total_pnl': trading_bot._calculate_total_pnl()
            })
        
        return jsonify(bot_status)
        
    except Exception as e:
        logger.error(f"Bot status error: {e}")
        return jsonify({'error': 'Failed to get bot status'}), 500

@app.route('/api/signals', methods=['GET'])
@require_auth
def get_signals():
    """Get recent signals"""
    try:
        global trading_bot
        if not trading_bot:
            return jsonify({'signals': []})
        
        return jsonify({
            'signals': trading_bot.signals[-50:]  # Last 50 signals
        })
        
    except Exception as e:
        logger.error(f"Signals error: {e}")
        return jsonify({'error': 'Failed to get signals'}), 500

@app.route('/api/trades', methods=['GET'])
@require_auth
def get_trades():
    """Get trade history"""
    try:
        global trading_bot
        if not trading_bot:
            return jsonify({'trades': []})
        
        return jsonify({
            'trades': trading_bot.trades
        })
        
    except Exception as e:
        logger.error(f"Trades error: {e}")
        return jsonify({'error': 'Failed to get trades'}), 500

@app.route('/api/performance', methods=['GET'])
@require_auth
def get_performance():
    """Get performance metrics"""
    try:
        global trading_bot
        if not trading_bot:
            return jsonify({'error': 'No trading bot running'}), 400
        
        metrics = trading_bot.get_performance_metrics()
        return jsonify(metrics)
        
    except Exception as e:
        logger.error(f"Performance error: {e}")
        return jsonify({'error': 'Failed to get performance metrics'}), 500

@app.route('/api/place-order', methods=['POST'])
@require_auth
def place_order():
    """Place manual order"""
    try:
        session_id = request.cookies.get('session_id')
        session_data = api_sessions.get(session_id)
        
        if not session_data:
            return jsonify({'error': 'Session not found'}), 401
        
        data = request.get_json()
        symbol = data.get('symbol')
        side = data.get('side')
        quantity = data.get('quantity')
        order_type = data.get('order_type', 'MARKET')
        price = data.get('price')
        
        if not all([symbol, side, quantity]):
            return jsonify({'error': 'Symbol, side, and quantity are required'}), 400
        
        api = SecureBinanceAPI(
            session_data['api_key'],
            session_data['api_secret'],
            session_data['testnet']
        )
        
        result = api.place_order(symbol, side, quantity, order_type, price)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Place order error: {e}")
        return jsonify({'error': 'Failed to place order'}), 500

@app.route('/api/exchange-info', methods=['GET'])
@require_auth
def get_exchange_info():
    """Get exchange information"""
    try:
        session_id = request.cookies.get('session_id')
        session_data = api_sessions.get(session_id)
        
        if not session_data:
            return jsonify({'error': 'Session not found'}), 401
        
        api = SecureBinanceAPI(
            session_data['api_key'],
            session_data['api_secret'],
            session_data['testnet']
        )
        
        result = api.get_exchange_info()
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Exchange info error: {e}")
        return jsonify({'error': 'Failed to get exchange info'}), 500

@app.route('/api/ticker-price/<symbol>', methods=['GET'])
@require_auth
def get_ticker_price(symbol):
    """Get current ticker price"""
    try:
        session_id = request.cookies.get('session_id')
        session_data = api_sessions.get(session_id)
        
        if not session_data:
            return jsonify({'error': 'Session not found'}), 401
        
        api = SecureBinanceAPI(
            session_data['api_key'],
            session_data['api_secret'],
            session_data['testnet']
        )
        
        result = api.get_ticker_price(symbol)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Ticker price error: {e}")
        return jsonify({'error': 'Failed to get ticker price'}), 500

@app.route('/api/generate-signal/<symbol>', methods=['GET'])
@require_auth
def generate_signal(symbol):
    """Generate trading signal for symbol"""
    try:
        global trading_bot
        if not trading_bot:
            return jsonify({'error': 'Trading bot not initialized'}), 400
        
        result = trading_bot.generate_signal(symbol)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Generate signal error: {e}")
        return jsonify({'error': 'Failed to generate signal'}), 500

# WebSocket events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info('Client connected')
    emit('status', {'message': 'Connected to trading bot'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info('Client disconnected')

@socketio.on('subscribe_signals')
def handle_subscribe_signals(data):
    """Subscribe to signal updates"""
    logger.info(f'Client subscribed to signals: {data}')

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

if __name__ == '__main__':
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    
    # Start the application
    logger.info('Starting Trading Bot Application...')
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
