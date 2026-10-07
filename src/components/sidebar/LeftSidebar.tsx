import React, { useRef, useState } from 'react';
import {
  Film,
  Music,
  Type,
  Smile,
  Sparkles,
  SlidersHorizontal,
  MoveRight,
  Gauge,
  Palette,
  Maximize,
  Key,
  Subtitles,
  Upload,
  Plus,
  Trash2,
  Clock,
  HardDrive,
  Mic,
  Volume2,
  Check,
  Edit2
} from 'lucide-react';
import {
  AspectRatio,
  CanvasSettings,
  ColorAdjustment,
  FilterType,
  MediaItem,
  ResolutionPreset,
  SpeedCurvePreset,
  SubtitleItem,
  TimelineClip,
  TimelineTrack,
  TransitionType,
} from '../../types/editor';
import { formatBytes, formatDuration } from '../../utils/helpers';
import { parseSRT, exportSRT } from '../../utils/subtitleUtils';
import { ColorGradingWorkspace } from '../color/ColorGradingWorkspace';

export type SidebarTab =
  | 'media'
  | 'color'
  | 'audio'
  | 'text'
  | 'stickers'
  | 'effects'
  | 'filters'
  | 'transitions'
  | 'speed'
  | 'adjust'
  | 'canvas'
  | 'keyframes'
  | 'subtitles';

interface LeftSidebarProps {
  mediaList: MediaItem[];
  selectedClip: TimelineClip | null;
  canvasSettings: CanvasSettings;
  subtitles: SubtitleItem[];
  colorComparisonMode?: 'after' | 'before' | 'split';
  showScopes?: boolean;
  onImportFiles: (files: FileList | File[]) => void;
  onAddMediaToTimeline: (media: MediaItem) => void;
  onDeleteMedia: (mediaId: string) => void;
  onAddTextClip: (text: string, style?: Partial<TimelineClip['text']>) => void;
  onOpenVoiceOver: () => void;
  onApplyFilter: (filter: FilterType) => void;
  onApplyTransition: (transition: TransitionType) => void;
  onApplySpeedPreset: (speed: number) => void;
  onApplySpeedCurvePreset: (preset: SpeedCurvePreset) => void;
  onUpdateCanvas: (settings: Partial<CanvasSettings>) => void;
  onAddSubtitle: (text: string) => void;
  onImportSRT: (subtitles: SubtitleItem[]) => void;
  onExportSRT: () => void;
  onDeleteSubtitle: (id: string) => void;
  onUpdateColor?: (adj: ColorAdjustment) => void;
  onSetComparisonMode?: (mode: 'after' | 'before' | 'split') => void;
  onToggleScopes?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  mediaList,
  selectedClip,
  canvasSettings,
  subtitles,
  onImportFiles,
  onAddMediaToTimeline,
  onDeleteMedia,
  onAddTextClip,
  onOpenVoiceOver,
  onApplyFilter,
  onApplyTransition,
  onApplySpeedPreset,
  onApplySpeedCurvePreset,
  onUpdateCanvas,
  onAddSubtitle,
  onImportSRT,
  onExportSRT,
  onDeleteSubtitle,
  onUpdateColor,
  onSetComparisonMode,
  onToggleScopes,
  colorComparisonMode = 'after',
  showScopes = false,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('media');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [newSubText, setNewSubText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'media', label: 'Media', icon: <Film className="w-4 h-4" /> },
    { id: 'color', label: 'Color', icon: <Palette className="w-4 h-4 text-cyan-400" /> },
    { id: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
    { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
    { id: 'stickers', label: 'Stickers', icon: <Smile className="w-4 h-4" /> },
    { id: 'effects', label: 'Effects', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'filters', label: 'Filters', icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'transitions', label: 'Transitions', icon: <MoveRight className="w-4 h-4" /> },
    { id: 'speed', label: 'Speed', icon: <Gauge className="w-4 h-4" /> },
    { id: 'adjust', label: 'Adjust', icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'canvas', label: 'Canvas', icon: <Maximize className="w-4 h-4" /> },
    { id: 'keyframes', label: 'Keyframes', icon: <Key className="w-4 h-4" /> },
    { id: 'subtitles', label: 'Subtitles', icon: <Subtitles className="w-4 h-4" /> },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleSRTFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      const parsed = parseSRT(text);
      if (parsed.length > 0) {
        onImportSRT(parsed);
      }
      e.target.value = '';
    }
  };

  return (
    <div className="flex h-full bg-[#12161f] border-r border-[#1f2633] text-slate-300 select-none">
      {/* Tab Navigation Column */}
      <div className="w-16 bg-[#0e1117] border-r border-[#1a202c] flex flex-col items-center py-2 gap-1 shrink-0 overflow-y-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-13 h-12 rounded flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === tab.id
                ? 'bg-[#1e2532] text-cyan-400 border-l-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#151922]'
            }`}
            title={tab.label}
          >
            {tab.icon}
            <span className="text-[10px] tracking-tight font-medium leading-none">
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content Area of Selected Tab */}
      <div
        className={`${
          activeTab === 'color' ? 'w-96' : 'w-72'
        } bg-[#141822] flex flex-col h-full overflow-hidden transition-all duration-150`}
      >
        {/* MEDIA TAB */}
        {activeTab === 'media' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Project Media ({mediaList.length})
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,audio/*,image/*,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.aac,.m4a,.png,.jpg,.jpeg,.webp,.gif"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                isDraggingOver
                  ? 'border-cyan-400 bg-cyan-950/30'
                  : 'border-[#262f3f] hover:border-[#38455c] bg-[#11141c]'
              }`}
            >
              <Upload className="w-6 h-6 text-cyan-400" />
              <div className="text-center">
                <p className="text-xs font-medium text-slate-200">Drop media files here</p>
                <p className="text-[10px] text-slate-500 mt-0.5">MP4, MOV, WebM, MP3, WAV, PNG, JPG</p>
              </div>
            </div>

            {/* Media Items List */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
              {mediaList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No media imported yet. Click Import or drag videos/audio above.
                </div>
              ) : (
                mediaList.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-[#191f2b] hover:bg-[#202737] rounded border border-[#242c3c] flex gap-2 items-center group transition-colors"
                  >
                    {/* Thumbnail / Icon */}
                    <div className="w-14 h-10 bg-[#0e1117] rounded overflow-hidden flex items-center justify-center shrink-0 border border-[#2b3547]">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : item.type === 'audio' ? (
                        <Music className="w-5 h-5 text-purple-400" />
                      ) : (
                        <Film className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        {item.duration > 0 && <span>{formatDuration(item.duration)}</span>}
                        {item.width > 0 && (
                          <span>
                            {item.width}x{item.height}
                          </span>
                        )}
                        <span>{formatBytes(item.size)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onAddMediaToTimeline(item)}
                        className="p-1.5 hover:bg-cyan-600/30 text-cyan-400 rounded transition-colors"
                        title="Add to timeline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteMedia(item.id)}
                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                        title="Remove from project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* COLOR GRADING WORKSPACE TAB */}
        {activeTab === 'color' && (
          <ColorGradingWorkspace
            selectedClip={selectedClip}
            onUpdateColor={(adj) => onUpdateColor?.(adj)}
            colorComparisonMode={colorComparisonMode || 'after'}
            onSetComparisonMode={(mode) => onSetComparisonMode?.(mode)}
            showScopes={showScopes || false}
            onToggleScopes={() => onToggleScopes?.()}
          />
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Audio & Voiceover
            </span>

            {/* Voice-over Record button */}
            <button
              onClick={onOpenVoiceOver}
              className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg shadow-sm transition-all"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-semibold">Record Voice-Over</span>
            </button>

            <div className="text-[11px] text-slate-400 font-medium mt-2">Built-in Sound Effects</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Impact Boom', duration: '2.5s', freq: 80 },
                { name: 'Cinematic Rise', duration: '3.0s', freq: 440 },
                { name: 'Sub Bass Drop', duration: '2.0s', freq: 55 },
                { name: 'Digital Blip', duration: '0.4s', freq: 880 },
                { name: 'Whoosh Transition', duration: '1.2s', freq: 300 },
                { name: 'Camera Shutter', duration: '0.5s', freq: 1200 },
              ].map((sfx, i) => (
                <button
                  key={i}
                  onClick={() => {
                    // Create synthesis tone audio media
                    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(sfx.freq, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.5);
                    gain.gain.setValueAtTime(0.5, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 1.5);
                  }}
                  className="p-2.5 bg-[#191f2b] hover:bg-[#202737] border border-[#242c3c] rounded text-left transition-colors flex flex-col gap-1 group"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                    <span>{sfx.name}</span>
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <span className="text-[10px] text-slate-500">{sfx.duration}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Text & Titles
            </span>
            <div className="flex flex-col gap-2">
              {[
                { title: 'Default Heading', sample: 'Main Title', fontSize: 64, fontWeight: 'bold' as const },
                { title: 'Lower Third Subtitle', sample: 'Speaker Name & Role', fontSize: 40, fontWeight: '600' as const },
                { title: 'Cinematic Minimal', sample: 'Chapter One', fontSize: 48, fontWeight: 'normal' as const },
                { title: 'Bold Impact', sample: 'WATCH THIS', fontSize: 72, fontWeight: '800' as const },
                { title: 'Callout Annotation', sample: 'Important Note', fontSize: 32, fontWeight: '600' as const },
              ].map((tmpl, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#191f2b] hover:bg-[#202737] border border-[#242c3c] rounded flex items-center justify-between group transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-200">{tmpl.title}</p>
                    <p className="text-[11px] text-slate-500 italic mt-0.5">"{tmpl.sample}"</p>
                  </div>
                  <button
                    onClick={() =>
                      onAddTextClip(tmpl.sample, {
                        fontSize: tmpl.fontSize,
                        fontWeight: tmpl.fontWeight,
                      })
                    }
                    className="px-2.5 py-1 bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white rounded text-xs transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STICKERS TAB */}
        {activeTab === 'stickers' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Shapes & Graphic Overlays
            </span>
            <div className="grid grid-cols-2 gap-2">
              {['Subscribe Badge', 'Pointer Arrow', 'Highlight Box', 'Warning Icon', 'Checkmark Circle', 'Star Accent'].map(
                (badge, i) => (
                  <button
                    key={i}
                    onClick={() => onAddTextClip(`[ ${badge} ]`, { fontSize: 48 })}
                    className="p-3 bg-[#191f2b] hover:bg-[#202737] border border-[#242c3c] rounded text-center text-xs font-medium text-slate-200 transition-colors flex flex-col items-center gap-1.5"
                  >
                    <Smile className="w-5 h-5 text-amber-400" />
                    <span className="text-[11px]">{badge}</span>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* EFFECTS TAB */}
        {activeTab === 'effects' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Visual Effects
            </span>
            <div className="flex flex-col gap-2">
              {[
                { name: 'Gaussian Blur', desc: 'Soft progressive defocus' },
                { name: 'Motion Blur', desc: 'High velocity directional blur' },
                { name: 'Glow / Bloom', desc: 'Luminous light diffusion' },
                { name: 'Sharpen Edge', desc: 'Crisp micro-contrast enhance' },
                { name: 'Film Vignette', desc: 'Classic cinematic edge falloff' },
                { name: 'Pixelate 8-Bit', desc: 'Retro digital block mosaic' },
              ].map((eff, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-[#191f2b] border border-[#242c3c] rounded flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-200">{eff.name}</p>
                    <p className="text-[10px] text-slate-500">{eff.desc}</p>
                  </div>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
                    Clip Effect
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FILTERS TAB */}
        {activeTab === 'filters' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Color Filters
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  'original',
                  'warm',
                  'cool',
                  'cinema',
                  'vintage',
                  'bw',
                  'contrast',
                  'bright',
                  'dark',
                  'sharp',
                  'soft',
                ] as FilterType[]
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => onApplyFilter(f)}
                  className={`p-2.5 rounded border text-left transition-colors flex flex-col gap-1.5 ${
                    selectedClip?.filter === f
                      ? 'border-cyan-400 bg-cyan-950/30 text-white'
                      : 'border-[#242c3c] bg-[#191f2b] hover:bg-[#202737] text-slate-300'
                  }`}
                >
                  <div
                    className="w-full h-10 rounded border border-[#2e3747] flex items-center justify-center text-[10px] uppercase font-bold"
                    style={{
                      background:
                        f === 'warm'
                          ? 'linear-gradient(45deg, #78350f, #f59e0b)'
                          : f === 'cool'
                          ? 'linear-gradient(45deg, #0c4a6e, #38bdf8)'
                          : f === 'bw'
                          ? 'linear-gradient(45deg, #18181b, #a1a1aa)'
                          : f === 'cinema'
                          ? 'linear-gradient(45deg, #022c22, #0d9488)'
                          : 'linear-gradient(45deg, #1e293b, #475569)',
                    }}
                  >
                    Preview
                  </div>
                  <span className="text-xs capitalize font-medium">{f}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TRANSITIONS TAB */}
        {activeTab === 'transitions' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Transitions
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['fade', 'dissolve', 'wipe', 'slide', 'zoom', 'push', 'blur'] as TransitionType[]).map(
                (tr) => (
                  <button
                    key={tr}
                    onClick={() => onApplyTransition(tr)}
                    className="p-2.5 bg-[#191f2b] hover:bg-[#202737] border border-[#242c3c] rounded text-left transition-colors flex flex-col gap-1"
                  >
                    <span className="text-xs font-medium text-slate-200 capitalize">{tr}</span>
                    <span className="text-[10px] text-slate-500">Duration 0.5s</span>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* SPEED TAB */}
        {activeTab === 'speed' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Speed & Curve Presets
            </span>
            <div className="text-[11px] text-slate-400 font-medium">Standard Speed Multipliers</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4, 8, 10, 20].map((s) => (
                <button
                  key={s}
                  onClick={() => onApplySpeedPreset(s)}
                  className={`py-1.5 text-xs rounded border transition-colors ${
                    selectedClip?.speed === s
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                      : 'border-[#262e3d] bg-[#191f2b] hover:bg-[#222a3a] text-slate-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 font-medium mt-3">Speed Curve Presets</div>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { id: 'montage', label: 'Montage', desc: 'Fast ramp to beat' },
                  { id: 'bullet', label: 'Bullet Time', desc: 'Extreme slow-mo focal point' },
                  { id: 'hero', label: 'Hero Moment', desc: 'Slow-motion impact surge' },
                  { id: 'jump_cut', label: 'Jump Cut', desc: 'High velocity snips' },
                  { id: 'slow_fast', label: 'Slow → Fast', desc: 'Building acceleration' },
                  { id: 'fast_slow', label: 'Fast → Slow', desc: 'Dynamic deceleration' },
                ] as { id: SpeedCurvePreset; label: string; desc: string }[]
              ).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onApplySpeedCurvePreset(preset.id)}
                  className="p-2 bg-[#191f2b] hover:bg-[#202737] border border-[#242c3c] rounded text-left transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-200">{preset.label}</p>
                    <p className="text-[10px] text-slate-500">{preset.desc}</p>
                  </div>
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ADJUST TAB */}
        {activeTab === 'adjust' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Color Grading Guide
            </span>
            <div className="p-3 bg-[#191f2b] rounded border border-[#242c3c] text-xs text-slate-300 flex flex-col gap-2">
              <p>Select any clip on the timeline to unlock full Color Adjustments in the Inspector panel:</p>
              <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1">
                <li>Brightness & Contrast</li>
                <li>Saturation & Exposure</li>
                <li>Temperature & Tint</li>
                <li>Highlights & Shadows</li>
                <li>Sharpness & Vignette</li>
              </ul>
            </div>
          </div>
        )}

        {/* CANVAS TAB */}
        {activeTab === 'canvas' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Aspect Ratio & Resolution
            </span>

            <div className="text-[11px] text-slate-400 font-medium">Aspect Ratio</div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: '16:9', label: '16:9 YouTube / Desktop' },
                  { id: '9:16', label: '9:16 TikTok / Reels / Shorts' },
                  { id: '1:1', label: '1:1 Instagram Square' },
                  { id: '4:5', label: '4:5 Portrait Feed' },
                  { id: '4:3', label: '4:3 Classic TV' },
                  { id: '21:9', label: '21:9 Ultra-Wide Cinema' },
                ] as { id: AspectRatio; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onUpdateCanvas({ aspectRatio: item.id })}
                  className={`p-2.5 rounded border text-left transition-colors ${
                    canvasSettings.aspectRatio === item.id
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                      : 'border-[#242c3c] bg-[#191f2b] hover:bg-[#202737] text-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold">{item.id}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 font-medium mt-2">Resolution Preset</div>
            <div className="grid grid-cols-3 gap-2">
              {(['720p', '1080p', '1440p', '2K', '4K'] as ResolutionPreset[]).map((res) => (
                <button
                  key={res}
                  onClick={() => onUpdateCanvas({ resolution: res })}
                  className={`py-1.5 text-xs rounded border transition-colors ${
                    canvasSettings.resolution === res
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                      : 'border-[#242c3c] bg-[#191f2b] hover:bg-[#202737] text-slate-300'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KEYFRAMES TAB */}
        {activeTab === 'keyframes' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Keyframing System
            </span>
            <div className="p-3 bg-[#191f2b] rounded border border-[#242c3c] text-xs text-slate-300 flex flex-col gap-2">
              <p>Keyframes allow you to animate any property smoothly over time:</p>
              <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1">
                <li>Position X & Position Y</li>
                <li>Scale (Zoom In / Out)</li>
                <li>Rotation (Spin angles)</li>
                <li>Opacity (Fade In / Out)</li>
                <li>Blur intensity</li>
              </ul>
              <p className="text-[11px] text-cyan-400 mt-1">
                Select a clip on the timeline and toggle the diamond keyframe icons in the Inspector!
              </p>
            </div>
          </div>
        )}

        {/* SUBTITLES TAB */}
        {activeTab === 'subtitles' && (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Subtitles ({subtitles.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => srtInputRef.current?.click()}
                  className="px-2 py-0.5 bg-[#1f2635] hover:bg-[#2a3449] text-xs rounded text-slate-300"
                  title="Import .srt file"
                >
                  Import SRT
                </button>
                <button
                  onClick={onExportSRT}
                  disabled={subtitles.length === 0}
                  className="px-2 py-0.5 bg-[#1f2635] hover:bg-[#2a3449] text-xs rounded text-slate-300 disabled:opacity-40"
                  title="Export .srt file"
                >
                  Export SRT
                </button>
                <input
                  ref={srtInputRef}
                  type="file"
                  accept=".srt"
                  onChange={handleSRTFileInput}
                  className="hidden"
                />
              </div>
            </div>

            {/* Quick Add Subtitle */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter subtitle caption..."
                value={newSubText}
                onChange={(e) => setNewSubText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSubText.trim()) {
                    onAddSubtitle(newSubText.trim());
                    setNewSubText('');
                  }
                }}
                className="flex-1 bg-[#191f2b] border border-[#283244] rounded px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => {
                  if (newSubText.trim()) {
                    onAddSubtitle(newSubText.trim());
                    setNewSubText('');
                  }
                }}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs"
              >
                Add
              </button>
            </div>

            {/* Subtitle List */}
            <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
              {subtitles.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No subtitles added yet. Type a caption above or import an SRT file.
                </div>
              ) : (
                subtitles.map((sub, i) => (
                  <div
                    key={sub.id}
                    className="p-2 bg-[#191f2b] border border-[#242c3c] rounded flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-slate-200 truncate">{sub.text}</p>
                      <p className="text-[10px] text-cyan-400 mt-0.5">
                        {formatDuration(sub.startTime)} → {formatDuration(sub.endTime)}
                      </p>
                    </div>
                    <button
                      onClick={() => onDeleteSubtitle(sub.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
