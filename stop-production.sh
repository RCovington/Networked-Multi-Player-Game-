#!/bin/bash

# Production stop script for Multiplayer Game Server
# This script stops the server running in production mode

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project directory
cd "$SCRIPT_DIR"

# Define PID file
PID_FILE="logs/server.pid"

# Function to stop the server
stop_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Stopping server with PID $PID..."
            kill "$PID"
            
            # Wait for the process to terminate
            for i in {1..10}; do
                if ! ps -p "$PID" > /dev/null 2>&1; then
                    echo "Server stopped successfully"
                    rm -f "$PID_FILE"
                    exit 0
                fi
                sleep 1
            done
            
            # If still running, force kill
            echo "Server didn't stop gracefully, forcing termination..."
            kill -9 "$PID"
            rm -f "$PID_FILE"
            echo "Server forcefully terminated"
        else
            echo "Server is not running (stale PID file found)"
            rm -f "$PID_FILE"
        fi
    else
        echo "Server is not running (no PID file found)"
    fi
}

# Main execution
stop_server
