import { CanvasSettings, ExportSettings, MediaItem, ProjectData, SubtitleItem, TimelineClip, TimelineTrack } from '../types/editor';
import { RESOLUTION_MAP } from '../utils/constants';
import { renderFrame } from './renderEngine';

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  statusText: string;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

/**
 * Offline Video Export Engine for Saad Video Studio.
 * Renders the multi-track timeline frame-by-frame and encodes it into a playable video file.
 */
export class OfflineExportEngine {
  private isCancelled: boolean = false;

  cancel() {
    this.isCancelled = true;
  }

  async exportProject(
    project: ProjectData,
    settings: ExportSettings,
    onProgress: ExportProgressCallback
  ): Promise<Blob> {
    this.isCancelled = false;

    // 1. Determine Output Dimensions
    const aspect = project.canvas.aspectRatio;
    const resPreset = settings.resolution;
    const mapped = RESOLUTION_MAP[aspect]?.[resPreset] || { width: 1920, height: 1080 };
    const width = mapped.width;
    const height = mapped.height;
    const fps = settings.fps;

    // 2. Calculate Total Duration based on latest clip end time
    let maxClipEnd = 0;
    project.clips.forEach((clip) => {
      const end = clip.startTime + clip.duration;
      if (end > maxClipEnd) maxClipEnd = end;
    });

    const totalDuration = Math.max(1, maxClipEnd);
    const totalFrames = Math.ceil(totalDuration * fps);

    // 3. Prepare Offscreen Render Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to create Canvas 2D rendering context for export.');
    }

    // 4. Map media items
    const mediaMap = new Map<string, MediaItem>();
    project.media.forEach((m) => mediaMap.set(m.id, m));

    // 5. Setup MediaRecorder with stream
    const canvasStream = canvas.captureStream(fps);

    // Audio setup
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const dest = audioCtx.createMediaStreamDestination();

    const combinedTracks = [
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ];
    const exportStream = new MediaStream(combinedTracks);

    // Pick best supported MIME type
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (settings.format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
      mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      mimeType = 'video/webm;codecs=vp9,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mimeType = 'video/webm;codecs=vp8,opus';
    } else {
      mimeType = 'video/webm';
    }

    // Bitrate based on quality
    let videoBitrate = 8_000_000; // 8 Mbps
    if (settings.quality === 'low') videoBitrate = 3_000_000;
    else if (settings.quality === 'medium') videoBitrate = 6_000_000;
    else if (settings.quality === 'high') videoBitrate = 12_000_000;
    else if (settings.quality === 'maximum') videoBitrate = 24_000_000;

    const recordedChunks: Blob[] = [];
    const recorder = new MediaRecorder(exportStream, {
      mimeType,
      videoBitsPerSecond: videoBitrate,
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    recorder.start(100);

    const startTime = performance.now();
    const frameIntervalMs = 1000 / fps;

    // 6. Frame-by-Frame Render Loop
    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) {
        recorder.stop();
        audioCtx.close().catch(() => {});
        throw new Error('Export was cancelled by user.');
      }

      const currentTime = frame / fps;

      // Render frame
      renderFrame(ctx, width, height, {
        currentTime,
        canvasSettings: project.canvas,
        tracks: project.tracks,
        clips: project.clips,
        mediaMap,
        subtitles: project.subtitles,
        previewQuality: 'full',
      });

      // Progress calculation
      const elapsedMs = performance.now() - startTime;
      const elapsedSeconds = elapsedMs / 1000;
      const progressRatio = (frame + 1) / totalFrames;
      const totalEstimatedSeconds = elapsedSeconds / progressRatio;
      const estimatedRemainingSeconds = Math.max(0, totalEstimatedSeconds - elapsedSeconds);

      onProgress({
        currentFrame: frame + 1,
        totalFrames,
        percentage: Math.round(progressRatio * 100),
        elapsedSeconds: Math.round(elapsedSeconds),
        estimatedRemainingSeconds: Math.round(estimatedRemainingSeconds),
        statusText: `Encoding frame ${frame + 1} of ${totalFrames} (${Math.round(progressRatio * 100)}%)`,
      });

      // Allow event loop to process recording chunks and UI updates
      await new Promise((resolve) => setTimeout(resolve, Math.max(4, Math.floor(frameIntervalMs * 0.2))));
    }

    // 7. Complete export and return blob
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        audioCtx.close().catch(() => {});
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        resolve(finalBlob);
      };

      recorder.onerror = (err) => {
        audioCtx.close().catch(() => {});
        reject(err);
      };

      // Allow final frames to flush into recorder
      setTimeout(() => {
        try {
          recorder.stop();
        } catch (e) {
          reject(e);
        }
      }, 300);
    });
  }
}

export const exportEngine = new OfflineExportEngine();
