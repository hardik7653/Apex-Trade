#!/bin/bash

echo "========================================"
echo "   ApexTrader Production Trading Bot"
echo "========================================"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

echo "Starting backend server..."
cd backend
python3 app_production.py &
BACKEND_PID=$!
cd ..

echo
echo "Starting frontend development server..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo
echo "========================================"
echo "   Application Starting..."
echo "========================================"
echo
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo
echo "Please wait for both servers to start..."
echo

# Wait a moment for servers to start
sleep 5

# Try to open browser (works on most systems)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
elif command -v sensible-browser &> /dev/null; then
    sensible-browser http://localhost:3000
else
    echo "Please open http://localhost:3000 in your browser"
fi

echo
echo "Application opened in your browser!"
echo
echo "To stop the servers, press Ctrl+C"
echo

# Function to cleanup on exit
cleanup() {
    echo
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Servers stopped."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait



