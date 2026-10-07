import React, { useState } from 'react';
import {
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  Download,
  Settings as SettingsIcon,
  Plus,
  Film,
  FileVideo,
  Check,
  Edit2
} from 'lucide-react';
import { ProjectData } from '../../types/editor';

interface TopBarProps {
  project: ProjectData;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onUpdateProjectName: (name: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onOpenExport,
  onOpenSettings,
  onUpdateProjectName,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(project.name);

  const handleNameSubmit = () => {
    if (projectNameInput.trim()) {
      onUpdateProjectName(projectNameInput.trim());
    } else {
      setProjectNameInput(project.name);
    }
    setIsEditingName(false);
  };

  return (
    <header className="h-12 bg-[#0e1117] border-b border-[#1f2633] px-3 flex items-center justify-between select-none z-30">
      {/* Left: Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-[#1f2633]">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/30">
            <Film className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white font-['Plus_Jakarta_Sans']">
            Saad <span className="text-cyan-400 font-semibold">Video Studio</span>
          </span>
        </div>

        {/* Project Name editable */}
        {isEditingName ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              autoFocus
              className="bg-[#181d26] border border-cyan-500/50 rounded px-2 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500 w-44"
            />
            <button
              onClick={handleNameSubmit}
              className="p-1 hover:bg-[#202735] rounded text-cyan-400 text-xs"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setProjectNameInput(project.name);
              setIsEditingName(true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 hover:bg-[#181d26] rounded text-xs text-slate-300 transition-colors group"
            title="Click to rename project"
          >
            <span className="font-medium text-slate-200 truncate max-w-[180px]">
              {project.name}
            </span>
            <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </button>
        )}
      </div>

      {/* Center: File & Edit actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onNewProject}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-[#1b212c] rounded transition-colors"
          title="New Project (Ctrl+N)"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>New</span>
        </button>

        <button
          onClick={onOpenProject}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-[#1b212c] rounded transition-colors"
          title="Open Project (Ctrl+O)"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Open</span>
        </button>

        <button
          onClick={onSaveProject}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-[#1b212c] rounded transition-colors"
          title="Save Project .saadvideo (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400" />
          <span>Save</span>
        </button>

        <div className="h-4 w-[1px] bg-[#242b38] mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded transition-colors ${
            canUndo
              ? 'text-slate-300 hover:text-white hover:bg-[#1b212c]'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded transition-colors ${
            canRedo
              ? 'text-slate-300 hover:text-white hover:bg-[#1b212c]'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Settings & Primary Export */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1b212c] rounded transition-colors"
          title="Studio Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold rounded shadow-sm transition-all active:scale-95"
          title="Export Video (Ctrl+E)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
