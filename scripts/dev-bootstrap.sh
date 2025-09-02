#!/bin/bash

# Fair Scanner - Development Bootstrap Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Fair Scanner development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "📱 Installing Expo CLI globally..."
    npm install -g @expo/cli
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env with your actual configuration values"
fi

# Prebuild the project
echo "🔨 Prebuilding project..."
npx expo prebuild

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your Supabase credentials"
echo "2. Run: npx expo run:android"
echo "3. Configure DataWedge on your Zebra MC2200"
echo ""
echo "For DataWedge setup, see: android-notes/DataWedge-Profile.md"
echo ""
echo "Happy coding! 🎉"
