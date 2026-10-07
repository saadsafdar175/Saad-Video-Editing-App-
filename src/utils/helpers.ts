import {
  ClipTransform,
  ColorAdjustment,
  FilterType,
  Keyframe,
  MediaItem,
  SpeedCurvePoint,
  TimelineClip,
  TrackType,
} from '../types/editor';
import { getDefaultColorAdjustment } from './colorGradingPresets';

export function formatTimecode(seconds: number, fps: number = 30): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const totalFrames = Math.floor(seconds * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(seconds);
  const secs = totalSeconds % 60;
  const mins = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}.${ms}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Calculates current speed multiplier along a speed curve (normalized 0..1 time).
 * Uses cubic or linear interpolation between control points.
 */
export function evaluateSpeedCurve(curve: SpeedCurvePoint[], normalizedTime: number): number {
  if (!curve || curve.length === 0) return 1.0;
  if (curve.length === 1) return curve[0].speed;

  const sorted = [...curve].sort((a, b) => a.time - b.time);
  if (normalizedTime <= sorted[0].time) return sorted[0].speed;
  if (normalizedTime >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].speed;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (normalizedTime >= p1.time && normalizedTime <= p2.time) {
      const range = p2.time - p1.time;
      if (range === 0) return p1.speed;
      const t = (normalizedTime - p1.time) / range;
      // Smooth Hermite / Ease interpolation
      const smoothT = t * t * (3 - 2 * t);
      return p1.speed + (p2.speed - p1.speed) * smoothT;
    }
  }

  return 1.0;
}

/**
 * Evaluates keyframe properties at given clip time offset.
 */
export function evaluateKeyframeProperties(
  keyframes: Keyframe[],
  timeOffset: number,
  baseTransform: ClipTransform,
  baseOpacity: number
): {
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  opacity: number;
  blur: number;
} {
  const result = {
    positionX: baseTransform.positionX,
    positionY: baseTransform.positionY,
    scale: baseTransform.scale,
    rotation: baseTransform.rotation,
    opacity: baseOpacity,
    blur: 0,
  };

  if (!keyframes || keyframes.length === 0) return result;

  const sorted = [...keyframes].sort((a, b) => a.timeOffset - b.timeOffset);

  // Helper for single property interpolation
  const interpolateProp = (prop: keyof Keyframe['properties'], defaultVal: number): number => {
    const validKfs = sorted.filter((k) => k.properties[prop] !== undefined);
    if (validKfs.length === 0) return defaultVal;
    if (timeOffset <= validKfs[0].timeOffset) return validKfs[0].properties[prop]!;
    if (timeOffset >= validKfs[validKfs.length - 1].timeOffset) {
      return validKfs[validKfs.length - 1].properties[prop]!;
    }

    for (let i = 0; i < validKfs.length - 1; i++) {
      const k1 = validKfs[i];
      const k2 = validKfs[i + 1];
      if (timeOffset >= k1.timeOffset && timeOffset <= k2.timeOffset) {
        const span = k2.timeOffset - k1.timeOffset;
        let t = span > 0 ? (timeOffset - k1.timeOffset) / span : 0;

        // Apply keyframe interpolation
        if (k1.interpolation === 'ease-in') {
          t = t * t;
        } else if (k1.interpolation === 'ease-out') {
          t = t * (2 - t);
        } else if (k1.interpolation === 'ease-in-out') {
          t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }

        const v1 = k1.properties[prop]!;
        const v2 = k2.properties[prop]!;
        return v1 + (v2 - v1) * t;
      }
    }
    return defaultVal;
  };

  result.positionX = interpolateProp('positionX', baseTransform.positionX);
  result.positionY = interpolateProp('positionY', baseTransform.positionY);
  result.scale = interpolateProp('scale', baseTransform.scale);
  result.rotation = interpolateProp('rotation', baseTransform.rotation);
  result.opacity = interpolateProp('opacity', baseOpacity);
  result.blur = interpolateProp('blur', 0);

  return result;
}

/**
 * Returns CSS filter string for preset color filters
 */
export function getFilterCss(filter: FilterType): string {
  switch (filter) {
    case 'warm':
      return 'sepia(0.25) saturate(1.2) hue-rotate(-10deg)';
    case 'cool':
      return 'hue-rotate(15deg) saturate(1.1) brightness(1.05)';
    case 'cinema':
      return 'contrast(1.25) saturate(0.9) brightness(0.95)';
    case 'vintage':
      return 'sepia(0.4) contrast(1.1) brightness(0.9) saturate(0.85)';
    case 'bw':
      return 'grayscale(1) contrast(1.2)';
    case 'contrast':
      return 'contrast(1.4)';
    case 'bright':
      return 'brightness(1.25) contrast(1.05)';
    case 'dark':
      return 'brightness(0.75) contrast(1.2)';
    case 'sharp':
      return 'contrast(1.3) saturate(1.15)';
    case 'soft':
      return 'contrast(0.85) brightness(1.05) blur(0.5px)';
    case 'original':
    default:
      return 'none';
  }
}

/**
 * Generates CSS filter string for custom color adjustments
 */
export function getColorAdjustmentCss(adj: ColorAdjustment): string {
  const parts: string[] = [];
  const expFactor = Math.pow(2, (adj.exposure || 0) / 50);
  const brightFactor = (1 + (adj.brightness || 0) / 100) * expFactor;
  if (brightFactor !== 1) parts.push(`brightness(${brightFactor.toFixed(3)})`);
  if (adj.contrast !== 0) parts.push(`contrast(${1 + adj.contrast / 100})`);
  if (adj.saturation !== 0 || adj.vibrance !== 0) {
    const totalSat = 1 + (adj.saturation + (adj.vibrance || 0) * 0.5) / 100;
    parts.push(`saturate(${Math.max(0, totalSat).toFixed(3)})`);
  }
  if (adj.temperature !== 0) {
    const deg = adj.temperature > 0 ? -adj.temperature * 0.15 : -adj.temperature * 0.2;
    parts.push(`hue-rotate(${deg.toFixed(1)}deg)`);
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * Factory to create a default TimelineClip from MediaItem
 */
export function createClipFromMedia(
  media: MediaItem,
  trackId: string,
  startTime: number
): TimelineClip {
  const clipDuration = media.duration > 0 ? Math.min(media.duration, 15) : 5; // Default 5s for image, or media duration

  let trackType: TrackType = 'video';
  if (media.type === 'audio') trackType = 'audio';
  else if (media.type === 'image') trackType = 'video';

  return {
    id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    trackId,
    mediaId: media.id,
    name: media.name,
    type: trackType,
    startTime,
    duration: clipDuration,
    trimStart: 0,
    trimEnd: clipDuration,
    speed: 1.0,
    speedCurve: [
      { id: 'p0', time: 0, speed: 1.0 },
      { id: 'p1', time: 1, speed: 1.0 },
    ],
    speedCurvePreset: 'custom',
    slowMotion: {
      enabled: false,
      mode: 'normal',
      rate: 0.5,
      quality: 'balanced',
    },
    transform: {
      positionX: 0,
      positionY: 0,
      scale: 1.0,
      rotation: 0,
      flipH: false,
      flipV: false,
      opacity: 1.0,
      crop: { top: 0, bottom: 0, left: 0, right: 0 },
      anchorPoint: { x: 0.5, y: 0.5 },
    },
    keyframes: [],
    audio: {
      volume: 1.0,
      gain: 0,
      fadeIn: 0,
      fadeOut: 0,
      isMuted: false,
    },
    filter: 'original',
    colorAdjust: getDefaultColorAdjustment(),
    effect: {
      type: 'none',
      intensity: 0,
    },
    transition: {
      type: 'none',
      duration: 0.5,
    },
    chromaKey: {
      enabled: false,
      color: '#00ff00',
      similarity: 40,
      smoothness: 10,
      spill: 20,
      edgeAdjustment: 0,
    },
  };
}

/**
 * Factory for creating a Text Clip
 */
export function createTextClip(
  text: string,
  trackId: string,
  startTime: number,
  duration: number = 5
): TimelineClip {
  return {
    id: `clip-text-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    trackId,
    name: text.length > 20 ? text.substring(0, 20) + '...' : text,
    type: 'text',
    startTime,
    duration,
    trimStart: 0,
    trimEnd: duration,
    speed: 1.0,
    speedCurve: [
      { id: 'p0', time: 0, speed: 1.0 },
      { id: 'p1', time: 1, speed: 1.0 },
    ],
    speedCurvePreset: 'custom',
    slowMotion: {
      enabled: false,
      mode: 'normal',
      rate: 0.5,
      quality: 'balanced',
    },
    transform: {
      positionX: 0,
      positionY: 20, // Default slightly lower or center
      scale: 1.0,
      rotation: 0,
      flipH: false,
      flipV: false,
      opacity: 1.0,
      crop: { top: 0, bottom: 0, left: 0, right: 0 },
      anchorPoint: { x: 0.5, y: 0.5 },
    },
    keyframes: [],
    audio: {
      volume: 1.0,
      gain: 0,
      fadeIn: 0,
      fadeOut: 0,
      isMuted: false,
    },
    text: {
      content: text,
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 56,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      color: '#ffffff',
      backgroundColor: 'transparent',
      strokeColor: '#000000',
      strokeWidth: 2,
      shadowColor: 'rgba(0,0,0,0.7)',
      shadowBlur: 8,
      letterSpacing: 0,
      lineSpacing: 1.2,
    },
    filter: 'original',
    colorAdjust: getDefaultColorAdjustment(),
    effect: {
      type: 'none',
      intensity: 0,
    },
    transition: {
      type: 'fade',
      duration: 0.5,
    },
    chromaKey: {
      enabled: false,
      color: '#00ff00',
      similarity: 40,
      smoothness: 10,
      spill: 20,
      edgeAdjustment: 0,
    },
  };
}
