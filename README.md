# 🎵 Audio Processor Pro

A professional web-based audio processing application with AI-powered vocal separation, pitch shifting, BPM control, and more.

## ✨ Features

### Essential Features
- ✅ **Visual Waveform Display** - See your audio in real-time
- ✅ **Drag & Drop Upload** - Simply drag files onto the page
- ✅ **Progress Bars** - Real-time feedback for all operations
- ✅ **Preview Before Processing** - Play and check before editing
- ✅ **Undo/Reset** - Start over anytime
- ✅ **Audio Trimming** - Cut start and end precisely
- ✅ **Format Converter** - Export as MP3, WAV, FLAC, or OGG
- ✅ **BPM Detection & Change** - Perfect for DJs and music producers

### Core Features
- 🎤 **Vocal Separation** - AI-powered separation of vocals and instrumentals
- 🎚️ **Pitch Shifting** - Change pitch without affecting speed (-12 to +12 semitones)
- ⚡ **Speed Control** - Adjust playback speed (0.5x to 2x)
- 🎹 **Key Detection** - Automatically detect musical key
- 🎸 **Live Preview** - Hear changes in real-time

## 🚀 Quick Start

### Installation

1. **Install Dependencies**
   ```bash
   pip3 install -r requirements.txt
   brew install ffmpeg
   ```

2. **Run the Application**
   ```bash
   ./START.sh
   ```
   Or manually:
   ```bash
   python3 app.py
   ```

3. **Open Browser**
   Navigate to: http://localhost:5555

## 📖 Usage Guide

### 1. Upload Audio
- **Drag & drop** your audio file onto the upload zone
- Or click "Choose File" to browse
- Supports: MP3, WAV, FLAC, M4A, OGG

### 2. View Audio Info
- See waveform visualization
- Check Key, BPM, and Duration
- Preview the audio

### 3. Choose Processing Mode
- **Edit Pitch & Speed** - Quick pitch/speed adjustments
- **Separate Vocals** - Split into vocals and instrumental tracks

### 4. Make Adjustments

**Pitch Shifting:**
- Use slider (-12 to +12 semitones)
- Or click key buttons (C, D, E, etc.) for precise shifts

**Speed Control:**
- Adjust playback speed (0.5x to 2x)
- Live preview in browser

**BPM Control:**
- See current BPM
- Enter target BPM and click "Change BPM"
- Maintains pitch while changing tempo

**Trimming:**
- Enter start and end times
- Click "Trim" to cut audio

### 5. Download
- Choose format (MP3, WAV, FLAC, OGG)
- Click "Download Processed Track"
- All effects are applied to the final file

## 🎨 UI Features

- **Modern Gradient Design** - Professional and aesthetic
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Real-time Feedback** - Progress bars and loading indicators
- **Smooth Animations** - Polished user experience
- **Glass-morphism Effects** - Modern UI design trends

## 🛠️ Technical Stack

**Backend:**
- Flask (Python web framework)
- Librosa (Audio analysis)
- Demucs (AI vocal separation)
- PyDub (Audio manipulation)
- SoundFile (Audio I/O)

**Frontend:**
- Vanilla JavaScript (No frameworks)
- HTML5 Canvas (Waveform visualization)
- HTML5 Audio (Playback)
- CSS3 (Animations and gradients)

## 📊 API Endpoints

- `POST /upload` - Upload audio file
- `POST /get-audio-info` - Get BPM, key, waveform
- `POST /detect-key` - Detect musical key
- `POST /separate` - Separate vocals
- `POST /pitch-shift` - Apply pitch shift
- `POST /trim` - Trim audio
- `POST /change-bpm` - Change BPM
- `GET /audio/<session>/<file>` - Stream audio
- `GET /download/<session>/<track>/<pitch>/<speed>/<format>` - Download

## 🎯 Use Cases

- **Musicians** - Change key, separate tracks, practice
- **DJs** - BPM matching, pitch adjustment, remixing
- **Podcasters** - Trim audio, adjust speed
- **Content Creators** - Format conversion, audio editing
- **Karaoke** - Remove vocals, change pitch to suit your voice
- **Music Students** - Practice with different tempos and keys

## 📁 Project Structure

```
audio-processor/
├── app.py              # Flask backend
├── requirements.txt    # Python dependencies
├── START.sh           # Startup script
├── templates/
│   └── index.html     # Main UI
├── static/
│   └── app.js         # Frontend JavaScript
├── uploads/           # Temporary uploads
└── processed/         # Processed files
```

## 🔧 Configuration

Edit `app.py` to change:
- Port (default: 5555)
- Max file size (default: 100MB)
- Processing quality
- Temporary file locations

## ⚠️ Notes

- First run downloads AI models (~80MB)
- Processing time depends on file length
- Vocal separation takes 1-3 minutes
- Pitch shifting is instant (cached)
- Speed changes are instant (browser-based)

## 🐛 Troubleshooting

**"ffmpeg not found"**
```bash
brew install ffmpeg
```

**"Port 5555 in use"**
```bash
lsof -ti:5555 | xargs kill -9
```

**Module not found**
```bash
pip3 install -r requirements.txt
```

## 📄 License

MIT License - Feel free to use and modify

## 🤝 Contributing

Contributions welcome! Open an issue or pull request.

---

**Made with ❤️ for audio enthusiasts**
