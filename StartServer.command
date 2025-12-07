#!/bin/bash

# Job Seeker AI Assistant - Server Launcher
# Double-click this file to start the server

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "========================================="
echo "  Job Seeker AI Assistant"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js to continue:"
    echo "1. A download page will open in your browser"
    echo "2. Download and install Node.js LTS version"
    echo "3. Restart your computer"
    echo "4. Try running this script again"
    echo ""

    # Open Node.js download page
    open "https://nodejs.org/en/download/"

    echo "Press any key to exit..."
    read -n 1 -s
    exit 1
fi

# Display Node.js version
NODE_VERSION=$(node -v)
echo "✓ Node.js detected: $NODE_VERSION"
echo ""

# Check for credentials file
if [ ! -f "setup/credentials.env" ]; then
    echo "❌ Credentials file not found!"
    echo ""
    echo "Please follow these steps:"
    echo "1. Find the 'credentials.env' file from your team lead"
    echo "2. Copy it to the 'setup' folder in this directory"
    echo "3. Try running this script again"
    echo ""
    echo "Expected location: setup/credentials.env"
    echo ""
    echo "Press any key to exit..."
    read -n 1 -s
    exit 1
fi

echo "✓ Credentials file found"
echo ""

# Check if node_modules exists and if package.json is newer
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "📦 Installing dependencies..."
    echo "   (This may take a few minutes on first run)"
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Failed to install dependencies"
        echo "   Please check your internet connection and try again"
        echo ""
        echo "Press any key to exit..."
        read -n 1 -s
        exit 1
    fi
    echo ""
    echo "✓ Dependencies installed successfully"
    echo ""
else
    echo "✓ Dependencies already installed"
    echo ""
fi

# Load environment variables from credentials file
echo "🔑 Loading credentials..."
export $(cat setup/credentials.env | grep -v '^#' | xargs)
echo "✓ Credentials loaded"
echo ""

# Start the server
echo "========================================="
echo "🚀 Starting server..."
echo "========================================="
echo ""
echo "Server will be available at:"
echo "  http://localhost:3000"
echo ""
echo "To stop the server:"
echo "  Press Ctrl+C in this window"
echo ""
echo "========================================="
echo ""

# Run the server
npm start

# This will only execute if the server stops
echo ""
echo "Server stopped."
echo ""
echo "Press any key to exit..."
read -n 1 -s
