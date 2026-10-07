import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  X,
  Cpu,
  Monitor,
  Download,
  Volume2,
  Keyboard,
  Moon,
  Trash2,
  Check
} from 'lucide-react';
import { AppSettings } from '../../types/editor';

interface SettingsModalProps {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'performance' | 'export' | 'audio' | 'shortcuts' | 'appearance'
  >('general');
  const [cacheCleared, setCacheCleared] = useState(false);

  if (!isOpen) return null;

  const handleClearCache = () => {
    localStorage.removeItem('saad_video_studio_cache');
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#121620] border border-[#232a38] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="h-12 border-b border-[#1f2633] px-4 flex items-center justify-between bg-[#0e1117]">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm">Studio Settings — Saad Video Studio</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1a202c] text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content with Sidebar tabs */}
        <div className="flex flex-1 min-h-[380px]">
          {/* Tab column */}
          <div className="w-48 bg-[#0d1016] border-r border-[#1f2633] p-2 flex flex-col gap-1 text-xs">
            {[
              { id: 'general', label: 'General', icon: <SettingsIcon className="w-4 h-4" /> },
              { id: 'performance', label: 'Performance', icon: <Cpu className="w-4 h-4" /> },
              { id: 'export', label: 'Export Defaults', icon: <Download className="w-4 h-4" /> },
              { id: 'audio', label: 'Audio Engine', icon: <Volume2 className="w-4 h-4" /> },
              { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="w-4 h-4" /> },
              { id: 'appearance', label: 'Appearance', icon: <Moon className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#1b2230] text-cyan-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141822]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Body */}
          <div className="flex-1 p-5 overflow-y-auto text-xs flex flex-col gap-4">
            {activeTab === 'general' && (
              <>
                <h4 className="font-semibold text-sm text-slate-200">General Preferences</h4>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">
                    Autosave Interval (Seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={settings.general.autosaveInterval}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          autosaveInterval: Number(e.target.value),
                        },
                      })
                    }
                    className="w-36 bg-[#181d27] border border-[#262f3f] rounded px-2.5 py-1 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">
                    Default Clip Duration for Images/Text (Seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.general.defaultClipDuration}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          defaultClipDuration: Number(e.target.value),
                        },
                      })
                    }
                    className="w-36 bg-[#181d27] border border-[#262f3f] rounded px-2.5 py-1 text-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-300">Magnetic Timeline Snapping</span>
                  <input
                    type="checkbox"
                    checked={settings.general.snappingEnabled}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        general: { ...settings.general, snappingEnabled: e.target.checked },
                      })
                    }
                    className="accent-cyan-400"
                  />
                </div>
              </>
            )}

            {activeTab === 'performance' && (
              <>
                <h4 className="font-semibold text-sm text-slate-200">Performance & Hardware</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-200 font-medium">Hardware Acceleration (GPU)</p>
                    <p className="text-[11px] text-slate-500">
                      Utilizes Direct3D / WebGL acceleration for real-time video compositing.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.performance.hardwareAcceleration}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        performance: {
                          ...settings.performance,
                          hardwareAcceleration: e.target.checked,
                        },
                      })
                    }
                    className="accent-cyan-400"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-200 font-medium">Automatic Proxy Mode</p>
                    <p className="text-[11px] text-slate-500">
                      Downsamples 4K footage for fluid 60fps timeline scrub.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.performance.proxyMode}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        performance: {
                          ...settings.performance,
                          proxyMode: e.target.checked,
                        },
                      })
                    }
                    className="accent-cyan-400"
                  />
                </div>

                <div>
                  <p className="text-slate-200 font-medium mb-1">Cache Storage Directory</p>
                  <p className="p-2 bg-[#0c0f15] border border-[#202735] rounded font-mono text-[10px] text-slate-400">
                    {settings.performance.cacheLocation}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleClearCache}
                    className="px-3 py-1.5 bg-[#1f2635] hover:bg-[#2b3548] border border-[#2a3449] rounded text-slate-200 text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {cacheCleared ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Cache Cleared!</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Clear Cache & Waveform Buffers</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {activeTab === 'export' && (
              <>
                <h4 className="font-semibold text-sm text-slate-200">Export Defaults</h4>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Default Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['mp4', 'webm'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            export: { ...settings.export, defaultFormat: fmt },
                          })
                        }
                        className={`py-1.5 rounded border uppercase font-medium transition-colors ${
                          settings.export.defaultFormat === fmt
                            ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                            : 'border-[#262f3f] bg-[#181d27] text-slate-400'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'audio' && (
              <>
                <h4 className="font-semibold text-sm text-slate-200">Audio System</h4>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Sample Rate</label>
                  <select
                    value={settings.audio.sampleRate}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        audio: { ...settings.audio, sampleRate: Number(e.target.value) },
                      })
                    }
                    className="w-48 bg-[#181d27] border border-[#262f3f] rounded p-1.5 text-white"
                  >
                    <option value="44100">44,100 Hz (CD Quality)</option>
                    <option value="48000">48,000 Hz (Studio Video Standard)</option>
                    <option value="96000">96,000 Hz (High Resolution)</option>
                  </select>
                </div>
              </>
            )}

            {activeTab === 'shortcuts' && (
              <>
                <h4 className="font-semibold text-sm text-slate-200">Keyboard Shortcuts Reference</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Space', desc: 'Play / Pause Video' },
                    { key: 'S', desc: 'Split Clip at Playhead' },
                    { key: 'Delete', desc: 'Delete Selected Clip' },
                    { key: 'Ctrl + Z', desc: 'Undo Editing Action' },
                    { key: 'Ctrl + Y', desc: 'Redo Editing Action' },
                    { key: 'Ctrl + S', desc: 'Save Project (.saadvideo)' },
                    { key: 'Ctrl + E', desc: 'Open Export Dialog' },
                    { key: 'Ctrl + C', desc: 'Copy Selected Clip' },
                    { key: 'Ctrl + V', desc: 'Paste Clip' },
                    { key: '← / →', desc: 'Previous / Next Frame' },
                  ].map((sc, i) => (
                    <div
                      key={i}
                      className="p-2 bg-[#171c26] border border-[#232a38] rounded flex items-center justify-between"
                    >
                      <span className="text-slate-400 text-[11px]">{sc.desc}</span>
                      <kbd className="px-1.5 py-0.5 bg-[#0e1117] border border-[#262f3f] rounded font-mono text-[10px] text-cyan-300">
                        {sc.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'appearance' && (
              <>
                <h4 className="font-semibold text-sm text-slate-200">Theme & Appearance</h4>
                <div className="p-3 bg-[#171c26] rounded border border-[#232a38] flex items-center justify-between">
                  <div>
                    <p className="text-slate-200 font-medium">Dark Video Editor Interface</p>
                    <p className="text-[11px] text-slate-500">
                      Standard industry dark studio theme optimized for color grading.
                    </p>
                  </div>
                  <span className="text-xs text-cyan-400 font-semibold">Active</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[#1f2633] px-4 flex items-center justify-end bg-[#0e1117]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
