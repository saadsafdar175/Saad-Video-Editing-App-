import React, { useState } from 'react';
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Copy,
  Check,
  Film,
  HardDrive
} from 'lucide-react';
import { ExportSettings, ProjectData } from '../../types/editor';
import { exportEngine, ExportProgress } from '../../engine/exportEngine';
import { generateFFmpegCommand } from '../../engine/ffmpegGenerator';
import { formatDuration } from '../../utils/helpers';

interface ExportModalProps {
  project: ProjectData;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ project, isOpen, onClose }) => {
  const [settings, setSettings] = useState<ExportSettings>(project.exportSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportCompleteUrl, setExportCompleteUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'render' | 'ffmpeg'>('render');
  const [copiedFfmpeg, setCopiedFfmpeg] = useState(false);

  if (!isOpen) return null;

  const ffmpegData = generateFFmpegCommand(project, settings);

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setExportCompleteUrl(null);
    setProgress({
      currentFrame: 0,
      totalFrames: 100,
      percentage: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: 0,
      statusText: 'Initializing media compositing engine...',
    });

    try {
      // Check if Electron native FFmpeg is available
      if (window.electronAPI && window.electronAPI.executeFFmpeg) {
        setProgress({
          currentFrame: 0,
          totalFrames: 100,
          percentage: 10,
          elapsedSeconds: 0,
          estimatedRemainingSeconds: 0,
          statusText: 'Executing native desktop FFmpeg pipeline...',
        });

        const outputPath = `${settings.outputFilename}.${settings.format}`;
        await window.electronAPI.executeFFmpeg(ffmpegData.args, outputPath);

        setIsExporting(false);
        setProgress({
          currentFrame: 100,
          totalFrames: 100,
          percentage: 100,
          elapsedSeconds: 5,
          estimatedRemainingSeconds: 0,
          statusText: 'FFmpeg export complete!',
        });
      } else {
        // Built-in offline Canvas + WebCodecs / MediaRecorder engine
        const videoBlob = await exportEngine.exportProject(project, settings, (p) => {
          setProgress(p);
        });

        const blobUrl = URL.createObjectURL(videoBlob);
        setExportCompleteUrl(blobUrl);

        // Auto trigger download
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${settings.outputFilename}.${settings.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setIsExporting(false);
      }
    } catch (err) {
      setIsExporting(false);
      setErrorMessage((err as Error).message || 'Export failed.');
    }
  };

  const handleCancelExport = () => {
    exportEngine.cancel();
    if (window.electronAPI) {
      window.electronAPI.cancelFFmpeg();
    }
    setIsExporting(false);
    setProgress(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="w-full max-w-xl bg-[#121620] border border-[#232a38] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="h-12 border-b border-[#1f2633] px-4 flex items-center justify-between bg-[#0e1117]">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm">Export Video — Saad Video Studio</span>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1 hover:bg-[#1a202c] text-slate-400 hover:text-white rounded transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: Offline Render vs FFmpeg Command */}
        <div className="flex border-b border-[#1f2633] bg-[#0c0f15] text-xs">
          <button
            onClick={() => setActiveTab('render')}
            className={`flex-1 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'render'
                ? 'border-cyan-400 text-cyan-400 bg-[#141822]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Offline Video Export
          </button>
          <button
            onClick={() => setActiveTab('ffmpeg')}
            className={`flex-1 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'ffmpeg'
                ? 'border-cyan-400 text-cyan-400 bg-[#141822]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            FFmpeg Command Line
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {activeTab === 'render' ? (
            <>
              {/* Output File Name */}
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">File Name</label>
                <input
                  type="text"
                  value={settings.outputFilename}
                  onChange={(e) =>
                    setSettings({ ...settings, outputFilename: e.target.value })
                  }
                  disabled={isExporting}
                  className="w-full bg-[#181d27] border border-[#262f3f] rounded px-3 py-1.5 text-white outline-none focus:border-cyan-500 disabled:opacity-50"
                />
              </div>

              {/* Format & Codec */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Container Format</label>
                  <select
                    value={settings.format}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        format: e.target.value as ExportSettings['format'],
                      })
                    }
                    disabled={isExporting}
                    className="w-full bg-[#181d27] border border-[#262f3f] rounded px-2.5 py-1.5 text-white outline-none disabled:opacity-50"
                  >
                    <option value="mp4">MP4 (Standard H.264)</option>
                    <option value="webm">WebM (VP9 High Efficiency)</option>
                    <option value="mov">MOV (QuickTime)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Video Codec</label>
                  <select
                    value={settings.codec}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        codec: e.target.value as ExportSettings['codec'],
                      })
                    }
                    disabled={isExporting}
                    className="w-full bg-[#181d27] border border-[#262f3f] rounded px-2.5 py-1.5 text-white outline-none disabled:opacity-50"
                  >
                    <option value="h264">H.264 / AVC</option>
                    <option value="vp9">VP9</option>
                  </select>
                </div>
              </div>

              {/* Resolution & FPS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Resolution</label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['720p', '1080p', '2K', '4K'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setSettings({ ...settings, resolution: r })}
                        disabled={isExporting}
                        className={`py-1 text-xs rounded border transition-colors ${
                          settings.resolution === r
                            ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                            : 'border-[#262f3f] bg-[#181d27] text-slate-400'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Frame Rate (FPS)</label>
                  <div className="grid grid-cols-5 gap-1">
                    {[24, 25, 30, 50, 60].map((f) => (
                      <button
                        key={f}
                        onClick={() =>
                          setSettings({ ...settings, fps: f as ExportSettings['fps'] })
                        }
                        disabled={isExporting}
                        className={`py-1 text-xs rounded border transition-colors ${
                          settings.fps === f
                            ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                            : 'border-[#262f3f] bg-[#181d27] text-slate-400'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Rendering Quality</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['low', 'medium', 'high', 'maximum'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setSettings({ ...settings, quality: q })}
                      disabled={isExporting}
                      className={`py-1 text-xs rounded border capitalize transition-colors ${
                        settings.quality === q
                          ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                          : 'border-[#262f3f] bg-[#181d27] text-slate-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress & Status Bar */}
              {progress && (
                <div className="p-3 bg-[#0d1016] rounded-lg border border-[#202735] flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-cyan-400 font-medium">{progress.statusText}</span>
                    <span className="font-mono text-white font-bold">{progress.percentage}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-[#1a202c] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>
                      Frame: {progress.currentFrame} / {progress.totalFrames}
                    </span>
                    <span>
                      Elapsed: {formatDuration(progress.elapsedSeconds)} · Remaining: ~
                      {formatDuration(progress.estimatedRemainingSeconds)}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-2.5 bg-red-950/40 border border-red-800/40 rounded flex items-center gap-2 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Success Notification */}
              {exportCompleteUrl && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded flex items-center justify-between text-emerald-300 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Video exported successfully without watermark!</span>
                  </div>
                  <a
                    href={exportCompleteUrl}
                    download={`${settings.outputFilename}.${settings.format}`}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                  >
                    Download Again
                  </a>
                </div>
              )}
            </>
          ) : (
            /* FFmpeg Command View */
            <div className="flex flex-col gap-3">
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Below is the exact FFmpeg command line synthesized from your Saad Video Studio project, including multi-track overlay composition, speed curves, transitions, and audio amix filters:
              </p>

              <div className="p-3 bg-[#0a0d12] border border-[#1f2633] rounded-lg font-mono text-[11px] text-cyan-300 max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
                {ffmpegData.command}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(ffmpegData.command);
                  setCopiedFfmpeg(true);
                  setTimeout(() => setCopiedFfmpeg(false), 2000);
                }}
                className="self-end px-3 py-1 bg-[#1a202c] hover:bg-[#232b3b] border border-[#2b3547] text-slate-200 rounded text-xs flex items-center gap-1.5 transition-colors"
              >
                {copiedFfmpeg ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy FFmpeg Command</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-[#1f2633] px-4 flex items-center justify-between bg-[#0e1117]">
          <span className="text-[11px] text-slate-500">
            No watermark · 100% Offline Processing
          </span>

          <div className="flex items-center gap-2">
            {isExporting ? (
              <button
                onClick={handleCancelExport}
                className="px-4 py-1.5 bg-red-600/30 hover:bg-red-600 border border-red-500/40 text-red-200 hover:text-white rounded text-xs font-semibold transition-colors"
              >
                Cancel Export
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 hover:bg-[#1a202c] text-slate-400 hover:text-white rounded text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleStartExport}
                  className="px-5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded text-xs font-semibold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Start Export</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
