import { ExportSettings, ProjectData } from '../types/editor';
import { RESOLUTION_MAP } from '../utils/constants';

/**
 * Generates an FFmpeg command line and filter_complex graph
 * representing the entire multi-track Saad Video Studio project.
 */
export function generateFFmpegCommand(project: ProjectData, settings: ExportSettings): {
  command: string;
  args: string[];
  filterComplex: string;
} {
  const aspect = project.canvas.aspectRatio;
  const resPreset = settings.resolution;
  const mapped = RESOLUTION_MAP[aspect]?.[resPreset] || { width: 1920, height: 1080 };
  const width = mapped.width;
  const height = mapped.height;
  const fps = settings.fps;

  const inputs: string[] = [];
  const args: string[] = ['-y'];

  // Map media inputs
  const mediaInputMap = new Map<string, number>();
  project.media.forEach((media, index) => {
    inputs.push(`-i "${media.name}"`);
    args.push('-i', media.name);
    mediaInputMap.set(media.id, index);
  });

  const filterChains: string[] = [];
  let videoOutLabel = 'v_base';
  let audioOutLabel = 'a_base';

  // Base canvas background
  filterChains.push(
    `color=c=${project.canvas.backgroundColor.replace('#', '0x') || '0x000000'}:s=${width}x${height}:d=${Math.max(1, project.duration)}:r=${fps}[v_base]`
  );
  filterChains.push(`anullsrc=channel_layout=stereo:sample_rate=48000:d=${Math.max(1, project.duration)}[a_base]`);

  // Video and Overlay Clips processing
  const videoClips = project.clips.filter((c) => c.type === 'video' || c.type === 'overlay');
  videoClips.forEach((clip, idx) => {
    if (!clip.mediaId || !mediaInputMap.has(clip.mediaId)) return;
    const inputIdx = mediaInputMap.get(clip.mediaId)!;
    const clipLabel = `v_clip_${idx}`;

    const filters: string[] = [];
    // Trim
    filters.push(`trim=start=${clip.trimStart}:end=${clip.trimStart + clip.duration}`);
    filters.push(`setpts=PTS-STARTPTS`);

    // Speed / Slow-motion
    if (clip.slowMotion.enabled) {
      if (clip.slowMotion.mode === 'optical') {
        filters.push(`minterpolate='mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=${fps * 2}'`);
      }
      filters.push(`setpts=${1 / clip.slowMotion.rate}*PTS`);
    } else if (clip.speed !== 1.0) {
      filters.push(`setpts=${1 / clip.speed}*PTS`);
    }

    // Scale / Crop
    filters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
    filters.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`);

    // Color adjust (Basic, Wheels, Gamma, Vignette, Noise, Curves)
    if (clip.colorAdjust) {
      const b = (clip.colorAdjust.brightness || 0) / 100 + (clip.colorAdjust.exposure || 0) / 100 * 0.5;
      const c = 1 + (clip.colorAdjust.contrast || 0) / 100;
      const s = 1 + ((clip.colorAdjust.saturation || 0) + (clip.colorAdjust.vibrance || 0) * 0.5) / 100;
      const gr = Math.max(0.1, 1 / (1 + (clip.colorAdjust.gamma?.r || 0) + (clip.colorAdjust.gamma?.luma || 0)));
      const gg = Math.max(0.1, 1 / (1 + (clip.colorAdjust.gamma?.g || 0) + (clip.colorAdjust.gamma?.luma || 0)));
      const gb = Math.max(0.1, 1 / (1 + (clip.colorAdjust.gamma?.b || 0) + (clip.colorAdjust.gamma?.luma || 0)));

      filters.push(`eq=brightness=${b.toFixed(2)}:contrast=${c.toFixed(2)}:saturation=${s.toFixed(2)}:gamma_r=${gr.toFixed(2)}:gamma_g=${gg.toFixed(2)}:gamma_b=${gb.toFixed(2)}`);

      if (clip.colorAdjust.grain?.enabled && clip.colorAdjust.grain.amount > 0) {
        const noiseStrength = Math.round((clip.colorAdjust.grain.amount / 100) * 35);
        filters.push(`noise=alls=${noiseStrength}:allf=t+u`);
      }

      if (clip.colorAdjust.vignette > 0 || clip.colorAdjust.cinematicEffects?.vignette > 0) {
        const vigAngle = ((Math.max(clip.colorAdjust.vignette, clip.colorAdjust.cinematicEffects?.vignette || 0) / 100) * (Math.PI / 3)).toFixed(2);
        filters.push(`vignette=${vigAngle}`);
      }
    }

    // Chroma key
    if (clip.chromaKey.enabled) {
      const col = clip.chromaKey.color.replace('#', '0x');
      const sim = clip.chromaKey.similarity / 100;
      const blend = clip.chromaKey.smoothness / 100;
      filters.push(`colorkey=${col}:${sim}:${blend}`);
    }

    filterChains.push(`[${inputIdx}:v]${filters.join(',')}[${clipLabel}]`);

    // Overlay onto base video
    const nextBase = `v_base_${idx + 1}`;
    filterChains.push(
      `[${videoOutLabel}][${clipLabel}]overlay=x=${clip.transform.positionX}:y=${clip.transform.positionY}:enable='between(t,${clip.startTime},${clip.startTime + clip.duration})'[${nextBase}]`
    );
    videoOutLabel = nextBase;
  });

  // Audio Clips mixing
  const audioClips = project.clips.filter((c) => c.type === 'audio');
  if (audioClips.length > 0) {
    const audioLabels: string[] = [`[${audioOutLabel}]`];
    audioClips.forEach((clip, idx) => {
      if (!clip.mediaId || !mediaInputMap.has(clip.mediaId)) return;
      const inputIdx = mediaInputMap.get(clip.mediaId)!;
      const aLabel = `a_clip_${idx}`;
      const aFilters = [
        `atrim=start=${clip.trimStart}:end=${clip.trimStart + clip.duration}`,
        `asetpts=PTS-STARTPTS`,
        `volume=${clip.audio.volume}`,
        `adelay=${Math.round(clip.startTime * 1000)}|${Math.round(clip.startTime * 1000)}`,
      ];
      filterChains.push(`[${inputIdx}:a]${aFilters.join(',')}[${aLabel}]`);
      audioLabels.push(`[${aLabel}]`);
    });

    filterChains.push(`${audioLabels.join('')}amix=inputs=${audioLabels.length}:dropout_transition=2[a_final]`);
    audioOutLabel = 'a_final';
  }

  const filterComplex = filterChains.join(';\n');

  args.push('-filter_complex', filterComplex);
  args.push('-map', `[${videoOutLabel}]`);
  args.push('-map', `[${audioOutLabel}]`);

  // Codecs and quality
  if (settings.codec === 'h264') {
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
    if (settings.quality === 'maximum') args.push('-crf', '16', '-preset', 'slow');
    else if (settings.quality === 'high') args.push('-crf', '18', '-preset', 'medium');
    else if (settings.quality === 'medium') args.push('-crf', '22', '-preset', 'fast');
    else args.push('-crf', '26', '-preset', 'veryfast');
  } else if (settings.codec === 'vp9') {
    args.push('-c:v', 'libvpx-vp9', '-crf', '28', '-b:v', '0');
  }

  args.push('-c:a', settings.audioCodec === 'aac' ? 'aac' : 'pcm_s16le');
  args.push('-r', String(fps));
  args.push(`"${settings.outputFilename}.${settings.format}"`);

  const command = `ffmpeg ${args.join(' ')}`;

  return {
    command,
    args,
    filterComplex,
  };
}
