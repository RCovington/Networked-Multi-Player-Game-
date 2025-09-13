#!/bin/bash

# Production startup script for Multiplayer Game Server
# This script starts the server in production mode and runs it in the background

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project directory
cd "$SCRIPT_DIR"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if Server.js exists
if [ ! -f "Server.js" ]; then
    echo "Error: Server.js not found in project directory"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install npm dependencies"
        exit 1
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Define log files
LOG_FILE="logs/server.log"
PID_FILE="logs/server.pid"

# Function to check if server is already running
check_server_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Server is already running with PID $PID"
            return 0
        else
            echo "Removing stale PID file"
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

# Function to start the server
start_server() {
    echo "Starting multiplayer game server in production mode..."
    
    # Start the server in background and redirect output to log file
    nohup node Server.js > "$LOG_FILE" 2>&1 &
    
    # Save the process ID
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"
    
    # Wait a moment to check if the server started successfully
    sleep 2
    
    if ps -p "$SERVER_PID" > /dev/null 2>&1; then
        echo "Server started successfully with PID $SERVER_PID"
        echo "Server is running in production mode"
        echo "Log file: $LOG_FILE"
        echo ""
        echo "To stop the server, run: kill $SERVER_PID"
        echo "Or use: ./stop-production.sh"
        echo ""
        echo "To view logs, run: tail -f $LOG_FILE"
    else
        echo "Error: Server failed to start"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# Main execution
if check_server_running; then
    exit 0
else
    start_server
fi
