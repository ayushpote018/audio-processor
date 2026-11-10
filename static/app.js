// Audio Processor Pro - Main JavaScript
let fileId = null;
let sessionId = null;
let originalKey = null;
let instrumentalOriginalKey = null;
let vocalsOriginalKey = null;
let currentOriginalSemitones = 0;
let currentInstrumentalSemitones = 0;
let currentVocalsSemitones = 0;
let currentOriginalSpeed = 1.0;
let currentInstrumentalSpeed = 1.0;
let currentVocalsSpeed = 1.0;
let currentOriginalBPM = null;
let currentInstrumentalBPM = null;
let currentVocalsBPM = null;
let activeAudios = {};
let selectedFormat = 'mp3';

const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Drag and Drop
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.remove('dragover');
    }, false);
});

uploadZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

async function handleFile(file) {
    document.getElementById('fileName').textContent = `📁 ${file.name}`;
    document.getElementById('uploadProgress').style.display = 'block';
    
    const formData = new FormData();
    formData.append('file', file);

    try {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                document.getElementById('progressFill').style.width = percentComplete + '%';
                document.getElementById('progressText').textContent = `Uploading... ${percentComplete}%`;
            }
        });
        
        xhr.addEventListener('load', async () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                fileId = data.file_id;
                
                // Draw waveform
                drawWaveform(data.waveform);
                
                // Get audio info (BPM, Key)
                await getAudioInfo();
                
                // Show action buttons
                document.getElementById('actionButtons').style.display = 'flex';
                document.getElementById('uploadProgress').style.display = 'none';
            }
        });
        
        xhr.open('POST', '/upload');
        xhr.send(formData);
        
    } catch (error) {
        alert('Upload failed: ' + error.message);
        document.getElementById('uploadProgress').style.display = 'none';
    }
}

function drawWaveform(waveformData) {
    const canvas = document.getElementById('waveformCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const middle = height / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const step = width / waveformData.length;
    
    for (let i = 0; i < waveformData.length; i++) {
        const x = i * step;
        const y = middle + (waveformData[i] * middle * 0.8);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    
    // Show waveform card
    document.getElementById('waveformCard').style.display = 'block';
}

async function getAudioInfo() {
    try {
        const response = await fetch('/get-audio-info', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ file_id: fileId })
        });
        
        const data = await response.json();
        if (data.success) {
            // Display audio info
            const infoHTML = `
                <div class="info-card">
                    <div class="label">Key</div>
                    <div class="value">${data.key}</div>
                </div>
                <div class="info-card">
                    <div class="label">BPM</div>
                    <div class="value">${data.bpm}</div>
                </div>
                <div class="info-card">
                    <div class="label">Duration</div>
                    <div class="value">${formatDuration(data.duration)}</div>
                </div>
            `;
            document.getElementById('audioInfo').innerHTML = infoHTML;
        }
    } catch (error) {
        console.error('Failed to get audio info:', error);
    }
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function pitchShiftOnly() {
    showLoading('Analyzing audio...');
    
    try {
        const response = await fetch('/detect-key', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ file_id: fileId })
        });
        
        const data = await response.json();
        if (data.success) {
            sessionId = data.session_id;
            originalKey = data.key;
            currentOriginalBPM = data.bpm;
            
            createTrackCard('original', data.key, data.bpm);
            hideLoading();
        }
    } catch (error) {
        alert('Processing failed: ' + error.message);
        hideLoading();
    }
}

async function separateVocals() {
    showLoading('Separating vocals... This may take 2-3 minutes');
    simulateProgress();
    
    try {
        const response = await fetch('/separate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ file_id: fileId })
        });
        
        const data = await response.json();
        if (data.success) {
            sessionId = data.session_id;
            instrumentalOriginalKey = data.instrumental_key;
            vocalsOriginalKey = data.vocals_key;
            
            createTrackCard('instrumental', data.instrumental_key);
            createTrackCard('vocals', data.vocals_key);
            hideLoading();
        }
    } catch (error) {
        alert('Separation failed: ' + error.message);
        hideLoading();
    }
}

function createTrackCard(trackType, key, bpm = null) {
    const icons = {
        'original': '🎵',
        'instrumental': '🎸',
        'vocals': '🎤'
    };
    
    const titles = {
        'original': 'Original Track',
        'instrumental': 'Instrumental',
        'vocals': 'Vocals'
    };
    
    const trackHTML = `
        <div class="track-card" id="${trackType}Track">
            <div class="processing-overlay" id="${trackType}Processing">
                <div class="processing-content">
                    <div class="mini-spinner"></div>
                    <div>Processing...</div>
                </div>
            </div>
            
            <div class="track-header">
                <div class="track-title">${icons[trackType]} ${titles[trackType]}</div>
                <div>
                    <span class="badge" id="${trackType}Key">Key: ${key}</span>
                    ${bpm ? `<span class="badge" id="${trackType}BPM" style="margin-left:10px;">BPM: ${bpm}</span>` : ''}
                </div>
            </div>
            
            <audio id="${trackType}Audio" controls></audio>
            
            <div class="control-section">
                <h3>⚙️ Controls</h3>
                
                <div class="slider-group">
                    <div class="slider-label">
                        <span>Pitch Shift</span>
                        <span class="slider-value" id="${trackType}Semitone">0</span>
                    </div>
                    <input type="range" id="${trackType}Slider" min="-12" max="12" value="0" step="1">
                </div>
                
                <div class="key-grid">
                    ${keys.map(k => `<button class="key-btn" onclick="setTargetKey('${trackType}', '${k}')">${k}</button>`).join('')}
                </div>
                
                <div class="slider-group" style="margin-top:30px;">
                    <div class="slider-label">
                        <span>Playback Speed</span>
                        <span class="slider-value" id="${trackType}Speed">1.00x</span>
                    </div>
                    <input type="range" id="${trackType}SpeedSlider" min="0.5" max="2" value="1" step="0.05">
                </div>
            </div>
            
            ${bpm ? `
            <div class="bpm-section">
                <h3>🎹 BPM Control</h3>
                <div class="bpm-controls">
                    <div>
                        <div style="font-size:0.9em; color:#666; margin-bottom:5px;">Current BPM</div>
                        <div class="bpm-display" id="${trackType}CurrentBPM">${bpm}</div>
                    </div>
                    <div style="flex:1;">
                        <input type="number" id="${trackType}TargetBPM" placeholder="Target BPM" 
                               style="width:150px; padding:12px; border:2px solid #1976d2; border-radius:10px; font-size:1.1em; font-weight:600;">
                        <button class="btn btn-secondary" onclick="changeBPM('${trackType}')" style="margin-left:10px;">
                            Change BPM
                        </button>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <div class="trim-section">
                <h3>✂️ Trim Audio</h3>
                <div class="trim-controls">
                    <input type="number" id="${trackType}TrimStart" placeholder="Start (sec)" min="0" value="0">
                    <input type="number" id="${trackType}TrimEnd" placeholder="End (sec)" min="0">
                    <button class="btn btn-danger" onclick="trimAudio('${trackType}')">
                        Trim
                    </button>
                </div>
            </div>
            
            <div class="download-section">
                <h3>💾 Download</h3>
                <div class="format-selector">
                    <button class="format-btn active" onclick="selectFormat(this, 'mp3')">MP3</button>
                    <button class="format-btn" onclick="selectFormat(this, 'wav')">WAV</button>
                    <button class="format-btn" onclick="selectFormat(this, 'flac')">FLAC</button>
                    <button class="format-btn" onclick="selectFormat(this, 'ogg')">OGG</button>
                </div>
                <button class="btn btn-success" onclick="downloadTrack('${trackType}')" style="width:100%;">
                    ⬇️ Download Processed Track
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('trackSection').insertAdjacentHTML('beforeend', trackHTML);
    document.getElementById('trackSection').style.display = 'block';
    
    // Set up audio element
    const audio = document.getElementById(`${trackType}Audio`);
    audio.src = `/audio/${sessionId}/${trackType}.mp3`;
    audio.load();
    activeAudios[trackType] = audio;
    
    // Set up sliders
    setupSliders(trackType);
}

function setupSliders(trackType) {
    const pitchSlider = document.getElementById(`${trackType}Slider`);
    const speedSlider = document.getElementById(`${trackType}SpeedSlider`);
    
    let pitchTimeout = null;
    pitchSlider.addEventListener('input', (e) => {
        const semitones = parseInt(e.target.value);
        
        if (trackType === 'original') currentOriginalSemitones = semitones;
        else if (trackType === 'instrumental') currentInstrumentalSemitones = semitones;
        else currentVocalsSemitones = semitones;
        
        document.getElementById(`${trackType}Semitone`).textContent = 
            semitones > 0 ? `+${semitones}` : semitones;
        
        clearTimeout(pitchTimeout);
        pitchTimeout = setTimeout(() => {
            pitchShift(trackType, semitones);
        }, 800);
    });
    
    speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        
        if (trackType === 'original') currentOriginalSpeed = speed;
        else if (trackType === 'instrumental') currentInstrumentalSpeed = speed;
        else currentVocalsSpeed = speed;
        
        document.getElementById(`${trackType}Speed`).textContent = speed.toFixed(2) + 'x';
        
        const audio = activeAudios[trackType];
        if (audio) {
            audio.playbackRate = speed;
        }
    });
}

async function pitchShift(trackType, semitones) {
    const audio = activeAudios[trackType];
    if (!audio) return;

    const wasPlaying = !audio.paused;
    const currentTime = audio.currentTime;
    
    const overlay = document.getElementById(`${trackType}Processing`);
    overlay.classList.add('active');

    if (semitones === 0) {
        audio.src = `/audio/${sessionId}/${trackType}.mp3`;
        audio.load();
        audio.addEventListener('loadedmetadata', function onLoad() {
            audio.currentTime = currentTime;
            if (wasPlaying) audio.play().catch(() => {});
            overlay.classList.remove('active');
            audio.removeEventListener('loadedmetadata', onLoad);
        });
        return;
    }

    try {
        const response = await fetch('/pitch-shift', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                session_id: sessionId,
                track_type: trackType,
                semitones: semitones
            })
        });

        const data = await response.json();
        if (data.success) {
            audio.src = `/audio/${sessionId}/${trackType}_shifted_${semitones}.mp3?t=${Date.now()}`;
            audio.load();
            
            audio.addEventListener('loadedmetadata', function onLoad() {
                audio.currentTime = currentTime;
                if (wasPlaying) audio.play().catch(() => {});
                overlay.classList.remove('active');
                audio.removeEventListener('loadedmetadata', onLoad);
            });
        }
    } catch (error) {
        console.error('Pitch shift failed:', error);
        overlay.classList.remove('active');
    }
}

function setTargetKey(trackType, targetKey) {
    let originalKeyValue;
    if (trackType === 'original') originalKeyValue = originalKey;
    else if (trackType === 'instrumental') originalKeyValue = instrumentalOriginalKey;
    else originalKeyValue = vocalsOriginalKey;

    const originalIndex = keys.indexOf(originalKeyValue);
    const targetIndex = keys.indexOf(targetKey);
    
    let semitones = targetIndex - originalIndex;
    if (semitones > 6) semitones -= 12;
    if (semitones < -6) semitones += 12;

    const slider = document.getElementById(`${trackType}Slider`);
    slider.value = semitones;
    
    if (trackType === 'original') currentOriginalSemitones = semitones;
    else if (trackType === 'instrumental') currentInstrumentalSemitones = semitones;
    else currentVocalsSemitones = semitones;

    document.getElementById(`${trackType}Semitone`).textContent = 
        semitones > 0 ? `+${semitones}` : semitones;
    
    updateActiveKeyButton(trackType, targetKey);
    pitchShift(trackType, semitones);
}

function updateActiveKeyButton(trackType, activeKey) {
    const trackCard = document.getElementById(`${trackType}Track`);
    if (!trackCard) return;
    
    const buttons = trackCard.querySelectorAll('.key-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.trim() === activeKey) {
            btn.classList.add('active');
        }
    });
}

async function trimAudio(trackType) {
    const start = parseFloat(document.getElementById(`${trackType}TrimStart`).value) || 0;
    const end = parseFloat(document.getElementById(`${trackType}TrimEnd`).value);
    
    if (!end || end <= start) {
        alert('Please enter valid trim times');
        return;
    }
    
    showLoading('Trimming audio...');
    
    try {
        const response = await fetch('/trim', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                session_id: sessionId,
                track_type: trackType,
                start_time: start,
                end_time: end
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // Reload audio
            const audio = activeAudios[trackType];
            audio.src = `/audio/${sessionId}/${trackType}.mp3?t=${Date.now()}`;
            audio.load();
            hideLoading();
            alert('✂️ Audio trimmed successfully!');
        }
    } catch (error) {
        alert('Trim failed: ' + error.message);
        hideLoading();
    }
}

async function changeBPM(trackType) {
    const targetBPM = parseFloat(document.getElementById(`${trackType}TargetBPM`).value);
    
    if (!targetBPM || targetBPM < 20 || targetBPM > 300) {
        alert('Please enter a valid BPM (20-300)');
        return;
    }
    
    showLoading('Changing BPM...');
    
    try {
        const response = await fetch('/change-bpm', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                session_id: sessionId,
                track_type: trackType,
                target_bpm: targetBPM
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // Update displayed BPM
            document.getElementById(`${trackType}CurrentBPM`).textContent = targetBPM;
            hideLoading();
            alert(`🎹 BPM changed to ${targetBPM}!`);
        }
    } catch (error) {
        alert('BPM change failed: ' + error.message);
        hideLoading();
    }
}

function selectFormat(button, format) {
    document.querySelectorAll('.format-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    selectedFormat = format;
}

function downloadTrack(trackType) {
    let semitones, speed;
    if (trackType === 'original') {
        semitones = currentOriginalSemitones;
        speed = currentOriginalSpeed;
    } else if (trackType === 'instrumental') {
        semitones = currentInstrumentalSemitones;
        speed = currentInstrumentalSpeed;
    } else {
        semitones = currentVocalsSemitones;
        speed = currentVocalsSpeed;
    }
    
    window.location.href = `/download/${sessionId}/${trackType}/${semitones}/${speed}/${selectedFormat}`;
}

function resetAll() {
    if (confirm('Reset all changes and start over?')) {
        location.reload();
    }
}

function showLoading(text) {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function simulateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 95) progress = 95;
        document.getElementById('processingProgress').style.width = progress + '%';
        document.getElementById('processingText').textContent = `Processing... ${Math.round(progress)}%`;
        
        if (!document.getElementById('loadingOverlay').classList.contains('active')) {
            clearInterval(interval);
            document.getElementById('processingProgress').style.width = '100%';
        }
    }, 800);
}
