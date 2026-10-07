import { MediaItem, TimelineClip, TimelineTrack } from '../types/editor';

/**
 * Web Audio timeline playback engine for Saad Video Studio.
 * Synchronizes audio clips with the video playhead, handling volume, fades, gain, and track mute.
 */

interface ActiveAudioNode {
  element: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode;
  gainNode: GainNode;
  clipId: string;
}

export class TimelineAudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: Map<string, ActiveAudioNode> = new Map();
  private isMuted: boolean = false;
  private masterVolume: number = 1.0;

  constructor() {
    // Lazily initialized on first user interaction
  }

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);
      this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(2, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.audioCtx.currentTime
      );
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(
        muted ? 0 : this.masterVolume,
        this.audioCtx.currentTime
      );
    }
  }

  /**
   * Called during playback tick or play/pause transition to sync audio elements with current timeline time.
   */
  syncAudioPlayback(
    currentTime: number,
    isPlaying: boolean,
    tracks: TimelineTrack[],
    clips: TimelineClip[],
    mediaMap: Map<string, MediaItem>
  ) {
    this.initContext();
    if (!this.audioCtx || !this.masterGain) return;

    const trackMap = new Map<string, TimelineTrack>();
    tracks.forEach((t) => trackMap.set(t.id, t));

    // Audio-capable clips: audio tracks or video clips with audio
    const activeClips = clips.filter((c) => {
      const track = trackMap.get(c.trackId);
      if (!track || track.isMuted) return false;
      if (c.audio.isMuted) return false;
      const media = c.mediaId ? mediaMap.get(c.mediaId) : undefined;
      return (
        media &&
        (media.type === 'audio' || media.type === 'video') &&
        currentTime >= c.startTime &&
        currentTime < c.startTime + c.duration
      );
    });

    const activeClipIds = new Set(activeClips.map((c) => c.id));

    // Stop and cleanup nodes that are no longer active
    for (const [clipId, node] of this.activeNodes.entries()) {
      if (!activeClipIds.has(clipId) || !isPlaying) {
        node.element.pause();
        if (!activeClipIds.has(clipId)) {
          this.activeNodes.delete(clipId);
        }
      }
    }

    if (!isPlaying) return;

    // Start/sync active audio clips
    for (const clip of activeClips) {
      const media = mediaMap.get(clip.mediaId!)!;
      let node = this.activeNodes.get(clip.id);

      if (!node) {
        const audioEl = new Audio(media.url);
        audioEl.preload = 'auto';
        audioEl.crossOrigin = 'anonymous';

        try {
          const sourceNode = this.audioCtx.createMediaElementSource(audioEl);
          const gainNode = this.audioCtx.createGain();
          sourceNode.connect(gainNode);
          gainNode.connect(this.masterGain);

          node = {
            element: audioEl,
            sourceNode,
            gainNode,
            clipId: clip.id,
          };
          this.activeNodes.set(clip.id, node);
        } catch {
          // If already connected or CORS blocked
          audioEl.volume = clip.audio.volume;
          node = {
            element: audioEl,
            sourceNode: null as unknown as MediaElementAudioSourceNode,
            gainNode: null as unknown as GainNode,
            clipId: clip.id,
          };
          this.activeNodes.set(clip.id, node);
        }
      }

      // Calculate source timestamp & playback speed
      const offset = currentTime - clip.startTime;
      const targetTime = clip.trimStart + offset * clip.speed;

      if (node.element.playbackRate !== clip.speed) {
        node.element.playbackRate = clip.speed;
      }

      // Resync if drifted by more than 0.1s
      if (Math.abs(node.element.currentTime - targetTime) > 0.12) {
        node.element.currentTime = Math.max(0, targetTime);
      }

      // Apply fade in / fade out and volume
      let effectiveVol = clip.audio.volume;
      if (clip.audio.fadeIn > 0 && offset < clip.audio.fadeIn) {
        effectiveVol *= offset / clip.audio.fadeIn;
      } else if (
        clip.audio.fadeOut > 0 &&
        offset > clip.duration - clip.audio.fadeOut
      ) {
        effectiveVol *= (clip.duration - offset) / clip.audio.fadeOut;
      }

      if (node.gainNode && this.audioCtx) {
        node.gainNode.gain.setValueAtTime(effectiveVol, this.audioCtx.currentTime);
      } else {
        node.element.volume = Math.max(0, Math.min(1, effectiveVol));
      }

      if (node.element.paused) {
        node.element.play().catch(() => {});
      }
    }
  }

  stopAll() {
    this.activeNodes.forEach((node) => {
      node.element.pause();
    });
  }

  destroy() {
    this.stopAll();
    this.activeNodes.clear();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}

export const timelineAudio = new TimelineAudioEngine();
