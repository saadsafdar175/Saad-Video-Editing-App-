import { CanvasSettings, ExportSettings, AppSettings, ProjectData, TimelineTrack } from '../types/editor';

export const APP_NAME = "Saad Video Studio";
export const APP_VERSION = "1.0.0";
export const PROJECT_FILE_EXTENSION = ".saadvideo";

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  aspectRatio: '16:9',
  resolution: '1080p',
  width: 1920,
  height: 1080,
  backgroundColor: '#000000',
};

export const RESOLUTION_MAP: Record<string, Record<string, { width: number; height: number }>> = {
  '16:9': {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '1440p': { width: 2560, height: 1440 },
    '2K': { width: 2560, height: 1440 },
    '4K': { width: 3840, height: 2160 },
    'custom': { width: 1920, height: 1080 },
  },
  '9:16': {
    '720p': { width: 720, height: 1280 },
    '1080p': { width: 1080, height: 1920 },
    '1440p': { width: 1440, height: 2560 },
    '2K': { width: 1440, height: 2560 },
    '4K': { width: 2160, height: 3840 },
    'custom': { width: 1080, height: 1920 },
  },
  '1:1': {
    '720p': { width: 720, height: 720 },
    '1080p': { width: 1080, height: 1080 },
    '1440p': { width: 1440, height: 1440 },
    '2K': { width: 1440, height: 1440 },
    '4K': { width: 2160, height: 2160 },
    'custom': { width: 1080, height: 1080 },
  },
  '4:5': {
    '720p': { width: 720, height: 900 },
    '1080p': { width: 1080, height: 1350 },
    '1440p': { width: 1440, height: 1800 },
    '2K': { width: 1440, height: 1800 },
    '4K': { width: 2160, height: 2700 },
    'custom': { width: 1080, height: 1350 },
  },
  '4:3': {
    '720p': { width: 960, height: 720 },
    '1080p': { width: 1440, height: 1080 },
    '1440p': { width: 1920, height: 1440 },
    '2K': { width: 1920, height: 1440 },
    '4K': { width: 2880, height: 2160 },
    'custom': { width: 1440, height: 1080 },
  },
  '21:9': {
    '720p': { width: 1680, height: 720 },
    '1080p': { width: 2560, height: 1080 },
    '1440p': { width: 3440, height: 1440 },
    '2K': { width: 3440, height: 1440 },
    '4K': { width: 5120, height: 2160 },
    'custom': { width: 2560, height: 1080 },
  },
};

export const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'track-text-1', name: 'Text 1', type: 'text', isMuted: false, isHidden: false, isLocked: false, order: 0 },
  { id: 'track-overlay-1', name: 'Overlay 1', type: 'overlay', isMuted: false, isHidden: false, isLocked: false, order: 1 },
  { id: 'track-video-1', name: 'Main Video', type: 'video', isMuted: false, isHidden: false, isLocked: false, order: 2 },
  { id: 'track-audio-1', name: 'Audio 1', type: 'audio', isMuted: false, isHidden: false, isLocked: false, order: 3 },
  { id: 'track-audio-2', name: 'Voiceover', type: 'audio', isMuted: false, isHidden: false, isLocked: false, order: 4 },
];

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'mp4',
  codec: 'h264',
  resolution: '1080p',
  fps: 30,
  quality: 'high',
  audioCodec: 'aac',
  outputFilename: 'SaadVideo_Export',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  general: {
    autosaveInterval: 10,
    defaultClipDuration: 5,
    theme: 'dark',
    snappingEnabled: true,
  },
  performance: {
    hardwareAcceleration: true,
    proxyMode: false,
    previewQuality: 'full',
    cacheLocation: 'C:\\Users\\Default\\AppData\\Local\\SaadVideoStudio\\Cache',
    cacheSizeLimitMB: 2048,
  },
  audio: {
    sampleRate: 48000,
    masterVolume: 1.0,
  },
  export: {
    defaultFormat: 'mp4',
    defaultResolution: '1080p',
  },
};

export function createEmptyProject(projectName: string = "Untitled Project"): ProjectData {
  return {
    version: APP_VERSION,
    appName: APP_NAME,
    id: `project-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: projectName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    canvas: { ...DEFAULT_CANVAS_SETTINGS },
    tracks: JSON.parse(JSON.stringify(DEFAULT_TRACKS)),
    clips: [],
    media: [],
    subtitles: [],
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS, outputFilename: projectName.replace(/\s+/g, '_') },
    duration: 30, // Default 30s workspace timeline span
  };
}
