# Saad Video Studio 🎬
> Professional Offline Desktop Video Editing Application for Windows

**Saad Video Studio** is a completely offline, professional multi-track video editing software built with Electron, React, TypeScript, HTML5 Canvas, Web Audio API, and native FFmpeg media pipeline.

---

## Key Features

- **Genuine Offline Processing**: No internet required, no subscriptions, no accounts, and **no watermark** on exported videos.
- **Multi-Track Timeline**: Dedicated Video, Overlay, Audio, Voiceover, and Text tracks with frame-accurate playhead scrubbing, clip edge trimming, split at playhead (`S`), and magnetic snapping.
- **Real Video & Audio Engine**:
  - Live Canvas Compositing with Crop, Scale, Position, Rotation, Opacity, and Anchor points.
  - Interactive Preview Bounding Box: Reposition clips directly by dragging on the preview canvas.
  - Real-Time Chroma Key (Green / Blue screen) with similarity, edge smoothness, and color spill suppression.
  - Color Grading: Brightness, Contrast, Saturation, Exposure, Temperature, Highlights, Shadows, Vignette, and 11 preset color filters (Warm, Cool, Cinema, Vintage, B&W, etc.).
  - Professional Video Effects: Gaussian Blur, Motion Blur, Glow/Bloom, Sharpen, and Pixelate Mosaic.
  - Video Transitions: Cross Fade, Dissolve, Wipe, Slide, Zoom, Push, and Blur.
- **Speed Curve & Smooth Slow Motion**:
  - Multiplier control from 0.1x to 20x.
  - Interactive Visual Speed Curve Editor (Time vs Speed) with presets (Montage, Bullet Time, Hero Moment, Jump Cut, Slow-Fast, Fast-Slow).
  - Smooth Slow Motion processing: Normal, Frame Blending, and Optical-Flow motion interpolation.
- **Keyframing System**: Keyframe animation for Position X, Position Y, Scale, Rotation, Opacity, and Blur with Linear and Bezier easing curves.
- **Audio Editing & Voice-Over Recording**:
  - Multi-track mixing, Volume, dB Gain, Fade In, Fade Out, and Track Muting.
  - True Audio Waveform visualization decoded offline via Web Audio API.
  - Live Microphone Voice-over recorder with real VU metering, preview playback, and direct timeline insertion.
- **Subtitles (SRT)**: Manual subtitle creation, timing adjustments, styling, `.srt` import, and `.srt` export.
- **Real Offline Export**:
  - Dual-engine pipeline: In-browser Canvas + Web Audio frame-by-frame offline video encoder + Native desktop FFmpeg pipeline.
  - Formats: MP4, WebM, MOV.
  - Resolutions: 720p, 1080p, 2K, 4K (16:9, 9:16, 1:1, 4:5, 4:3, 21:9).
  - Codecs: H.264 / AVC, VP9.
  - Real progress reporting: percentage, current frame, elapsed time, and estimated time remaining.
- **Project System (.saadvideo)**:
  - Save Project, Open Project, and automatic recovery of unsaved sessions after unexpected close.
  - Full Undo / Redo history stack.

---

## 1. Installing Dependencies

Make sure you have Node.js 18+ installed on your computer.

```bash
# Clone the repository and enter the directory
cd saad-video-studio

# Install dependencies
npm install

# For native desktop Electron building, install electron and electron-builder:
npm install --save-dev electron electron-builder
```

---

## 2. Running in Development Mode

### Web / Browser Preview Mode:
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

### Desktop Electron Mode:
```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Launch Electron desktop window
npx electron electron/main.cjs
```

---

## 3. Packaging FFmpeg Correctly for Windows

To bundle native FFmpeg with the Windows installer or portable version:

1. Download the static Windows build of FFmpeg from:
   https://www.gyan.dev/ffmpeg/builds/ (e.g. `ffmpeg-release-essentials.zip`)
2. Extract `ffmpeg.exe` and `ffprobe.exe` into:
   ```
   saad-video-studio/
   └── electron/
       └── ffmpeg/
           ├── ffmpeg.exe
           └── ffprobe.exe
   ```
3. When building the application, `electron-builder.json` automatically bundles this directory into `resources/ffmpeg/`.

---

## 4. Building the Windows Installer (EXE)

To package a standalone Windows Installer (`.exe`) with setup wizard and desktop shortcut:

```bash
npm run build
npx electron-builder --win nsis
```
The generated installer will be located in the `dist-electron/` folder:
`dist-electron/Saad Video Studio Setup 1.0.0.exe`

---

## 5. Building the Portable Windows Version

To build a standalone Portable executable that requires no installation and runs from USB or any folder:

```bash
npm run build
npx electron-builder --win portable
```
The portable executable will be created in `dist-electron/`:
`dist-electron/SaadVideoStudio-Portable-1.0.0.exe`

---

## 6. Running Offline Without Internet

1. Once installed or extracted via the portable EXE, **Saad Video Studio runs 100% offline**.
2. All media files are read from the local file system.
3. Audio waveforms, thumbnails, video rendering, chroma keying, and audio mixing run locally on your CPU/GPU.
4. Export renders directly to your local disk without contacting any server.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **Space** | Play / Pause Preview |
| **S** | Split selected clip at playhead |
| **Delete / Backspace** | Delete selected clip |
| **Ctrl + Z** | Undo |
| **Ctrl + Y** / **Ctrl + Shift + Z** | Redo |
| **Ctrl + S** | Save Project (`.saadvideo`) |
| **Ctrl + E** | Open Export Dialog |
| **← / →** | Step 1 frame backward / forward |
| **Ctrl + C / Ctrl + V** | Copy / Paste clip |

---

## License

Built with Saad Video Studio. Completely open and offline video editing software.
