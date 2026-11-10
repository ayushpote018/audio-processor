# Audio Processor

A web application for separating vocals from instrumental tracks and adjusting pitch/key.

## Features

- Upload audio files (MP3, WAV, FLAC, M4A, OGG)
- Separate vocals and instrumental tracks using Demucs AI
- Automatic key detection for both tracks
- Real-time pitch shifting with live preview
- Quick key selection buttons (C, C#, D, etc.)
- Download processed tracks

## Installation

1. Install dependencies:
```bash
pip3 install flask flask-cors librosa soundfile demucs
brew install ffmpeg
```

2. Run the application:
```bash
python3 app.py
```

3. Open browser to: http://localhost:5000

## Usage

1. **Upload**: Click "Choose File" and select your audio file
2. **Separate**: Click "Separate Vocals & Instrumental" (takes 1-2 minutes)
3. **Detect Key**: App automatically detects the musical key of each track
4. **Adjust Pitch**: 
   - Use the slider to shift pitch by semitones (-12 to +12)
   - Or click key buttons (C, D, E, etc.) to shift to that key
   - Preview updates in real-time
5. **Download**: Click download button for either track with your adjustments

## Examples

- D# to D: Click the "D" button (shifts -1 semitone)
- C to E: Click the "E" button (shifts +4 semitones)
- Manual: Drag slider to any value

## Notes

- First processing takes longer (downloads AI model ~80MB)
- Processed files are stored in `processed/` folder
- Uploaded files are stored in `uploads/` folder
