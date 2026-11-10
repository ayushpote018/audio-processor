#!/usr/bin/env python3
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from pathlib import Path
import os
import subprocess
import librosa
import soundfile as sf
import numpy as np
from werkzeug.utils import secure_filename
import uuid
import shutil
import json

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = Path('uploads')
PROCESSED_FOLDER = Path('processed')
UPLOAD_FOLDER.mkdir(exist_ok=True)
PROCESSED_FOLDER.mkdir(exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

ALLOWED_EXTENSIONS = {'mp3', 'wav', 'flac', 'm4a', 'ogg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def detect_key(audio_path):
    y, sr = librosa.load(str(audio_path), duration=30)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    key_index = np.argmax(chroma_mean)
    keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    return keys[key_index]

def detect_bpm(audio_path):
    y, sr = librosa.load(str(audio_path), duration=30)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    return float(tempo)

def get_waveform_data(audio_path, samples=1000):
    y, sr = librosa.load(str(audio_path), sr=None, mono=True)
    # Downsample for visualization
    hop_length = max(1, len(y) // samples)
    y_downsampled = y[::hop_length][:samples]
    return y_downsampled.tolist(), float(librosa.get_duration(y=y, sr=sr))

def separate_vocals(input_path, output_dir):
    session_id = str(uuid.uuid4())
    session_dir = output_dir / session_id
    session_dir.mkdir(exist_ok=True)
    
    demucs_path = Path.home() / "Library" / "Python" / "3.9" / "bin" / "demucs"
    
    cmd = [
        str(demucs_path),
        "--two-stems=vocals",
        "--mp3",
        "--mp3-bitrate", "320",
        "-o", str(session_dir),
        str(input_path)
    ]
    
    env = os.environ.copy()
    env["PATH"] = f"/opt/homebrew/bin:{env.get('PATH', '')}"
    
    subprocess.run(cmd, check=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    base_name = Path(input_path).stem
    separated_folder = session_dir / "htdemucs" / base_name
    
    instrumental_path = session_dir / "instrumental.mp3"
    vocals_path = session_dir / "vocals.mp3"
    
    shutil.move(str(separated_folder / "no_vocals.mp3"), str(instrumental_path))
    shutil.move(str(separated_folder / "vocals.mp3"), str(vocals_path))
    
    shutil.rmtree(session_dir / "htdemucs")
    
    return session_id, instrumental_path, vocals_path

def pitch_shift_file(input_path, semitones, output_path, speed=1.0):
    y, sr = librosa.load(str(input_path), sr=None, mono=False)
    
    # Apply speed change (time stretching)
    if speed != 1.0:
        if y.ndim == 1:
            y = librosa.effects.time_stretch(y, rate=speed)
        else:
            y_stretched = []
            for channel in range(y.shape[0]):
                stretched = librosa.effects.time_stretch(y[channel], rate=speed)
                y_stretched.append(stretched)
            y = librosa.util.stack(y_stretched, axis=0)
    
    # Apply pitch shift
    if y.ndim == 1:
        y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=semitones)
    else:
        y_shifted = []
        for channel in range(y.shape[0]):
            shifted = librosa.effects.pitch_shift(y[channel], sr=sr, n_steps=semitones)
            y_shifted.append(shifted)
        y_shifted = librosa.util.stack(y_shifted, axis=0)
    
    temp_wav = Path(str(output_path).replace('.mp3', '_temp.wav'))
    sf.write(str(temp_wav), y_shifted.T, sr)
    
    env = os.environ.copy()
    env["PATH"] = f"/opt/homebrew/bin:{env.get('PATH', '')}"
    
    cmd = [
        "/opt/homebrew/bin/ffmpeg",
        "-i", str(temp_wav),
        "-codec:a", "libmp3lame",
        "-b:a", "320k",
        "-y",
        str(output_path)
    ]
    
    subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL, env=env)
    temp_wav.unlink()

def trim_audio(input_path, output_path, start_time, end_time):
    env = os.environ.copy()
    env["PATH"] = f"/opt/homebrew/bin:{env.get('PATH', '')}"
    
    cmd = [
        "/opt/homebrew/bin/ffmpeg",
        "-i", str(input_path),
        "-ss", str(start_time),
        "-to", str(end_time),
        "-codec:a", "libmp3lame",
        "-b:a", "320k",
        "-y",
        str(output_path)
    ]
    
    subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL, env=env)

def change_bpm(input_path, output_path, target_bpm):
    y, sr = librosa.load(str(input_path), sr=None, mono=False)
    
    # Detect current BPM
    if y.ndim == 1:
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    else:
        tempo, _ = librosa.beat.beat_track(y=y[0], sr=sr)
    
    # Calculate rate
    rate = target_bpm / tempo
    
    # Apply time stretch
    if y.ndim == 1:
        y_stretched = librosa.effects.time_stretch(y, rate=rate)
    else:
        y_stretched = []
        for channel in range(y.shape[0]):
            stretched = librosa.effects.time_stretch(y[channel], rate=rate)
            y_stretched.append(stretched)
        y_stretched = librosa.util.stack(y_stretched, axis=0)
    
    temp_wav = Path(str(output_path).replace('.mp3', '_temp.wav'))
    sf.write(str(temp_wav), y_stretched.T, sr)
    
    env = os.environ.copy()
    env["PATH"] = f"/opt/homebrew/bin:{env.get('PATH', '')}"
    
    cmd = [
        "/opt/homebrew/bin/ffmpeg",
        "-i", str(temp_wav),
        "-codec:a", "libmp3lame",
        "-b:a", "320k",
        "-y",
        str(output_path)
    ]
    
    subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL, env=env)
    temp_wav.unlink()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_id = str(uuid.uuid4())
        upload_path = UPLOAD_FOLDER / f"{file_id}_{filename}"
        file.save(str(upload_path))
        
        # Get waveform and duration
        waveform, duration = get_waveform_data(upload_path)
        
        return jsonify({
            'success': True,
            'file_id': file_id,
            'filename': filename,
            'waveform': waveform,
            'duration': duration
        })
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/get-audio-info', methods=['POST'])
def get_audio_info():
    data = request.json
    file_id = data.get('file_id')
    
    upload_files = list(UPLOAD_FOLDER.glob(f"{file_id}_*"))
    if not upload_files:
        return jsonify({'error': 'File not found'}), 404
    
    try:
        bpm = detect_bpm(upload_files[0])
        key = detect_key(upload_files[0])
        waveform, duration = get_waveform_data(upload_files[0])
        
        return jsonify({
            'success': True,
            'bpm': round(bpm, 1),
            'key': key,
            'waveform': waveform,
            'duration': duration
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/separate', methods=['POST'])
def separate():
    data = request.json
    file_id = data.get('file_id')
    
    upload_files = list(UPLOAD_FOLDER.glob(f"{file_id}_*"))
    if not upload_files:
        return jsonify({'error': 'File not found'}), 404
    
    input_path = upload_files[0]
    
    try:
        session_id, instrumental_path, vocals_path = separate_vocals(input_path, PROCESSED_FOLDER)
        
        instrumental_key = detect_key(instrumental_path)
        vocals_key = detect_key(vocals_path)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'instrumental_key': instrumental_key,
            'vocals_key': vocals_key
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/detect-key', methods=['POST'])
def detect_key_route():
    data = request.json
    file_id = data.get('file_id')
    
    upload_files = list(UPLOAD_FOLDER.glob(f"{file_id}_*"))
    if not upload_files:
        return jsonify({'error': 'File not found'}), 404
    
    try:
        session_id = str(uuid.uuid4())
        session_dir = PROCESSED_FOLDER / session_id
        session_dir.mkdir(exist_ok=True)
        
        original_file = session_dir / 'original.mp3'
        shutil.copy(str(upload_files[0]), str(original_file))
        
        key = detect_key(original_file)
        bpm = detect_bpm(original_file)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'key': key,
            'bpm': round(bpm, 1),
            'track_type': 'original'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/pitch-shift', methods=['POST'])
def pitch_shift():
    data = request.json
    session_id = data.get('session_id')
    track_type = data.get('track_type')
    semitones = float(data.get('semitones', 0))
    semitones_int = int(semitones)
    
    session_dir = PROCESSED_FOLDER / session_id
    if not session_dir.exists():
        return jsonify({'error': 'Session not found'}), 404
    
    input_file = session_dir / f"{track_type}.mp3"
    output_file = session_dir / f"{track_type}_shifted_{semitones_int}.mp3"
    
    if not input_file.exists():
        return jsonify({'error': 'Track not found'}), 404
    
    if output_file.exists():
        return jsonify({'success': True, 'preview_id': f"{track_type}_shifted_{semitones_int}"})
    
    try:
        pitch_shift_file(input_file, semitones, output_file)
        return jsonify({'success': True, 'preview_id': f"{track_type}_shifted_{semitones_int}"})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/trim', methods=['POST'])
def trim():
    data = request.json
    session_id = data.get('session_id')
    track_type = data.get('track_type')
    start_time = float(data.get('start_time', 0))
    end_time = float(data.get('end_time'))
    
    session_dir = PROCESSED_FOLDER / session_id
    if not session_dir.exists():
        return jsonify({'error': 'Session not found'}), 404
    
    input_file = session_dir / f"{track_type}.mp3"
    output_file = session_dir / f"{track_type}_trimmed.mp3"
    
    if not input_file.exists():
        return jsonify({'error': 'Track not found'}), 404
    
    try:
        trim_audio(input_file, output_file, start_time, end_time)
        # Replace original with trimmed
        shutil.move(str(output_file), str(input_file))
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/change-bpm', methods=['POST'])
def change_bpm_route():
    data = request.json
    session_id = data.get('session_id')
    track_type = data.get('track_type')
    target_bpm = float(data.get('target_bpm'))
    
    session_dir = PROCESSED_FOLDER / session_id
    if not session_dir.exists():
        return jsonify({'error': 'Session not found'}), 404
    
    input_file = session_dir / f"{track_type}.mp3"
    output_file = session_dir / f"{track_type}_bpm_{int(target_bpm)}.mp3"
    
    if not input_file.exists():
        return jsonify({'error': 'Track not found'}), 404
    
    if output_file.exists():
        return jsonify({'success': True, 'filename': output_file.name})
    
    try:
        change_bpm(input_file, output_file, target_bpm)
        return jsonify({'success': True, 'filename': output_file.name})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/audio/<session_id>/<filename>')
def get_audio(session_id, filename):
    file_path = PROCESSED_FOLDER / session_id / filename
    if not file_path.exists():
        return jsonify({'error': 'File not found'}), 404
    return send_file(str(file_path), mimetype='audio/mpeg')

@app.route('/download/<session_id>/<track_type>/<semitones>/<speed>/<format>')
def download(session_id, track_type, semitones, speed, format):
    semitones_int = int(float(semitones))
    speed_float = float(speed)
    
    session_dir = PROCESSED_FOLDER / session_id
    
    # Generate unique filename with speed
    final_filename = f"{track_type}_final_s{semitones_int}_sp{speed_float}.{format}"
    final_path = session_dir / final_filename
    
    # If already generated, return it
    if final_path.exists():
        return send_file(str(final_path), as_attachment=True, download_name=f"{track_type}_processed.{format}")
    
    # Find source file (pitched or original)
    source_path = session_dir / f"{track_type}_shifted_{semitones_int}.mp3"
    if not source_path.exists():
        source_path = session_dir / f"{track_type}.mp3"
    
    if not source_path.exists():
        return jsonify({'error': 'File not found'}), 404
    
    # If speed is 1.0 and format is mp3, just return the pitched file
    if speed_float == 1.0 and format == 'mp3':
        return send_file(str(source_path), as_attachment=True, download_name=f"{track_type}_processed.mp3")
    
    # Apply speed change or format conversion for download
    try:
        env = os.environ.copy()
        env["PATH"] = f"/opt/homebrew/bin:{env.get('PATH', '')}"
        
        if speed_float != 1.0:
            # Apply speed change first
            pitch_shift_file(source_path, 0, final_path, speed=speed_float)
            source_path = final_path
        
        # Convert format if needed
        if format != 'mp3':
            format_map = {
                'wav': 'wav',
                'flac': 'flac',
                'ogg': 'libvorbis'
            }
            
            if format == 'ogg':
                codec = format_map[format]
                cmd = [
                    "/opt/homebrew/bin/ffmpeg",
                    "-i", str(source_path),
                    "-codec:a", codec,
                    "-q:a", "5",
                    "-y",
                    str(final_path)
                ]
            else:
                cmd = [
                    "/opt/homebrew/bin/ffmpeg",
                    "-i", str(source_path),
                    "-y",
                    str(final_path)
                ]
            
            subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL, env=env)
        
        return send_file(str(final_path if final_path.exists() else source_path), 
                        as_attachment=True, 
                        download_name=f"{track_type}_processed.{format}")
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5555, use_reloader=False)
