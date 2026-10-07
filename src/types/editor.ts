export type MediaType = 'video' | 'audio' | 'image';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  url: string; // Object URL or file path
  blob?: Blob;
  size: number; // in bytes
  duration: number; // in seconds (0 for images)
  width: number;
  height: number;
  fps: number;
  mimeType: string;
  thumbnailUrl?: string;
  waveformData?: number[]; // Audio peak array 0..1 for visual waveform
  dateAdded: number;
}

export type TrackType = 'video' | 'overlay' | 'audio' | 'text' | 'effect' | 'subtitle';

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  isMuted: boolean;
  isHidden: boolean;
  isLocked: boolean;
  order: number;
}

export interface SpeedCurvePoint {
  id: string;
  time: number; // 0 to 1 normalized along clip duration
  speed: number; // 0.1 to 10
}

export type SpeedCurvePreset = 'custom' | 'montage' | 'bullet' | 'hero' | 'jump_cut' | 'slow_fast' | 'fast_slow';

export interface SmoothSlowMotion {
  enabled: boolean;
  mode: 'normal' | 'blend' | 'optical';
  rate: number; // e.g. 0.25, 0.4, 0.5, 0.6, 0.75
  quality: 'fast' | 'balanced' | 'high';
}

export interface KeyframeProperty {
  positionX?: number;
  positionY?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  blur?: number;
  volume?: number;
}

export interface Keyframe {
  id: string;
  timeOffset: number; // relative time inside clip in seconds
  properties: KeyframeProperty;
  interpolation: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface ClipTransform {
  positionX: number; // Offset from center in % (-100 to 100) or px
  positionY: number;
  scale: number; // 0.1 to 5.0 (default 1.0)
  rotation: number; // degrees -360 to 360
  flipH: boolean;
  flipV: boolean;
  opacity: number; // 0 to 1 (default 1)
  crop: {
    top: number; // in %
    bottom: number;
    left: number;
    right: number;
  };
  anchorPoint: { x: number; y: number }; // 0 to 1 (center is 0.5, 0.5)
}

export interface ClipAudio {
  volume: number; // 0 to 2 (1 = 100%)
  gain: number; // dB (-20 to +20)
  fadeIn: number; // duration in seconds
  fadeOut: number; // duration in seconds
  isMuted: boolean;
}

export interface ClipText {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '600' | '800';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  letterSpacing: number;
  lineSpacing: number;
}

export type FilterType =
  | 'original'
  | 'warm'
  | 'cool'
  | 'cinema'
  | 'vintage'
  | 'bw'
  | 'contrast'
  | 'bright'
  | 'dark'
  | 'sharp'
  | 'soft';

export interface ColorWheelValue {
  r: number; // -1 to 1 (default 0)
  g: number; // -1 to 1 (default 0)
  b: number; // -1 to 1 (default 0)
  luma: number; // -1 to 1 (default 0)
}

export interface CurvePoint {
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface ColorCurves {
  rgb: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export interface FilmGrainSettings {
  enabled: boolean;
  amount: number; // 0 to 100
  size: number; // 1 to 10
  intensity: number; // 0 to 100
  softness: number; // 0 to 100
  filmStock: '8mm' | '16mm' | '35mm' | '65mm';
}

export interface CinematicEffectsSettings {
  halation: number; // 0 to 100
  bloom: number; // 0 to 100
  glow: number; // 0 to 100
  softHighlight: number; // 0 to 100
  lensDiffusion: number; // 0 to 100
  vignette: number; // 0 to 100
  filmFade: number; // 0 to 100
  chromaticAberration: number; // 0 to 100
  lensDistortion: number; // 0 to 100
  lightLeak: number; // 0 to 100
  filmBurn: number; // 0 to 100
}

export interface CinematicCameraLook {
  cinematicStrength: number; // 0 to 100
  depthContrast: number; // 0 to 100
  highlightRolloff: number; // 0 to 100
  shadowSoftness: number; // 0 to 100
  blackLevel: number; // 0 to 100
  colorSeparation: number; // 0 to 100
}

export interface SkinToneProtection {
  enabled: boolean;
  strength: number; // 0 to 100
  range: number; // 0 to 100
}

export interface LUTSettings {
  name: string;
  enabled: boolean;
  intensity: number; // 0 to 100
  size: number;
  data?: Float32Array; // 3D LUT flattened table
  rawCube?: string;
}

export interface GradingLayer {
  id: string;
  name: string;
  type: 'base' | 'look' | 'lut' | 'grain' | 'vignette' | 'effects';
  enabled: boolean;
  intensity: number; // 0 to 100
}

export interface ColorAdjustment {
  // Basic Correction
  exposure: number; // -100 to 100 (default 0)
  brightness: number; // -100 to 100 (default 0)
  contrast: number; // -100 to 100 (default 0)
  highlights: number; // -100 to 100 (default 0)
  shadows: number; // -100 to 100 (default 0)
  whites: number; // -100 to 100 (default 0)
  blacks: number; // -100 to 100 (default 0)
  saturation: number; // -100 to 100 (default 0)
  vibrance: number; // -100 to 100 (default 0)
  temperature: number; // -100 to 100 (default 0)
  tint: number; // -100 to 100 (default 0)
  fade: number; // 0 to 100 (default 0)
  sharpness: number; // 0 to 100 (default 0)
  vignette: number; // 0 to 100 (default 0)

  // Cinematic Color Wheels
  lift: ColorWheelValue;
  gamma: ColorWheelValue;
  gain: ColorWheelValue;
  offset: ColorWheelValue;

  // Curves
  curves: ColorCurves;

  // Preset
  preset: string;
  presetIntensity: number;

  // LUT
  lut: LUTSettings;

  // Film Grain
  grain: FilmGrainSettings;

  // Cinematic Effects
  cinematicEffects: CinematicEffectsSettings;

  // Camera Look
  cameraLook: CinematicCameraLook;

  // Skin Tone Protection
  skinTone: SkinToneProtection;

  // Letterbox Cinematic Bars
  cinematicBars: {
    enabled: boolean;
    ratio: '16:9' | '2.35:1' | '2.39:1' | '2.40:1' | '21:9';
  };

  // Preset Layers Stack
  layers: GradingLayer[];
}

export type EffectType =
  | 'none'
  | 'blur'
  | 'gaussian_blur'
  | 'motion_blur'
  | 'glow'
  | 'sharpen'
  | 'vignette'
  | 'noise'
  | 'pixelate';

export interface ClipEffect {
  type: EffectType;
  intensity: number; // 0 to 100
}

export type TransitionType =
  | 'none'
  | 'fade'
  | 'dissolve'
  | 'wipe'
  | 'slide'
  | 'zoom'
  | 'push'
  | 'blur';

export interface ClipTransition {
  type: TransitionType;
  duration: number; // in seconds (e.g. 0.5s)
}

export interface ChromaKey {
  enabled: boolean;
  color: string; // Hex color e.g. '#00ff00'
  similarity: number; // 0 to 100
  smoothness: number; // 0 to 100
  spill: number; // 0 to 100
  edgeAdjustment: number; // -50 to 50
}

export interface TimelineClip {
  id: string;
  trackId: string;
  mediaId?: string; // Reference to MediaItem
  name: string;
  type: TrackType;
  startTime: number; // Position on timeline in seconds
  duration: number; // Duration on timeline in seconds
  trimStart: number; // Offset into original media file in seconds
  trimEnd: number; // Duration from trimStart in media
  speed: number; // Normal speed factor, e.g. 1.0
  speedCurve: SpeedCurvePoint[];
  speedCurvePreset: SpeedCurvePreset;
  slowMotion: SmoothSlowMotion;
  transform: ClipTransform;
  keyframes: Keyframe[];
  audio: ClipAudio;
  text?: ClipText;
  filter: FilterType;
  colorAdjust: ColorAdjustment;
  effect: ClipEffect;
  transition: ClipTransition;
  chromaKey: ChromaKey;
  isLocked?: boolean;
}

export interface SubtitleItem {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  positionY: number; // % from top (e.g. 85%)
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9' | 'custom';
export type ResolutionPreset = '720p' | '1080p' | '1440p' | '2K' | '4K' | 'custom';

export interface CanvasSettings {
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  width: number;
  height: number;
  backgroundColor: string;
}

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'mov';
  codec: 'h264' | 'h265' | 'vp9';
  resolution: '720p' | '1080p' | '2K' | '4K';
  fps: 24 | 25 | 30 | 50 | 60;
  quality: 'low' | 'medium' | 'high' | 'maximum';
  audioCodec: 'aac' | 'wav';
  customBitrate?: number; // kbps
  outputFilename: string;
}

export interface ProjectData {
  version: string;
  appName: string;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  canvas: CanvasSettings;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  media: MediaItem[];
  subtitles: SubtitleItem[];
  exportSettings: ExportSettings;
  duration: number;
}

export interface AppSettings {
  general: {
    autosaveInterval: number; // seconds
    defaultClipDuration: number; // seconds for images/text
    theme: 'dark' | 'light';
    snappingEnabled: boolean;
  };
  performance: {
    hardwareAcceleration: boolean;
    proxyMode: boolean;
    previewQuality: 'full' | 'half' | 'quarter';
    cacheLocation: string;
    cacheSizeLimitMB: number;
  };
  audio: {
    sampleRate: number;
    masterVolume: number;
  };
  export: {
    defaultFormat: 'mp4' | 'webm';
    defaultResolution: '1080p';
  };
}
