import React, { useRef, useState } from 'react';
import {
  Sliders,
  Palette,
  TrendingUp,
  FileCode,
  Sparkles,
  Film,
  Activity,
  RotateCcw,
  Upload,
  Check,
  Eye,
  Columns,
  Layers,
  Shield,
  Trash2
} from 'lucide-react';
import {
  ColorAdjustment,
  TimelineClip,
} from '../../types/editor';
import { CINEMATIC_PRESETS, getDefaultColorAdjustment } from '../../utils/colorGradingPresets';
import { generateProceduralLUT, parseCubeLUT } from '../../engine/lutParser';
import { ColorWheel } from './ColorWheel';
import { ColorCurvesPanel } from './ColorCurvesPanel';

interface ColorGradingWorkspaceProps {
  selectedClip: TimelineClip | null;
  onUpdateColor: (adj: ColorAdjustment) => void;
  colorComparisonMode: 'after' | 'before' | 'split';
  onSetComparisonMode: (mode: 'after' | 'before' | 'split') => void;
  showScopes: boolean;
  onToggleScopes: () => void;
}

export type ColorTab =
  | 'basic'
  | 'wheels'
  | 'curves'
  | 'lut'
  | 'cinematic'
  | 'film'
  | 'scopes';

export const ColorGradingWorkspace: React.FC<ColorGradingWorkspaceProps> = ({
  selectedClip,
  onUpdateColor,
  colorComparisonMode,
  onSetComparisonMode,
  showScopes,
  onToggleScopes,
}) => {
  const [activeTab, setActiveTab] = useState<ColorTab>('basic');
  const lutInputRef = useRef<HTMLInputElement>(null);

  const adj: ColorAdjustment = selectedClip?.colorAdjust || getDefaultColorAdjustment();

  const updateAdj = (partial: Partial<ColorAdjustment>) => {
    onUpdateColor({ ...adj, ...partial });
  };

  const resetField = (key: keyof ColorAdjustment) => {
    const defaultVal = (getDefaultColorAdjustment() as unknown as Record<string, unknown>)[key];
    updateAdj({ [key]: defaultVal });
  };

  const handleImportCubeLUT = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      try {
        const parsed = parseCubeLUT(text);
        updateAdj({
          lut: {
            name: parsed.title || file.name.replace('.cube', ''),
            enabled: true,
            intensity: 100,
            size: parsed.size,
            data: parsed.data,
            rawCube: text,
          },
        });
      } catch (err) {
        console.error('Failed to parse .CUBE file:', err);
      }
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#11151f] text-slate-200 select-none overflow-hidden">
      {/* Top Header: Comparison Controls & Scopes Switch */}
      <div className="p-3 border-b border-[#1f2633] bg-[#0c0f16] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Color Grading Studio
          </span>
        </div>

        {/* Comparison controls (Before / After / Split) */}
        <div className="flex items-center gap-1 bg-[#161c28] p-0.5 rounded-lg border border-[#232b3b]">
          <button
            onClick={() => onSetComparisonMode('before')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
              colorComparisonMode === 'before'
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            title="View original without color grade"
          >
            Before
          </button>
          <button
            onClick={() => onSetComparisonMode('after')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
              colorComparisonMode === 'after'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            title="View graded video"
          >
            After
          </button>
          <button
            onClick={() => onSetComparisonMode('split')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded flex items-center gap-1 transition-colors ${
              colorComparisonMode === 'split'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Split-screen side-by-side comparison"
          >
            <Columns className="w-3 h-3" />
            <span>Split</span>
          </button>
        </div>

        {/* Toggle Scopes button */}
        <button
          onClick={onToggleScopes}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs border transition-colors ${
            showScopes
              ? 'border-cyan-400 bg-cyan-950/50 text-cyan-300 font-semibold'
              : 'border-[#263041] bg-[#161c28] text-slate-400 hover:text-white'
          }`}
          title="Toggle Video Scopes (Histogram, Waveform, Parade, Vectorscope)"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Scopes</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-[#1f2633] bg-[#0e121a] overflow-x-auto text-[11px] font-medium">
        {[
          { id: 'basic', label: 'Basic' },
          { id: 'wheels', label: 'Color Wheels' },
          { id: 'curves', label: 'Curves' },
          { id: 'lut', label: 'LUT' },
          { id: 'cinematic', label: 'Cinematic' },
          { id: 'film', label: 'Film & Effects' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ColorTab)}
            className={`px-3 py-2 shrink-0 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-400 bg-[#161c27]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {!selectedClip && (
          <div className="p-4 bg-[#161c27] border border-[#232b39] rounded-xl text-center text-slate-400">
            <p className="font-semibold text-slate-300 mb-1">No Clip Selected</p>
            <p className="text-[11px] leading-relaxed">
              Select a video or image clip on the timeline to apply professional filmic color grading, color wheels, curves, 3D LUTs, and film grain.
            </p>
          </div>
        )}

        {/* 1. BASIC CORRECTION */}
        {activeTab === 'basic' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#1f2633]">
              <span className="font-semibold text-slate-300 text-xs">Basic Correction</span>
              <button
                onClick={() => {
                  const def = getDefaultColorAdjustment();
                  updateAdj({
                    exposure: def.exposure,
                    brightness: def.brightness,
                    contrast: def.contrast,
                    highlights: def.highlights,
                    shadows: def.shadows,
                    whites: def.whites,
                    blacks: def.blacks,
                    saturation: def.saturation,
                    vibrance: def.vibrance,
                    temperature: def.temperature,
                    tint: def.tint,
                    fade: def.fade,
                    sharpness: def.sharpness,
                  });
                }}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Basic</span>
              </button>
            </div>

            {[
              { key: 'exposure', label: 'Exposure', min: -100, max: 100, step: 1 },
              { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 1 },
              { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1 },
              { key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1 },
              { key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1 },
              { key: 'whites', label: 'Whites', min: -100, max: 100, step: 1 },
              { key: 'blacks', label: 'Blacks', min: -100, max: 100, step: 1 },
              { key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1 },
              { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, step: 1 },
              { key: 'temperature', label: 'Temperature (Kelvin)', min: -100, max: 100, step: 1 },
              { key: 'tint', label: 'Tint (Green/Magenta)', min: -100, max: 100, step: 1 },
              { key: 'fade', label: 'Fade (Black Lift)', min: 0, max: 100, step: 1 },
              { key: 'sharpness', label: 'Sharpness', min: 0, max: 100, step: 1 },
            ].map((item) => {
              const val = (adj as unknown as Record<string, number>)[item.key] ?? 0;
              return (
                <div key={item.key} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 w-10 text-right">
                        {val > 0 ? `+${val}` : val}
                      </span>
                      <button
                        onClick={() => resetField(item.key as keyof ColorAdjustment)}
                        className="p-0.5 hover:text-cyan-400 text-slate-600 rounded"
                        title={`Reset ${item.label}`}
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    value={val}
                    onChange={(e) => updateAdj({ [item.key]: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1.5 bg-[#1b2230] rounded cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* 2. COLOR WHEELS */}
        {activeTab === 'wheels' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#1f2633]">
              <span className="font-semibold text-slate-300 text-xs">
                Cinematic Wheels (Lift, Gamma, Gain, Offset)
              </span>
              <button
                onClick={() => {
                  const def = getDefaultColorAdjustment();
                  updateAdj({
                    lift: def.lift,
                    gamma: def.gamma,
                    gain: def.gain,
                    offset: def.offset,
                  });
                }}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Wheels</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ColorWheel
                label="Lift (Shadows)"
                value={adj.lift}
                onChange={(lift) => updateAdj({ lift })}
              />
              <ColorWheel
                label="Gamma (Midtones)"
                value={adj.gamma}
                onChange={(gamma) => updateAdj({ gamma })}
              />
              <ColorWheel
                label="Gain (Highlights)"
                value={adj.gain}
                onChange={(gain) => updateAdj({ gain })}
              />
              <ColorWheel
                label="Offset (Global)"
                value={adj.offset}
                onChange={(offset) => updateAdj({ offset })}
              />
            </div>
          </div>
        )}

        {/* 3. CURVES */}
        {activeTab === 'curves' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#1f2633]">
              <span className="font-semibold text-slate-300 text-xs">Curves (RGB, R, G, B)</span>
              <button
                onClick={() => updateAdj({ curves: getDefaultColorAdjustment().curves })}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Curves</span>
              </button>
            </div>
            <ColorCurvesPanel curves={adj.curves} onChange={(curves) => updateAdj({ curves })} />
          </div>
        )}

        {/* 4. 3D LUT SUPPORT */}
        {activeTab === 'lut' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#1f2633]">
              <span className="font-semibold text-slate-300 text-xs">Local 3D LUT (.CUBE)</span>
              <button
                onClick={() => lutInputRef.current?.click()}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import .CUBE</span>
              </button>
              <input
                ref={lutInputRef}
                type="file"
                accept=".cube"
                onChange={handleImportCubeLUT}
                className="hidden"
              />
            </div>

            {/* Current LUT Status */}
            {adj.lut?.enabled && adj.lut?.name ? (
              <div className="p-3 bg-[#161c28] border border-cyan-500/40 rounded-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" />
                    <div>
                      <p className="font-semibold text-white">{adj.lut.name}</p>
                      <p className="text-[10px] text-slate-400">{adj.lut.size}x{adj.lut.size}x{adj.lut.size} 3D Texture</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateAdj({ lut: getDefaultColorAdjustment().lut })}
                    className="p-1 hover:text-red-400 text-slate-500 rounded"
                    title="Remove LUT"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>LUT Intensity</span>
                    <span className="font-mono text-cyan-400">{adj.lut.intensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adj.lut.intensity}
                    onChange={(e) =>
                      updateAdj({
                        lut: { ...adj.lut, intensity: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400 h-1.5 bg-[#1b2230] rounded"
                  />
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-[11px] bg-[#141824] p-3 rounded-lg border border-[#232b3b]">
                No custom LUT loaded. Choose a built-in offline cinematic LUT below or import your own .cube file:
              </div>
            )}

            {/* Offline Built-In Cinematic LUTs */}
            <span className="text-[11px] font-semibold text-slate-400">Offline Built-In Film LUTs</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'teal_orange', label: 'Hollywood Teal-Orange', desc: 'Punchy blockbuster contrast' },
                { id: 'kodak_2383', label: 'Kodak 2383 Film Print', desc: 'Classic DCI film projection' },
                { id: 'vintage_warm', label: '1970s Gold Film', desc: 'Warm nostalgic celluloid' },
                { id: 'matrix_green', label: 'Cyber Matrix Green', desc: 'Stylized shadow tint' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    const procedural = generateProceduralLUT(item.id as 'teal_orange');
                    updateAdj({
                      lut: {
                        name: procedural.title,
                        enabled: true,
                        intensity: 100,
                        size: procedural.size,
                        data: procedural.data,
                      },
                    });
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col gap-0.5 ${
                    adj.lut?.name === item.label
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                      : 'border-[#222a3a] bg-[#151a26] hover:bg-[#1e2535] text-slate-300'
                  }`}
                >
                  <span className="text-xs font-semibold">{item.label}</span>
                  <span className="text-[10px] text-slate-400">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. CINEMATIC LOOKS & PRESETS */}
        {activeTab === 'cinematic' && (
          <div className="flex flex-col gap-4">
            {/* Cinematic Camera Look Controls */}
            <div className="p-3 bg-[#151a26] rounded-xl border border-[#222a3a] flex flex-col gap-2.5">
              <span className="font-semibold text-xs text-slate-300">Cinematic Camera Parameters</span>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Cinematic Strength</span>
                  <span className="font-mono text-cyan-400">
                    {adj.cameraLook?.cinematicStrength || 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adj.cameraLook?.cinematicStrength || 0}
                  onChange={(e) =>
                    updateAdj({
                      cameraLook: {
                        ...adj.cameraLook,
                        cinematicStrength: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-cyan-400 h-1.5 bg-[#1b2230] rounded"
                />
              </div>

              {/* Skin Tone Protection */}
              <div className="pt-2 border-t border-[#1f2633] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Protect Skin Tones</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={adj.skinTone?.enabled ?? true}
                    onChange={(e) =>
                      updateAdj({
                        skinTone: { ...adj.skinTone, enabled: e.target.checked },
                      })
                    }
                    className="accent-cyan-400"
                  />
                </div>
                {adj.skinTone?.enabled && (
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Protection Strength</span>
                      <span className="font-mono text-cyan-400">{adj.skinTone.strength}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={adj.skinTone.strength}
                      onChange={(e) =>
                        updateAdj({
                          skinTone: { ...adj.skinTone, strength: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-cyan-400 h-1 bg-[#1b2230] rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 18 Cinematic Presets */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-300">
                18 Offline Cinematic Presets
              </span>
              <span className="text-[10px] text-slate-500">100% Offline Formulas</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CINEMATIC_PRESETS.map((pst) => (
                <button
                  key={pst.id}
                  onClick={() => {
                    updateAdj({
                      ...pst.adjustments,
                      preset: pst.id,
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-colors flex flex-col gap-1 ${
                    adj.preset === pst.id
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                      : 'border-[#222a3a] bg-[#141824] hover:bg-[#1c2232] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{pst.name}</span>
                    <span className="text-[9px] text-cyan-400 uppercase tracking-wider">
                      {pst.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">
                    {pst.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. FILM GRAIN & CINEMATIC EFFECTS */}
        {activeTab === 'film' && (
          <div className="flex flex-col gap-4">
            {/* Film Grain */}
            <div className="p-3 bg-[#151a26] rounded-xl border border-[#222a3a] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-200">Realistic Film Grain</span>
                <input
                  type="checkbox"
                  checked={adj.grain?.enabled ?? false}
                  onChange={(e) =>
                    updateAdj({
                      grain: { ...adj.grain, enabled: e.target.checked },
                    })
                  }
                  className="accent-cyan-400"
                />
              </div>

              {adj.grain?.enabled && (
                <>
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Film Stock Gauge</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['8mm', '16mm', '35mm', '65mm'] as const).map((stock) => (
                        <button
                          key={stock}
                          onClick={() =>
                            updateAdj({
                              grain: { ...adj.grain, filmStock: stock },
                            })
                          }
                          className={`py-1 text-xs rounded border ${
                            adj.grain?.filmStock === stock
                              ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                              : 'border-[#222a3a] bg-[#10141f] text-slate-400'
                          }`}
                        >
                          {stock}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Grain Amount</span>
                      <span className="font-mono text-cyan-400">{adj.grain.amount}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={adj.grain.amount}
                      onChange={(e) =>
                        updateAdj({
                          grain: { ...adj.grain, amount: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-cyan-400 h-1.5 bg-[#1b2230] rounded"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Halation, Bloom, Optical Vignette */}
            <div className="p-3 bg-[#151a26] rounded-xl border border-[#222a3a] flex flex-col gap-3">
              <span className="font-semibold text-xs text-slate-200">Optical Film Halation & Bloom</span>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Red Halation (Highlight Edge Bleed)</span>
                  <span className="font-mono text-cyan-400">
                    {adj.cinematicEffects?.halation || 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adj.cinematicEffects?.halation || 0}
                  onChange={(e) =>
                    updateAdj({
                      cinematicEffects: {
                        ...adj.cinematicEffects,
                        halation: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-cyan-400 h-1.5 bg-[#1b2230] rounded"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Optical Vignette</span>
                  <span className="font-mono text-cyan-400">{adj.vignette || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adj.vignette || 0}
                  onChange={(e) => updateAdj({ vignette: Number(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 bg-[#1b2230] rounded"
                />
              </div>
            </div>

            {/* Cinematic Letterbox Bars */}
            <div className="p-3 bg-[#151a26] rounded-xl border border-[#222a3a] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-200">Cinematic Letterbox Bars</span>
                <input
                  type="checkbox"
                  checked={adj.cinematicBars?.enabled ?? false}
                  onChange={(e) =>
                    updateAdj({
                      cinematicBars: { ...adj.cinematicBars, enabled: e.target.checked },
                    })
                  }
                  className="accent-cyan-400"
                />
              </div>

              {adj.cinematicBars?.enabled && (
                <div className="grid grid-cols-4 gap-1.5">
                  {(['2.35:1', '2.39:1', '2.40:1', '21:9'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() =>
                        updateAdj({
                          cinematicBars: { ...adj.cinematicBars, ratio },
                        })
                      }
                      className={`py-1 text-xs rounded border ${
                        adj.cinematicBars?.ratio === ratio
                          ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                          : 'border-[#222a3a] bg-[#10141f] text-slate-400'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
