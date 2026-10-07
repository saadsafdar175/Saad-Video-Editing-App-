import React, { useRef, useState, useEffect } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Magnet,
  Maximize2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Plus,
  Play,
  Pause,
  Key,
  Film,
  Music,
  Type
} from 'lucide-react';
import { MediaItem, TimelineClip, TimelineTrack } from '../../types/editor';
import { formatTimecode } from '../../utils/helpers';

interface TimelineProps {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  mediaMap: Map<string, MediaItem>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (time: number) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onSplitClip: (clipId: string, splitTime: number) => void;
  onDeleteClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackHide: (trackId: string) => void;
  onToggleTrackLock: (trackId: string) => void;
  onAddTrack: (type: TimelineTrack['type']) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  tracks,
  clips,
  mediaMap,
  currentTime,
  duration,
  isPlaying,
  selectedClipId,
  onSelectClip,
  onSeek,
  onUpdateClip,
  onSplitClip,
  onDeleteClip,
  onDuplicateClip,
  onToggleTrackMute,
  onToggleTrackHide,
  onToggleTrackLock,
  onAddTrack,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(40); // pixels per second
  const [snapping, setSnapping] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksContentRef = useRef<HTMLDivElement>(null);

  // Drag states
  const [isScrubbingRuler, setIsScrubbingRuler] = useState(false);
  const [dragAction, setDragAction] = useState<{
    type: 'move' | 'trim-start' | 'trim-end';
    clipId: string;
    startX: number;
    initStartTime: number;
    initDuration: number;
    initTrimStart: number;
    initTrackId: string;
  } | null>(null);

  // Timeline length in pixels
  const timelinePixelWidth = Math.max(1200, duration * zoomLevel + 300);

  // Time ruler intervals based on zoom
  const rulerInterval = zoomLevel < 20 ? 5 : zoomLevel < 50 ? 2 : zoomLevel < 100 ? 1 : 0.5;

  // Handle Scrubbing on Ruler / Playhead
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbingRuler(true);
    updatePlayheadFromMouse(e.clientX);
  };

  const updatePlayheadFromMouse = (clientX: number) => {
    if (!tracksContentRef.current) return;
    const rect = tracksContentRef.current.getBoundingClientRect();
    const scrollLeft = tracksContentRef.current.scrollLeft;
    const clickX = clientX - rect.left + scrollLeft;
    const newTime = Math.max(0, clickX / zoomLevel);
    onSeek(newTime);
  };

  // Drag-and-drop listener for clips
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbingRuler) {
        updatePlayheadFromMouse(e.clientX);
      } else if (dragAction) {
        const deltaX = e.clientX - dragAction.startX;
        const deltaTime = deltaX / zoomLevel;

        if (dragAction.type === 'move') {
          let newStart = Math.max(0, dragAction.initStartTime + deltaTime);
          // Apply snapping to other clips or playhead
          if (snapping) {
            if (Math.abs(newStart - currentTime) < 0.2) newStart = currentTime;
          }
          onUpdateClip(dragAction.clipId, { startTime: newStart });
        } else if (dragAction.type === 'trim-start') {
          const maxDelta = dragAction.initDuration - 0.2;
          const clampedDelta = Math.min(maxDelta, deltaTime);
          const newStart = Math.max(0, dragAction.initStartTime + clampedDelta);
          const newDur = Math.max(0.2, dragAction.initDuration - clampedDelta);
          const newTrim = Math.max(0, dragAction.initTrimStart + clampedDelta);
          onUpdateClip(dragAction.clipId, {
            startTime: newStart,
            duration: newDur,
            trimStart: newTrim,
          });
        } else if (dragAction.type === 'trim-end') {
          const newDur = Math.max(0.2, dragAction.initDuration + deltaTime);
          onUpdateClip(dragAction.clipId, { duration: newDur });
        }
      }
    };

    const handleMouseUp = () => {
      setIsScrubbingRuler(false);
      setDragAction(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbingRuler, dragAction, zoomLevel, snapping, currentTime]);

  // Split selected clip at playhead
  const handleSplitSelected = () => {
    if (!selectedClipId) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;
    if (currentTime > clip.startTime && currentTime < clip.startTime + clip.duration) {
      onSplitClip(selectedClipId, currentTime);
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-72 bg-[#0e1117] border-t border-[#1f2633] flex flex-col select-none relative z-10"
    >
      {/* Timeline Controls & Tools Toolbar */}
      <div className="h-10 bg-[#121620] border-b border-[#1f2633] px-3 flex items-center justify-between text-xs text-slate-300">
        {/* Left edit buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleSplitSelected}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#191f2b] hover:bg-[#232b3b] disabled:opacity-40 rounded border border-[#262f3f] text-slate-300 hover:text-white transition-colors"
            title="Split Clip at Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>Split (S)</span>
          </button>

          <button
            onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#191f2b] hover:bg-red-950/40 hover:border-red-800/40 disabled:opacity-40 rounded border border-[#262f3f] text-slate-300 hover:text-red-400 transition-colors"
            title="Delete Selected Clip (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <button
            onClick={() => selectedClipId && onDuplicateClip(selectedClipId)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#191f2b] hover:bg-[#232b3b] disabled:opacity-40 rounded border border-[#262f3f] text-slate-300 hover:text-white transition-colors"
            title="Duplicate Clip"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <div className="h-4 w-[1px] bg-[#242b38] mx-1" />

          {/* Snapping */}
          <button
            onClick={() => setSnapping(!snapping)}
            className={`p-1.5 rounded border transition-colors ${
              snapping
                ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Clip Snapping"
          >
            <Magnet className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(10, z - 10))}
            className="p-1 hover:bg-[#1c2331] text-slate-400 hover:text-white rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min="10"
            max="150"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-24 accent-cyan-400"
          />
          <button
            onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
            className="p-1 hover:bg-[#1c2331] text-slate-400 hover:text-white rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Track Grid Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Track Headers Column */}
        <div className="w-48 bg-[#10141c] border-r border-[#1f2633] flex flex-col shrink-0 overflow-y-auto">
          {/* Header empty spacing matching time ruler */}
          <div className="h-7 border-b border-[#1f2633] px-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Tracks</span>
          </div>

          {/* Track Headers */}
          {tracks.map((track) => (
            <div
              key={track.id}
              className="h-14 border-b border-[#1a202c] px-3 flex items-center justify-between group bg-[#10141c]"
            >
              <div className="flex items-center gap-2 min-w-0">
                {track.type === 'audio' ? (
                  <Music className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                ) : track.type === 'text' ? (
                  <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}
                <span className="text-xs font-medium text-slate-300 truncate" title={track.name}>
                  {track.name}
                </span>
              </div>

              {/* Track control icons */}
              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                <button
                  onClick={() => onToggleTrackMute(track.id)}
                  className={`p-1 rounded hover:bg-[#1c2230] ${
                    track.isMuted ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={track.isMuted ? 'Unmute Track' : 'Mute Track'}
                >
                  {track.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => onToggleTrackHide(track.id)}
                  className={`p-1 rounded hover:bg-[#1c2230] ${
                    track.isHidden ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={track.isHidden ? 'Unhide Track' : 'Hide Track'}
                >
                  {track.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => onToggleTrackLock(track.id)}
                  className={`p-1 rounded hover:bg-[#1c2230] ${
                    track.isLocked ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={track.isLocked ? 'Unlock Track' : 'Lock Track'}
                >
                  {track.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Timeline Lanes & Ruler Viewport */}
        <div
          ref={tracksContentRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#090b0f]"
        >
          {/* Draggable Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none z-30"
            style={{ left: `${currentTime * zoomLevel}px` }}
          >
            {/* Playhead Diamond Head */}
            <div className="w-3.5 h-4 bg-cyan-400 -translate-x-[6px] rounded-b shadow-lg flex items-center justify-center">
              <div className="w-1 h-2 bg-black/40 rounded-full" />
            </div>
          </div>

          {/* Time Ruler */}
          <div
            onMouseDown={handleRulerMouseDown}
            className="h-7 border-b border-[#1f2633] bg-[#0c0f15] sticky top-0 cursor-pointer z-20 flex items-end"
            style={{ width: `${timelinePixelWidth}px` }}
          >
            {Array.from({ length: Math.ceil((duration + 10) / rulerInterval) }).map((_, idx) => {
              const sec = idx * rulerInterval;
              const leftPx = sec * zoomLevel;
              return (
                <div
                  key={idx}
                  className="absolute bottom-0 flex flex-col items-center"
                  style={{ left: `${leftPx}px` }}
                >
                  <span className="text-[9px] font-mono text-slate-500 select-none pb-1">
                    {formatTimecode(sec, 30).slice(3, 8)}
                  </span>
                  <div className="w-[1px] h-2 bg-[#252c3b]" />
                </div>
              );
            })}
          </div>

          {/* Track Lanes */}
          <div style={{ width: `${timelinePixelWidth}px` }}>
            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.trackId === track.id);

              return (
                <div
                  key={track.id}
                  className={`h-14 border-b border-[#171d27] relative ${
                    track.isLocked ? 'bg-red-950/10' : track.isHidden ? 'opacity-40' : ''
                  }`}
                >
                  {/* Render clips on this track */}
                  {trackClips.map((clip) => {
                    const isSelected = clip.id === selectedClipId;
                    const clipLeft = clip.startTime * zoomLevel;
                    const clipWidth = Math.max(16, clip.duration * zoomLevel);
                    const media = clip.mediaId ? mediaMap.get(clip.mediaId) : undefined;

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                        onMouseDown={(e) => {
                          if (track.isLocked) return;
                          e.stopPropagation();
                          onSelectClip(clip.id);
                          setDragAction({
                            type: 'move',
                            clipId: clip.id,
                            startX: e.clientX,
                            initStartTime: clip.startTime,
                            initDuration: clip.duration,
                            initTrimStart: clip.trimStart,
                            initTrackId: clip.trackId,
                          });
                        }}
                        className={`absolute top-1 bottom-1 rounded border overflow-hidden cursor-move transition-shadow ${
                          isSelected
                            ? 'ring-2 ring-cyan-400 border-white bg-cyan-900/40 z-10'
                            : clip.type === 'audio'
                            ? 'border-purple-600/50 bg-purple-950/40 hover:bg-purple-900/50'
                            : clip.type === 'text'
                            ? 'border-amber-600/50 bg-amber-950/40 hover:bg-amber-900/50'
                            : 'border-blue-600/50 bg-blue-950/40 hover:bg-blue-900/50'
                        }`}
                        style={{
                          left: `${clipLeft}px`,
                          width: `${clipWidth}px`,
                        }}
                      >
                        {/* Trim Left Handle */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDragAction({
                              type: 'trim-start',
                              clipId: clip.id,
                              startX: e.clientX,
                              initStartTime: clip.startTime,
                              initDuration: clip.duration,
                              initTrimStart: clip.trimStart,
                              initTrackId: clip.trackId,
                            });
                          }}
                          className="absolute left-0 top-0 bottom-0 w-2 hover:bg-cyan-400/80 cursor-ew-resize z-20"
                        />

                        {/* Visual Clip Body */}
                        <div className="w-full h-full px-2 flex items-center justify-between text-xs pointer-events-none overflow-hidden relative">
                          {/* Audio Waveform visualization if audio clip */}
                          {clip.type === 'audio' && media?.waveformData && (
                            <div className="absolute inset-0 flex items-center opacity-40 px-1">
                              {media.waveformData.slice(0, 60).map((peak, idx) => (
                                <div
                                  key={idx}
                                  className="flex-1 bg-purple-400 mx-[0.5px] rounded-full"
                                  style={{ height: `${Math.max(4, peak * 36)}px` }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Video Thumbnail in background if video clip */}
                          {clip.type === 'video' && media?.thumbnailUrl && (
                            <img
                              src={media.thumbnailUrl}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                            />
                          )}

                          {/* Clip Title */}
                          <span className="font-semibold text-slate-100 truncate text-[11px] relative z-10 drop-shadow-sm">
                            {clip.name}
                          </span>

                          {/* Keyframe diamonds count indicator */}
                          {clip.keyframes.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-cyan-300 relative z-10 shrink-0">
                              <Key className="w-3 h-3" />
                              <span>{clip.keyframes.length}</span>
                            </div>
                          )}
                        </div>

                        {/* Trim Right Handle */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDragAction({
                              type: 'trim-end',
                              clipId: clip.id,
                              startX: e.clientX,
                              initStartTime: clip.startTime,
                              initDuration: clip.duration,
                              initTrimStart: clip.trimStart,
                              initTrackId: clip.trackId,
                            });
                          }}
                          className="absolute right-0 top-0 bottom-0 w-2 hover:bg-cyan-400/80 cursor-ew-resize z-20"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
