import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AspectRatio,
  CanvasSettings,
  FilterType,
  MediaItem,
  ProjectData,
  SpeedCurvePreset,
  SubtitleItem,
  TimelineClip,
  TimelineTrack,
  TransitionType,
} from './types/editor';
import {
  createClipFromMedia,
  createTextClip,
} from './utils/helpers';
import {
  createEmptyProject,
  DEFAULT_APP_SETTINGS,
  RESOLUTION_MAP,
} from './utils/constants';
import { ProjectManager } from './project/projectManager';
import { HistoryManager } from './project/historyManager';
import { processImportedFile } from './engine/mediaEngine';
import { timelineAudio } from './engine/audioEngine';
import { exportSRT } from './utils/subtitleUtils';

import { TopBar } from './components/topbar/TopBar';
import { LeftSidebar } from './components/sidebar/LeftSidebar';
import { PreviewPlayer } from './components/preview/PreviewPlayer';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { Timeline } from './components/timeline/Timeline';
import { ExportModal } from './components/export/ExportModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { VoiceOverModal } from './components/voiceover/VoiceOverModal';
import { StartProjectModal } from './components/welcome/StartProjectModal';
import { VideoScopesPanel } from './components/color/VideoScopesPanel';

export default function App() {
  // Empty initial project
  const [project, setProject] = useState<ProjectData>(() => createEmptyProject());
  const historyRef = useRef<HistoryManager>(new HistoryManager(project));

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [previewQuality, setPreviewQuality] = useState<'full' | 'half' | 'quarter'>('full');
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);

  // Filmic Color Grading & Scopes state
  const [colorComparisonMode, setColorComparisonMode] = useState<'after' | 'before' | 'split'>('after');
  const [splitPosition, setSplitPosition] = useState<number>(0.5);
  const [showScopes, setShowScopes] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Modals state
  const [showStartModal, setShowStartModal] = useState<boolean>(true);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showVoiceOverModal, setShowVoiceOverModal] = useState<boolean>(false);
  const [recoverableProject, setRecoverableProject] = useState<ProjectData | null>(null);

  // Animation frame id for playback loop
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Media map
  const mediaMap = new Map<string, MediaItem>();
  project.media.forEach((m) => mediaMap.set(m.id, m));

  // Selected clip helper
  const selectedClip = project.clips.find((c) => c.id === selectedClipId) || null;

  // Check for recoverable session on mount
  useEffect(() => {
    const recoverable = ProjectManager.getRecoverableProject();
    if (recoverable) {
      setRecoverableProject(recoverable);
    }
  }, []);

  // Record history snapshot helper
  const recordProjectChange = useCallback((updated: ProjectData) => {
    historyRef.current.record(updated);
    setProject(updated);
  }, []);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    const prev = historyRef.current.undo();
    if (prev) setProject(prev);
  }, []);

  const handleRedo = useCallback(() => {
    const next = historyRef.current.redo();
    if (next) setProject(next);
  }, []);

  // Autosave loop
  useEffect(() => {
    const interval = setInterval(() => {
      ProjectManager.saveAutosave(project);
    }, (settings.general.autosaveInterval || 10) * 1000);
    return () => clearInterval(interval);
  }, [project, settings.general.autosaveInterval]);

  // Playback Loop via requestAnimationFrame
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      const tick = (now: number) => {
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setCurrentTime((prev) => {
          let nextTime = prev + delta;
          if (nextTime >= project.duration) {
            setIsPlaying(false);
            nextTime = 0;
          }
          timelineAudio.syncAudioPlayback(nextTime, true, project.tracks, project.clips, mediaMap);
          return nextTime;
        });

        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      timelineAudio.syncAudioPlayback(currentTime, false, project.tracks, project.clips, mediaMap);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, project.duration, project.tracks, project.clips]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        // Split selected clip at playhead
        if (selectedClipId) {
          handleSplitClip(selectedClipId, currentTime);
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId) {
          handleDeleteClip(selectedClipId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        handleSaveProject();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyE') {
        e.preventDefault();
        setShowExportModal(true);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStepFrame(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStepFrame(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Step Frame
  const handleStepFrame = (frames: number) => {
    const frameDuration = 1 / 30;
    setCurrentTime((t) => Math.max(0, Math.min(project.duration, t + frames * frameDuration)));
  };

  // Import Files
  const handleImportFiles = async (files: FileList | File[]) => {
    const newItems: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const item = await processImportedFile(files[i]);
        newItems.push(item);
      } catch (err) {
        console.error('Error importing file:', err);
      }
    }

    if (newItems.length > 0) {
      const updated: ProjectData = {
        ...project,
        media: [...project.media, ...newItems],
        updatedAt: Date.now(),
      };
      recordProjectChange(updated);
    }
  };

  // Add media directly onto timeline
  const handleAddMediaToTimeline = (media: MediaItem) => {
    let targetTrack: TimelineTrack | undefined;
    if (media.type === 'audio') {
      targetTrack = project.tracks.find((t) => t.type === 'audio');
    } else {
      targetTrack = project.tracks.find((t) => t.type === 'video');
    }

    if (!targetTrack) targetTrack = project.tracks[0];

    const clip = createClipFromMedia(media, targetTrack.id, currentTime);
    const newMaxDuration = Math.max(project.duration, clip.startTime + clip.duration + 5);

    const updated: ProjectData = {
      ...project,
      clips: [...project.clips, clip],
      duration: newMaxDuration,
      updatedAt: Date.now(),
    };
    setSelectedClipId(clip.id);
    recordProjectChange(updated);
  };

  // Delete media item from project
  const handleDeleteMedia = (mediaId: string) => {
    const updated: ProjectData = {
      ...project,
      media: project.media.filter((m) => m.id !== mediaId),
      clips: project.clips.filter((c) => c.mediaId !== mediaId),
      updatedAt: Date.now(),
    };
    if (selectedClip?.mediaId === mediaId) {
      setSelectedClipId(null);
    }
    recordProjectChange(updated);
  };

  // Add Text Clip
  const handleAddTextClip = (text: string, style?: Partial<TimelineClip['text']>) => {
    let textTrack = project.tracks.find((t) => t.type === 'text');
    if (!textTrack) textTrack = project.tracks[0];

    const clip = createTextClip(text, textTrack.id, currentTime, 5);
    if (style && clip.text) {
      clip.text = { ...clip.text, ...style };
    }

    const updated: ProjectData = {
      ...project,
      clips: [...project.clips, clip],
      duration: Math.max(project.duration, clip.startTime + clip.duration + 5),
      updatedAt: Date.now(),
    };
    setSelectedClipId(clip.id);
    recordProjectChange(updated);
  };

  // Add Voiceover
  const handleAddRecordedVoiceOver = async (blob: Blob, recordedDuration: number) => {
    const file = new File([blob], `Voiceover_${Date.now()}.webm`, { type: blob.type });
    const mediaItem = await processImportedFile(file);

    let audioTrack = project.tracks.find((t) => t.name.toLowerCase().includes('voice')) ||
                     project.tracks.find((t) => t.type === 'audio');
    if (!audioTrack) audioTrack = project.tracks[0];

    const clip = createClipFromMedia(mediaItem, audioTrack.id, currentTime);
    clip.duration = Math.max(1, recordedDuration);
    clip.trimEnd = clip.duration;

    const updated: ProjectData = {
      ...project,
      media: [...project.media, mediaItem],
      clips: [...project.clips, clip],
      duration: Math.max(project.duration, clip.startTime + clip.duration + 5),
      updatedAt: Date.now(),
    };
    setSelectedClipId(clip.id);
    recordProjectChange(updated);
  };

  // Split Clip
  const handleSplitClip = (clipId: string, splitTime: number) => {
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) return;
    if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) return;

    const firstDuration = splitTime - clip.startTime;
    const secondDuration = clip.duration - firstDuration;

    const firstClip: TimelineClip = {
      ...clip,
      duration: firstDuration,
      trimEnd: clip.trimStart + firstDuration * clip.speed,
    };

    const secondClip: TimelineClip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      startTime: splitTime,
      duration: secondDuration,
      trimStart: clip.trimStart + firstDuration * clip.speed,
      trimEnd: clip.trimEnd,
    };

    const updatedClips = project.clips.map((c) => (c.id === clipId ? firstClip : c));
    updatedClips.push(secondClip);

    const updated: ProjectData = {
      ...project,
      clips: updatedClips,
      updatedAt: Date.now(),
    };
    setSelectedClipId(secondClip.id);
    recordProjectChange(updated);
  };

  // Delete Clip
  const handleDeleteClip = (clipId: string) => {
    const updated: ProjectData = {
      ...project,
      clips: project.clips.filter((c) => c.id !== clipId),
      updatedAt: Date.now(),
    };
    if (selectedClipId === clipId) setSelectedClipId(null);
    recordProjectChange(updated);
  };

  // Duplicate Clip
  const handleDuplicateClip = (clipId: string) => {
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const duplicated: TimelineClip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      startTime: clip.startTime + clip.duration + 0.5,
      name: `${clip.name} (Copy)`,
    };

    const updated: ProjectData = {
      ...project,
      clips: [...project.clips, duplicated],
      duration: Math.max(project.duration, duplicated.startTime + duplicated.duration + 5),
      updatedAt: Date.now(),
    };
    setSelectedClipId(duplicated.id);
    recordProjectChange(updated);
  };

  // Update Clip
  const handleUpdateClip = (clipId: string, updates: Partial<TimelineClip>) => {
    const updatedClips = project.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c));
    const updated: ProjectData = {
      ...project,
      clips: updatedClips,
      updatedAt: Date.now(),
    };
    recordProjectChange(updated);
  };

  // Update Canvas Settings
  const handleUpdateCanvas = (updates: Partial<CanvasSettings>) => {
    const newCanvas = { ...project.canvas, ...updates };
    const mapped = RESOLUTION_MAP[newCanvas.aspectRatio]?.[newCanvas.resolution];
    if (mapped) {
      newCanvas.width = mapped.width;
      newCanvas.height = mapped.height;
    }

    const updated: ProjectData = {
      ...project,
      canvas: newCanvas,
      updatedAt: Date.now(),
    };
    recordProjectChange(updated);
  };

  // Track toggles
  const handleToggleTrackMute = (trackId: string) => {
    const updatedTracks = project.tracks.map((t) =>
      t.id === trackId ? { ...t, isMuted: !t.isMuted } : t
    );
    recordProjectChange({ ...project, tracks: updatedTracks });
  };

  const handleToggleTrackHide = (trackId: string) => {
    const updatedTracks = project.tracks.map((t) =>
      t.id === trackId ? { ...t, isHidden: !t.isHidden } : t
    );
    recordProjectChange({ ...project, tracks: updatedTracks });
  };

  const handleToggleTrackLock = (trackId: string) => {
    const updatedTracks = project.tracks.map((t) =>
      t.id === trackId ? { ...t, isLocked: !t.isLocked } : t
    );
    recordProjectChange({ ...project, tracks: updatedTracks });
  };

  // Project File actions
  const handleSaveProject = () => {
    ProjectManager.exportProjectFile(project);
  };

  const handleOpenProject = async () => {
    try {
      const opened = await ProjectManager.openProjectFile();
      setProject(opened);
      historyRef.current.reset(opened);
      setCurrentTime(0);
      setSelectedClipId(null);
      setShowStartModal(false);
    } catch (err) {
      console.warn('Open project cancelled or failed:', err);
    }
  };

  const handleNewProject = (name: string, aspect: AspectRatio) => {
    const empty = createEmptyProject(name);
    empty.canvas.aspectRatio = aspect;
    const mapped = RESOLUTION_MAP[aspect]?.['1080p'];
    if (mapped) {
      empty.canvas.width = mapped.width;
      empty.canvas.height = mapped.height;
    }

    setProject(empty);
    historyRef.current.reset(empty);
    setCurrentTime(0);
    setSelectedClipId(null);
    setShowStartModal(false);
  };

  const handleRecoverProject = () => {
    if (recoverableProject) {
      setProject(recoverableProject);
      historyRef.current.reset(recoverableProject);
      setCurrentTime(0);
      setSelectedClipId(null);
      setShowStartModal(false);
    }
  };

  // Subtitle Handlers
  const handleAddSubtitle = (text: string) => {
    const newSub: SubtitleItem = {
      id: `sub-${Date.now()}`,
      startTime: currentTime,
      endTime: currentTime + 3,
      text,
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 36,
      color: '#ffffff',
      positionY: 85,
    };
    recordProjectChange({
      ...project,
      subtitles: [...project.subtitles, newSub],
    });
  };

  const handleImportSRT = (subs: SubtitleItem[]) => {
    recordProjectChange({
      ...project,
      subtitles: [...project.subtitles, ...subs],
    });
  };

  const handleExportSRT = () => {
    const srt = exportSRT(project.subtitles);
    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_subtitles.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteSubtitle = (id: string) => {
    recordProjectChange({
      ...project,
      subtitles: project.subtitles.filter((s) => s.id !== id),
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0b0d11] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans']">
      {/* 1. TOP BAR */}
      <TopBar
        project={project}
        canUndo={historyRef.current.canUndo()}
        canRedo={historyRef.current.canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNewProject={() => setShowStartModal(true)}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onOpenExport={() => setShowExportModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onUpdateProjectName={(name) => recordProjectChange({ ...project, name })}
      />

      {/* 2. MAIN CENTER WORKSPACE */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          mediaList={project.media}
          selectedClip={selectedClip}
          canvasSettings={project.canvas}
          subtitles={project.subtitles}
          colorComparisonMode={colorComparisonMode}
          showScopes={showScopes}
          onImportFiles={handleImportFiles}
          onAddMediaToTimeline={handleAddMediaToTimeline}
          onDeleteMedia={handleDeleteMedia}
          onAddTextClip={handleAddTextClip}
          onOpenVoiceOver={() => setShowVoiceOverModal(true)}
          onApplyFilter={(f) => selectedClipId && handleUpdateClip(selectedClipId, { filter: f })}
          onApplyTransition={(tr) =>
            selectedClipId &&
            handleUpdateClip(selectedClipId, { transition: { type: tr, duration: 0.5 } })
          }
          onApplySpeedPreset={(s) => selectedClipId && handleUpdateClip(selectedClipId, { speed: s })}
          onApplySpeedCurvePreset={(preset) => {
            if (!selectedClipId) return;
            handleUpdateClip(selectedClipId, {
              speedCurvePreset: preset,
              speedCurve: [
                { id: '1', time: 0, speed: preset === 'slow_fast' ? 0.3 : 2.5 },
                { id: '2', time: 0.5, speed: 1.0 },
                { id: '3', time: 1, speed: preset === 'slow_fast' ? 2.5 : 0.3 },
              ],
            });
          }}
          onUpdateCanvas={handleUpdateCanvas}
          onAddSubtitle={handleAddSubtitle}
          onImportSRT={handleImportSRT}
          onExportSRT={handleExportSRT}
          onDeleteSubtitle={handleDeleteSubtitle}
          onUpdateColor={(adj) => {
            if (selectedClipId) {
              handleUpdateClip(selectedClipId, { colorAdjust: adj });
            }
          }}
          onSetComparisonMode={(mode) => setColorComparisonMode(mode)}
          onToggleScopes={() => setShowScopes((s) => !s)}
        />

        {/* Center Preview Player */}
        <PreviewPlayer
          currentTime={currentTime}
          duration={project.duration}
          isPlaying={isPlaying}
          canvasSettings={project.canvas}
          tracks={project.tracks}
          clips={project.clips}
          mediaList={project.media}
          subtitles={project.subtitles}
          selectedClip={selectedClip}
          previewQuality={previewQuality}
          colorComparisonMode={colorComparisonMode}
          splitPosition={splitPosition}
          canvasRefExternal={previewCanvasRef}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onSeek={(t) => setCurrentTime(t)}
          onStepFrame={handleStepFrame}
          onChangePreviewQuality={(q) => setPreviewQuality(q)}
          onSetComparisonMode={(mode) => setColorComparisonMode(mode)}
          onToggleScopes={() => setShowScopes((s) => !s)}
          onUpdateClipTransform={(clipId, transform) => {
            const clip = project.clips.find((c) => c.id === clipId);
            if (clip) {
              handleUpdateClip(clipId, {
                transform: { ...clip.transform, ...transform },
              });
            }
          }}
        />

        {/* Right Inspector Panel */}
        <InspectorPanel
          selectedClip={selectedClip}
          canvasSettings={project.canvas}
          currentTime={currentTime}
          onUpdateClip={handleUpdateClip}
          onUpdateCanvas={handleUpdateCanvas}
          onDuplicateClip={handleDuplicateClip}
          onDeleteClip={handleDeleteClip}
        />
      </div>

      {/* 3. BOTTOM MULTI-TRACK TIMELINE */}
      <Timeline
        tracks={project.tracks}
        clips={project.clips}
        mediaMap={mediaMap}
        currentTime={currentTime}
        duration={project.duration}
        isPlaying={isPlaying}
        selectedClipId={selectedClipId}
        onSelectClip={(id) => setSelectedClipId(id)}
        onSeek={(t) => setCurrentTime(t)}
        onUpdateClip={handleUpdateClip}
        onSplitClip={handleSplitClip}
        onDeleteClip={handleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onToggleTrackMute={handleToggleTrackMute}
        onToggleTrackHide={handleToggleTrackHide}
        onToggleTrackLock={handleToggleTrackLock}
        onAddTrack={(type) => {
          const newTrack: TimelineTrack = {
            id: `track-${type}-${Date.now()}`,
            name: `${type.toUpperCase()} Track`,
            type,
            isMuted: false,
            isHidden: false,
            isLocked: false,
            order: project.tracks.length,
          };
          recordProjectChange({ ...project, tracks: [...project.tracks, newTrack] });
        }}
      />

      {/* MODALS */}
      {showStartModal && (
        <StartProjectModal
          isOpen={showStartModal}
          recoverableProject={recoverableProject}
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onRecoverProject={handleRecoverProject}
        />
      )}

      {showExportModal && (
        <ExportModal
          project={project}
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onUpdateSettings={(s) => setSettings(s)}
        />
      )}

      {showVoiceOverModal && (
        <VoiceOverModal
          isOpen={showVoiceOverModal}
          onClose={() => setShowVoiceOverModal(false)}
          onAddRecordedAudio={handleAddRecordedVoiceOver}
        />
      )}

      {/* Floating Real-time Video Scopes Monitor */}
      <VideoScopesPanel
        isOpen={showScopes}
        onClose={() => setShowScopes(false)}
        sourceCanvasRef={previewCanvasRef}
        currentTime={currentTime}
      />
    </div>
  );
}
