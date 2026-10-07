import React, { useState } from 'react';
import { Film, Plus, FolderOpen, RotateCcw, Sparkles } from 'lucide-react';
import { AspectRatio, ProjectData } from '../../types/editor';

interface StartProjectModalProps {
  isOpen: boolean;
  recoverableProject: ProjectData | null;
  onNewProject: (name: string, aspect: AspectRatio) => void;
  onOpenProject: () => void;
  onRecoverProject: () => void;
}

export const StartProjectModal: React.FC<StartProjectModalProps> = ({
  isOpen,
  recoverableProject,
  onNewProject,
  onOpenProject,
  onRecoverProject,
}) => {
  const [projectName, setProjectName] = useState('Untitled Project');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="w-full max-w-lg bg-[#121620] border border-[#232a38] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Brand Banner */}
        <div className="p-8 bg-gradient-to-b from-[#181f2c] to-[#121620] border-b border-[#1f2633] flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-900/40 mb-3">
            <Film className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">
            Saad <span className="text-cyan-400">Video Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Professional offline desktop video editing application. No watermarks, no login, genuine local media engine.
          </p>
        </div>

        {/* Action Panel */}
        <div className="p-6 flex flex-col gap-5 text-xs">
          {/* If there is a recoverable autosaved project, show alert */}
          {recoverableProject && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-amber-300 font-semibold text-xs">Recover Previous Project</p>
                <p className="text-[11px] text-amber-200/70 mt-0.5">
                  Autosaved project found: "{recoverableProject.name}"
                </p>
              </div>
              <button
                onClick={onRecoverProject}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded text-xs flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recover</span>
              </button>
            </div>
          )}

          {/* New Project Setup */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-slate-400 text-[11px] font-medium block mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Video Project"
                className="w-full bg-[#181d27] border border-[#283244] rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[11px] font-medium block mb-1">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: '16:9', label: '16:9 Landscape' },
                    { id: '9:16', label: '9:16 Shorts/Reels' },
                    { id: '1:1', label: '1:1 Square' },
                  ] as const
                ).map((ar) => (
                  <button
                    key={ar.id}
                    onClick={() => setAspectRatio(ar.id)}
                    className={`py-2 px-2 rounded-lg border text-center transition-colors ${
                      aspectRatio === ar.id
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-semibold'
                        : 'border-[#242c3c] bg-[#181d27] hover:bg-[#202735] text-slate-300'
                    }`}
                  >
                    <p className="text-xs">{ar.id}</p>
                    <p className="text-[10px] text-slate-400">{ar.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onNewProject(projectName || 'Untitled Project', aspectRatio)}
              className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </button>

            <button
              onClick={onOpenProject}
              className="px-4 py-2.5 bg-[#181d27] hover:bg-[#222a38] border border-[#283244] text-slate-200 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors text-xs"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Open File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
