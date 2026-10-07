import { MediaItem, MediaType } from '../types/editor';

/**
 * Media processing engine for Saad Video Studio:
 * Real offline thumbnail extraction, waveform generation, and metadata analysis.
 */

// Shared audio context for offline waveform extraction
let audioContext: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

/**
 * Parses user imported file into a MediaItem with real dimensions, duration, thumbnails, and waveforms.
 */
export async function processImportedFile(file: File): Promise<MediaItem> {
  const mime = file.type || '';
  const name = file.name;
  const size = file.size;
  const extension = name.split('.').pop()?.toLowerCase() || '';

  let type: MediaType = 'video';
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'].includes(extension)
  ) {
    type = 'audio';
  } else if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(extension)
  ) {
    type = 'image';
  }

  const objectUrl = URL.createObjectURL(file);
  const id = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (type === 'image') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          id,
          name,
          type,
          url: objectUrl,
          blob: file,
          size,
          duration: 0,
          width: img.naturalWidth || 1920,
          height: img.naturalHeight || 1080,
          fps: 0,
          mimeType: mime || `image/${extension}`,
          thumbnailUrl: objectUrl,
          dateAdded: Date.now(),
        });
      };
      img.onerror = () => {
        resolve({
          id,
          name,
          type,
          url: objectUrl,
          blob: file,
          size,
          duration: 0,
          width: 1920,
          height: 1080,
          fps: 0,
          mimeType: mime || `image/${extension}`,
          thumbnailUrl: objectUrl,
          dateAdded: Date.now(),
        });
      };
      img.src = objectUrl;
    });
  }

  if (type === 'audio') {
    // Extract real audio duration and waveform
    const duration = await getAudioDuration(objectUrl);
    const waveformData = await extractWaveformFromFile(file);

    return {
      id,
      name,
      type,
      url: objectUrl,
      blob: file,
      size,
      duration,
      width: 0,
      height: 0,
      fps: 0,
      mimeType: mime || `audio/${extension}`,
      waveformData,
      dateAdded: Date.now(),
    };
  }

  // Type is Video
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      const duration = isFinite(video.duration) ? video.duration : 10;
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const fps = 30; // Standard nominal fps

      // Extract real video thumbnail
      let thumbnailUrl: string | undefined;
      try {
        thumbnailUrl = await captureVideoThumbnail(video, Math.min(1.0, duration * 0.1));
      } catch {
        thumbnailUrl = undefined;
      }

      // Also attempt audio waveform extraction if video contains an audio track
      let waveformData: number[] | undefined;
      try {
        waveformData = await extractWaveformFromFile(file);
      } catch {
        waveformData = undefined;
      }

      resolve({
        id,
        name,
        type: 'video',
        url: objectUrl,
        blob: file,
        size,
        duration,
        width,
        height,
        fps,
        mimeType: mime || `video/${extension}`,
        thumbnailUrl,
        waveformData,
        dateAdded: Date.now(),
      });
    };

    video.onerror = () => {
      // Fallback if browser codec decoding fails for specific container
      resolve({
        id,
        name,
        type: 'video',
        url: objectUrl,
        blob: file,
        size,
        duration: 10,
        width: 1920,
        height: 1080,
        fps: 30,
        mimeType: mime || `video/${extension}`,
        dateAdded: Date.now(),
      });
    };
  });
}

/**
 * Extracts a thumbnail from a video element at the specified timestamp.
 */
export function captureVideoThumbnail(video: HTMLVideoElement, time: number = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const handleSeeked = () => {
      video.removeEventListener('seeked', handleSeeked);
      try {
        const canvas = document.createElement('canvas');
        const scale = 240 / (video.videoWidth || 1920);
        canvas.width = 240;
        canvas.height = Math.round((video.videoHeight || 1080) * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          reject(new Error('Canvas 2D context not available'));
        }
      } catch (err) {
        reject(err);
      }
    };

    video.addEventListener('seeked', handleSeeked);
    video.currentTime = Math.max(0, time);
  });
}

/**
 * Extracts audio duration using HTMLAudioElement
 */
function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = url;
    audio.onloadedmetadata = () => {
      resolve(isFinite(audio.duration) ? audio.duration : 10);
    };
    audio.onerror = () => resolve(10);
  });
}

/**
 * Extracts true waveform peak arrays (100 sample buckets) using Web Audio API
 */
export async function extractWaveformFromFile(file: File, sampleBuckets = 120): Promise<number[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = getAudioContext();
    // Decode audio data
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.floor(channelData.length / sampleBuckets);
    const peaks: number[] = [];

    for (let i = 0; i < sampleBuckets; i++) {
      let max = 0;
      const start = i * step;
      const end = Math.min(start + step, channelData.length);
      for (let j = start; j < end; j += 4) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks.push(Math.min(1.0, max * 1.5)); // Normalized with slight boost
    }

    return peaks;
  } catch {
    // If audio channel is missing or unparseable, return empty waveform
    return [];
  }
}

/**
 * Microphone Voice-Over Recording Engine
 */
export class VoiceOverRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  async start(onLevelUpdate?: (level: number) => void): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = getAudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      if (onLevelUpdate) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const updateMeter = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          onLevelUpdate(avg / 255);
          this.animFrameId = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      }

      this.recordedChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      return true;
    } catch (err) {
      console.error('Failed to start microphone recording:', err);
      return false;
    }
  }

  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }

      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        });
        this.cleanup();
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}
