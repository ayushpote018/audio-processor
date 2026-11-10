#!/bin/bash

echo "🎵 Audio Processor Pro - Starting..."
echo ""
echo "Features:"
echo "✅ Visual Waveform Display"
echo "✅ Drag & Drop Upload"  
echo "✅ Progress Bars"
echo "✅ Preview Before Processing"
echo "✅ Audio Trimming"
echo "✅ BPM Detection & Change"
echo "✅ Format Converter (MP3/WAV/FLAC/OGG)"
echo "✅ Undo/Reset"
echo ""

cd "$(dirname "$0")"

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg not found. Installing..."
    brew install ffmpeg
fi

# Start the app
echo "🚀 Starting server on http://localhost:5555"
python3 app.py
