import React, { useState } from 'react';
import {
  Sliders,
  Gauge,
  Key,
  Volume2,
  Palette,
  Sparkles,
  Layers,
  Type,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  Check,
  MoveRight
} from 'lucide-react';
import {
  CanvasSettings,
  ChromaKey,
  ClipTransform,
  ColorAdjustment,
  EffectType,
  FilterType,
  Keyframe,
  SpeedCurvePoint,
  SpeedCurvePreset,
  TimelineClip,
  TransitionType,
} from '../../types/editor';
import { getDefaultColorAdjustment } from '../../utils/colorGradingPresets';

interface InspectorPanelProps {
  selectedClip: TimelineClip | null;
  canvasSettings: CanvasSettings;
  currentTime: number;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onUpdateCanvas: (updates: Partial<CanvasSettings>) => void;
  onDuplicateClip?: (clipId: string) => void;
  onDeleteClip?: (clipId: string) => void;
}

export type InspectorTab =
  | 'transform'
  | 'speed'
  | 'keyframes'
  | 'audio'
  | 'color'
  | 'effects'
  | 'chroma'
  | 'text'
  | 'transition';

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedClip,
  canvasSettings,
  currentTime,
  onUpdateClip,
  onUpdateCanvas,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('transform');

  if (!selectedClip) {
    return (
      <aside className="w-80 bg-[#121620] border-l border-[#1f2633] p-4 text-slate-300 flex flex-col gap-4 select-none">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1f2633]">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-xs uppercase tracking-wider text-slate-300">
            Project Properties
          </span>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          <div>
            <label className="text-slate-400 text-[11px] block mb-1">Canvas Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['16:9', '9:16', '1:1', '4:5', '4:3', '21:9'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onUpdateCanvas({ aspectRatio: r })}
                  className={`py-1 rounded border text-xs transition-colors ${
                    canvasSettings.aspectRatio === r
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-semibold'
                      : 'border-[#242c3c] bg-[#181d27] hover:bg-[#202735] text-slate-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-[11px] block mb-1">Canvas Resolution</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['720p', '1080p', '1440p', '2K', '4K'] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => onUpdateCanvas({ resolution: res })}
                  className={`py-1 rounded border text-xs transition-colors ${
                    canvasSettings.resolution === res
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-semibold'
                      : 'border-[#242c3c] bg-[#181d27] hover:bg-[#202735] text-slate-300'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 bg-[#171c26] rounded-lg border border-[#232a38] text-slate-400 text-xs">
            <p className="font-medium text-slate-300 mb-1">No Clip Selected</p>
            <p className="text-[11px] leading-relaxed">
              Click any video, audio, or text clip on the timeline to edit its transforms, speed curves, keyframes, chroma key, color adjustments, and effects.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const isTextClip = selectedClip.type === 'text';

  // Helper updates
  const updateTransform = (t: Partial<ClipTransform>) => {
    onUpdateClip(selectedClip.id, {
      transform: { ...selectedClip.transform, ...t },
    });
  };

  const updateColor = (c: Partial<ColorAdjustment>) => {
    onUpdateClip(selectedClip.id, {
      colorAdjust: { ...selectedClip.colorAdjust, ...c },
    });
  };

  const updateChroma = (ch: Partial<ChromaKey>) => {
    onUpdateClip(selectedClip.id, {
      chromaKey: { ...selectedClip.chromaKey, ...ch },
    });
  };

  return (
    <aside className="w-80 bg-[#121620] border-l border-[#1f2633] flex flex-col h-full text-slate-300 select-none">
      {/* Header with clip name */}
      <div className="p-3 border-b border-[#1f2633] flex items-center justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs font-bold text-white truncate">{selectedClip.name}</p>
          <p className="text-[10px] text-cyan-400 uppercase tracking-wider mt-0.5">
            {selectedClip.type} Clip
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1f2633] bg-[#0e1117] overflow-x-auto text-xs">
        {[
          { id: 'transform', label: 'Transform' },
          { id: 'speed', label: 'Speed' },
          { id: 'keyframes', label: 'Keyframes' },
          { id: 'audio', label: 'Audio' },
          { id: 'color', label: 'Color' },
          { id: 'effects', label: 'Effects' },
          { id: 'chroma', label: 'Chroma' },
          ...(isTextClip ? [{ id: 'text', label: 'Text' }] : []),
          { id: 'transition', label: 'Transition' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as InspectorTab)}
            className={`px-3 py-2 shrink-0 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-400 bg-[#151924]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {/* TRANSFORM TAB */}
        {activeTab === 'transform' && (
          <div className="flex flex-col gap-3">
            {/* Position X & Y */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Position X / Y</span>
                <span className="font-mono text-cyan-400">
                  {selectedClip.transform.positionX}% · {selectedClip.transform.positionY}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.transform.positionX}
                  onChange={(e) => updateTransform({ positionX: Number(e.target.value) })}
                  className="accent-cyan-400"
                />
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.transform.positionY}
                  onChange={(e) => updateTransform({ positionY: Number(e.target.value) })}
                  className="accent-cyan-400"
                />
              </div>
            </div>

            {/* Scale */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Scale</span>
                <span className="font-mono text-cyan-400">
                  {Math.round(selectedClip.transform.scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                value={Math.round(selectedClip.transform.scale * 100)}
                onChange={(e) => updateTransform({ scale: Number(e.target.value) / 100 })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Rotation</span>
                <span className="font-mono text-cyan-400">{selectedClip.transform.rotation}°</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={selectedClip.transform.rotation}
                  onChange={(e) => updateTransform({ rotation: Number(e.target.value) })}
                  className="flex-1 accent-cyan-400"
                />
                <button
                  onClick={() =>
                    updateTransform({
                      rotation: (selectedClip.transform.rotation + 90) % 360,
                    })
                  }
                  className="p-1 bg-[#191f2b] hover:bg-[#232b3b] border border-[#27303f] rounded text-slate-300"
                  title="Rotate +90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Flip Horizontal / Vertical */}
            <div>
              <span className="text-slate-400 block mb-1">Flip & Mirror</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateTransform({ flipH: !selectedClip.transform.flipH })}
                  className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1.5 transition-colors ${
                    selectedClip.transform.flipH
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                      : 'border-[#242c3c] bg-[#191f2b] text-slate-300'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip Horizontal</span>
                </button>
                <button
                  onClick={() => updateTransform({ flipV: !selectedClip.transform.flipV })}
                  className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1.5 transition-colors ${
                    selectedClip.transform.flipV
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                      : 'border-[#242c3c] bg-[#191f2b] text-slate-300'
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>Flip Vertical</span>
                </button>
              </div>
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Opacity</span>
                <span className="font-mono text-cyan-400">
                  {Math.round(selectedClip.transform.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(selectedClip.transform.opacity * 100)}
                onChange={(e) => updateTransform({ opacity: Number(e.target.value) / 100 })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Crop Controls */}
            <div className="border-t border-[#1f2633] pt-3">
              <span className="text-slate-400 font-medium block mb-2">Crop (% Edges)</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Top</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selectedClip.transform.crop.top}
                    onChange={(e) =>
                      updateTransform({
                        crop: { ...selectedClip.transform.crop, top: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <span className="text-slate-500">Bottom</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selectedClip.transform.crop.bottom}
                    onChange={(e) =>
                      updateTransform({
                        crop: { ...selectedClip.transform.crop, bottom: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <span className="text-slate-500">Left</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selectedClip.transform.crop.left}
                    onChange={(e) =>
                      updateTransform({
                        crop: { ...selectedClip.transform.crop, left: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <span className="text-slate-500">Right</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selectedClip.transform.crop.right}
                    onChange={(e) =>
                      updateTransform({
                        crop: { ...selectedClip.transform.crop, right: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Reset Transform button */}
            <button
              onClick={() =>
                updateTransform({
                  positionX: 0,
                  positionY: 0,
                  scale: 1.0,
                  rotation: 0,
                  flipH: false,
                  flipV: false,
                  opacity: 1.0,
                  crop: { top: 0, bottom: 0, left: 0, right: 0 },
                })
              }
              className="mt-2 py-1.5 px-3 bg-[#1a202c] hover:bg-[#222a3a] border border-[#283244] rounded text-slate-300 text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Transform</span>
            </button>
          </div>
        )}

        {/* SPEED TAB */}
        {activeTab === 'speed' && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Playback Speed</span>
                <span className="font-mono text-cyan-400">{selectedClip.speed}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={selectedClip.speed}
                onChange={(e) =>
                  onUpdateClip(selectedClip.id, { speed: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Speed Graph / Curve Visual Editor */}
            <div className="border border-[#222938] bg-[#0d1016] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 font-semibold text-xs">Speed Curve Editor</span>
                <span className="text-[10px] text-cyan-400 font-mono">Time → Speed ↑</span>
              </div>

              {/* Interactive Curve SVG Display */}
              <div className="w-full h-28 bg-[#090b0f] rounded border border-[#1d232e] relative overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full p-2">
                  {/* Grid lines */}
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1c2330" strokeDasharray="2,2" />
                  {/* Render Curve line */}
                  <polyline
                    fill="none"
                    stroke="#00e5ff"
                    strokeWidth="2.5"
                    points={selectedClip.speedCurve
                      .map((p) => {
                        const x = p.time * 240;
                        const y = 80 - (Math.min(4, p.speed) / 4) * 60;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                  {/* Control Points */}
                  {selectedClip.speedCurve.map((p) => {
                    const cx = p.time * 240;
                    const cy = 80 - (Math.min(4, p.speed) / 4) * 60;
                    return (
                      <circle
                        key={p.id}
                        cx={cx}
                        cy={cy}
                        r="5"
                        fill="#00e5ff"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-pointer"
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Curve Presets */}
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {(['montage', 'bullet', 'hero', 'jump_cut', 'slow_fast', 'fast_slow'] as SpeedCurvePreset[]).map(
                  (pst) => (
                    <button
                      key={pst}
                      onClick={() => {
                        let pts: SpeedCurvePoint[] = [];
                        if (pst === 'bullet') {
                          pts = [
                            { id: '1', time: 0, speed: 2.5 },
                            { id: '2', time: 0.35, speed: 0.3 },
                            { id: '3', time: 0.65, speed: 0.3 },
                            { id: '4', time: 1, speed: 2.5 },
                          ];
                        } else if (pst === 'hero') {
                          pts = [
                            { id: '1', time: 0, speed: 1.0 },
                            { id: '2', time: 0.5, speed: 0.4 },
                            { id: '3', time: 1, speed: 2.0 },
                          ];
                        } else if (pst === 'slow_fast') {
                          pts = [
                            { id: '1', time: 0, speed: 0.3 },
                            { id: '2', time: 1, speed: 3.0 },
                          ];
                        } else {
                          pts = [
                            { id: '1', time: 0, speed: 3.0 },
                            { id: '2', time: 1, speed: 0.3 },
                          ];
                        }
                        onUpdateClip(selectedClip.id, {
                          speedCurve: pts,
                          speedCurvePreset: pst,
                        });
                      }}
                      className="py-1 text-[10px] bg-[#171d28] hover:bg-[#202735] border border-[#242b38] rounded text-slate-300 capitalize"
                    >
                      {pst.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Smooth Slow Motion */}
            <div className="border border-[#222938] bg-[#0d1016] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 font-semibold text-xs">Smooth Slow Motion</span>
                <input
                  type="checkbox"
                  checked={selectedClip.slowMotion.enabled}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, {
                      slowMotion: { ...selectedClip.slowMotion, enabled: e.target.checked },
                    })
                  }
                  className="accent-cyan-400"
                />
              </div>

              {selectedClip.slowMotion.enabled && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="text-[11px] text-slate-400">Interpolation Mode</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['normal', 'blend', 'optical'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() =>
                          onUpdateClip(selectedClip.id, {
                            slowMotion: { ...selectedClip.slowMotion, mode: m },
                          })
                        }
                        className={`py-1 rounded text-[10px] border capitalize ${
                          selectedClip.slowMotion.mode === m
                            ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                            : 'border-[#222938] bg-[#141822] text-slate-400'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1">Slow Motion Rate</div>
                  <div className="grid grid-cols-5 gap-1">
                    {[0.25, 0.4, 0.5, 0.6, 0.75].map((rate) => (
                      <button
                        key={rate}
                        onClick={() =>
                          onUpdateClip(selectedClip.id, {
                            slowMotion: { ...selectedClip.slowMotion, rate },
                          })
                        }
                        className={`py-1 rounded text-[10px] border ${
                          selectedClip.slowMotion.rate === rate
                            ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                            : 'border-[#222938] bg-[#141822] text-slate-400'
                        }`}
                      >
                        {rate * 100}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KEYFRAMES TAB */}
        {activeTab === 'keyframes' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold text-xs">
                Keyframes ({selectedClip.keyframes.length})
              </span>
              <button
                onClick={() => {
                  const clipOffset = Math.max(0, currentTime - selectedClip.startTime);
                  const newKf: Keyframe = {
                    id: `kf-${Date.now()}`,
                    timeOffset: clipOffset,
                    properties: {
                      positionX: selectedClip.transform.positionX,
                      positionY: selectedClip.transform.positionY,
                      scale: selectedClip.transform.scale,
                      rotation: selectedClip.transform.rotation,
                      opacity: selectedClip.transform.opacity,
                    },
                    interpolation: 'linear',
                  };
                  onUpdateClip(selectedClip.id, {
                    keyframes: [...selectedClip.keyframes, newKf],
                  });
                }}
                className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Keyframe</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {selectedClip.keyframes.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No keyframes on this clip yet. Seek to a playhead time and click "Add Keyframe".
                </div>
              ) : (
                selectedClip.keyframes.map((kf, i) => (
                  <div
                    key={kf.id}
                    className="p-2 bg-[#171d28] border border-[#232a38] rounded flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono text-cyan-400">
                        {kf.timeOffset.toFixed(2)}s
                      </span>
                      <span className="text-slate-400 text-[10px] ml-2">
                        Scale: {Math.round((kf.properties.scale || 1) * 100)}%
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        onUpdateClip(selectedClip.id, {
                          keyframes: selectedClip.keyframes.filter((k) => k.id !== kf.id),
                        })
                      }
                      className="p-1 hover:text-red-400 text-slate-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Volume</span>
                <span className="font-mono text-cyan-400">
                  {Math.round(selectedClip.audio.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={Math.round(selectedClip.audio.volume * 100)}
                onChange={(e) =>
                  onUpdateClip(selectedClip.id, {
                    audio: { ...selectedClip.audio, volume: Number(e.target.value) / 100 },
                  })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 text-[11px] block mb-1">Fade In (sec)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={selectedClip.audio.fadeIn}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, {
                      audio: { ...selectedClip.audio, fadeIn: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-[#171d28] border border-[#232a38] rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block mb-1">Fade Out (sec)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={selectedClip.audio.fadeOut}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, {
                      audio: { ...selectedClip.audio, fadeOut: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-[#171d28] border border-[#232a38] rounded px-2 py-1 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-300">Mute Audio</span>
              <input
                type="checkbox"
                checked={selectedClip.audio.isMuted}
                onChange={(e) =>
                  onUpdateClip(selectedClip.id, {
                    audio: { ...selectedClip.audio, isMuted: e.target.checked },
                  })
                }
                className="accent-cyan-400"
              />
            </div>
          </div>
        )}

        {/* COLOR TAB */}
        {activeTab === 'color' && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Color Adjustments</span>
              <button
                onClick={() =>
                  onUpdateClip(selectedClip.id, {
                    colorAdjust: getDefaultColorAdjustment(),
                    filter: 'original',
                  })
                }
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Reset
              </button>
            </div>

            {[
              { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
              { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
              { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
              { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
              { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
              { key: 'whites', label: 'Whites', min: -100, max: 100 },
              { key: 'blacks', label: 'Blacks', min: -100, max: 100 },
              { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
              { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
              { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
              { key: 'tint', label: 'Tint', min: -100, max: 100 },
              { key: 'fade', label: 'Fade', min: 0, max: 100 },
              { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
            ].map((adjItem) => (
              <div key={adjItem.key}>
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>{adjItem.label}</span>
                  <span className="font-mono text-cyan-400">
                    {(selectedClip.colorAdjust as unknown as Record<string, number>)[adjItem.key] ?? 0}
                  </span>
                </div>
                <input
                  type="range"
                  min={adjItem.min}
                  max={adjItem.max}
                  value={(selectedClip.colorAdjust as unknown as Record<string, number>)[adjItem.key] ?? 0}
                  onChange={(e) => updateColor({ [adjItem.key]: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>
            ))}
          </div>
        )}

        {/* EFFECTS TAB */}
        {activeTab === 'effects' && (
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-slate-400 text-[11px] block mb-1">Effect Type</span>
              <select
                value={selectedClip.effect.type}
                onChange={(e) =>
                  onUpdateClip(selectedClip.id, {
                    effect: { ...selectedClip.effect, type: e.target.value as EffectType },
                  })
                }
                className="w-full bg-[#171d28] border border-[#232a38] rounded p-1.5 text-xs text-white"
              >
                <option value="none">None</option>
                <option value="blur">Blur</option>
                <option value="gaussian_blur">Gaussian Blur</option>
                <option value="motion_blur">Motion Blur</option>
                <option value="glow">Glow / Bloom</option>
                <option value="pixelate">Pixelate Mosaic</option>
              </select>
            </div>

            {selectedClip.effect.type !== 'none' && (
              <div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>Intensity</span>
                  <span className="font-mono text-cyan-400">{selectedClip.effect.intensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedClip.effect.intensity}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, {
                      effect: { ...selectedClip.effect, intensity: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
            )}
          </div>
        )}

        {/* CHROMA KEY TAB */}
        {activeTab === 'chroma' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold text-xs">Enable Chroma Key</span>
              <input
                type="checkbox"
                checked={selectedClip.chromaKey.enabled}
                onChange={(e) => updateChroma({ enabled: e.target.checked })}
                className="accent-cyan-400"
              />
            </div>

            {selectedClip.chromaKey.enabled && (
              <div className="flex flex-col gap-3 mt-1">
                <div>
                  <span className="text-slate-400 text-[11px] block mb-1">Key Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedClip.chromaKey.color}
                      onChange={(e) => updateChroma({ color: e.target.value })}
                      className="w-8 h-8 rounded border border-[#283244] bg-transparent cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateChroma({ color: '#00ff00' })}
                        className="px-2 py-1 bg-green-600/30 text-green-300 rounded text-[11px]"
                      >
                        Green
                      </button>
                      <button
                        onClick={() => updateChroma({ color: '#0000ff' })}
                        className="px-2 py-1 bg-blue-600/30 text-blue-300 rounded text-[11px]"
                      >
                        Blue
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Similarity</span>
                    <span className="font-mono text-cyan-400">
                      {selectedClip.chromaKey.similarity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedClip.chromaKey.similarity}
                    onChange={(e) => updateChroma({ similarity: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Smoothness</span>
                    <span className="font-mono text-cyan-400">
                      {selectedClip.chromaKey.smoothness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedClip.chromaKey.smoothness}
                    onChange={(e) => updateChroma({ smoothness: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Spill Reduction</span>
                    <span className="font-mono text-cyan-400">
                      {selectedClip.chromaKey.spill}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedClip.chromaKey.spill}
                    onChange={(e) => updateChroma({ spill: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TEXT TAB (for text clips) */}
        {activeTab === 'text' && selectedClip.text && (
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-slate-400 text-[11px] block mb-1">Text Content</span>
              <textarea
                rows={3}
                value={selectedClip.text.content}
                onChange={(e) =>
                  onUpdateClip(selectedClip.id, {
                    text: { ...selectedClip.text!, content: e.target.value },
                    name: e.target.value.substring(0, 20) || 'Text',
                  })
                }
                className="w-full bg-[#171d28] border border-[#232a38] rounded p-2 text-xs text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 text-[11px] block mb-1">Font Size</span>
                <input
                  type="number"
                  min="12"
                  max="200"
                  value={selectedClip.text.fontSize}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, {
                      text: { ...selectedClip.text!, fontSize: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-[#171d28] border border-[#232a38] rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block mb-1">Text Color</span>
                <input
                  type="color"
                  value={selectedClip.text.color}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, {
                      text: { ...selectedClip.text!, color: e.target.value },
                    })
                  }
                  className="w-full h-7 bg-transparent rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TRANSITION TAB */}
        {activeTab === 'transition' && (
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-slate-400 text-[11px] block mb-1">Transition Type</span>
              <select
                value={selectedClip.transition.type}
                onChange={(e) =>
                  onUpdateClip(selectedClip.id, {
                    transition: {
                      ...selectedClip.transition,
                      type: e.target.value as TransitionType,
                    },
                  })
                }
                className="w-full bg-[#171d28] border border-[#232a38] rounded p-1.5 text-xs text-white capitalize"
              >
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="dissolve">Dissolve</option>
                <option value="wipe">Wipe</option>
                <option value="slide">Slide</option>
                <option value="zoom">Zoom</option>
                <option value="push">Push</option>
                <option value="blur">Blur</option>
              </select>
            </div>

            {selectedClip.transition.type !== 'none' && (
              <div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>Duration</span>
                  <span className="font-mono text-cyan-400">
                    {selectedClip.transition.duration}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.5"
                  step="0.1"
                  value={selectedClip.transition.duration}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, {
                      transition: {
                        ...selectedClip.transition,
                        duration: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
