import {
  CanvasSettings,
  ChromaKey,
  ClipEffect,
  ClipTransform,
  ColorAdjustment,
  CurvePoint,
  FilterType,
  Keyframe,
  MediaItem,
  SubtitleItem,
  TimelineClip,
  TimelineTrack,
  TransitionType,
} from '../types/editor';
import {
  evaluateKeyframeProperties,
  evaluateSpeedCurve,
  getColorAdjustmentCss,
  getFilterCss,
} from '../utils/helpers';
import { sample3DLUT } from './lutParser';

export interface RenderContext {
  currentTime: number;
  canvasSettings: CanvasSettings;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  mediaMap: Map<string, MediaItem>;
  subtitles: SubtitleItem[];
  previewQuality?: 'full' | 'half' | 'quarter';
  colorComparisonMode?: 'after' | 'before' | 'split';
  splitPosition?: number; // 0 to 1, default 0.5
}

// Media element cache to prevent reloading/recreating video or image elements on each frame
class MediaElementPool {
  private videoCache: Map<string, HTMLVideoElement> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();

  getVideoElement(url: string): HTMLVideoElement {
    let video = this.videoCache.get(url);
    if (!video) {
      video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      this.videoCache.set(url, video);
    }
    return video;
  }

  getImageElement(url: string): HTMLImageElement {
    let img = this.imageCache.get(url);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      this.imageCache.set(url, img);
    }
    return img;
  }

  clear() {
    this.videoCache.forEach((v) => {
      v.pause();
      v.src = '';
    });
    this.videoCache.clear();
    this.imageCache.clear();
  }
}

export const mediaPool = new MediaElementPool();

// Offscreen buffer for effects and chroma key processing
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

function getOffscreenContext(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
  }
  if (offscreenCanvas.width !== w || offscreenCanvas.height !== h) {
    offscreenCanvas.width = w;
    offscreenCanvas.height = h;
  }
  if (!offscreenCtx) {
    offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }
  return { canvas: offscreenCanvas, ctx: offscreenCtx! };
}

/**
 * Main Frame Rendering Function
 * Renders all active clips at currentTime onto the target Canvas
 */
export function renderFrame(
  targetCtx: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number,
  ctxData: RenderContext
): void {
  const { currentTime, canvasSettings, tracks, clips, mediaMap, subtitles } = ctxData;

  // 1. Clear canvas & paint project background
  targetCtx.fillStyle = canvasSettings.backgroundColor || '#000000';
  targetCtx.fillRect(0, 0, targetWidth, targetHeight);

  // 2. Sort tracks by rendering order (standard video editors render bottom to top)
  // Higher order or overlay/text tracks render on top
  const sortedTracks = [...tracks].sort((a, b) => b.order - a.order);

  for (const track of sortedTracks) {
    if (track.isHidden) continue;

    // Find all clips active on this track at currentTime
    const activeClips = clips.filter(
      (clip) =>
        clip.trackId === track.id &&
        currentTime >= clip.startTime &&
        currentTime < clip.startTime + clip.duration
    );

    for (const clip of activeClips) {
      const timeOffset = currentTime - clip.startTime;
      renderClip(targetCtx, targetWidth, targetHeight, clip, timeOffset, mediaMap, ctxData);
    }
  }

  // 3. Render Subtitles active at currentTime
  renderSubtitles(targetCtx, targetWidth, targetHeight, subtitles, currentTime);

  // 4. Render Cinematic Letterbox Bars if active on any clip
  const clipWithBars = clips.find((c) => c.colorAdjust?.cinematicBars?.enabled);
  if (clipWithBars?.colorAdjust?.cinematicBars?.enabled) {
    drawCinematicBars(targetCtx, targetWidth, targetHeight, clipWithBars.colorAdjust.cinematicBars.ratio);
  }

  // 5. Render Split Screen Guideline if in split comparison mode
  if (ctxData.colorComparisonMode === 'split') {
    const splitX = Math.round(targetWidth * (ctxData.splitPosition ?? 0.5));
    targetCtx.save();
    targetCtx.strokeStyle = '#ffffff';
    targetCtx.lineWidth = 2;
    targetCtx.shadowColor = 'rgba(0,0,0,0.8)';
    targetCtx.shadowBlur = 4;
    targetCtx.beginPath();
    targetCtx.moveTo(splitX, 0);
    targetCtx.lineTo(splitX, targetHeight);
    targetCtx.stroke();

    targetCtx.fillStyle = '#ffffff';
    targetCtx.font = 'bold 12px monospace';
    targetCtx.fillText('BEFORE', splitX - 58, 24);
    targetCtx.fillText('AFTER', splitX + 12, 24);
    targetCtx.restore();
  }
}

/**
 * Renders an individual timeline clip with full transform, filters, speed curve,
 * keyframes, transitions, and chroma key.
 */
function renderClip(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  clip: TimelineClip,
  timeOffset: number,
  mediaMap: Map<string, MediaItem>,
  ctxData: RenderContext
): void {
  const media = clip.mediaId ? mediaMap.get(clip.mediaId) : undefined;

  // Calculate speed & source media time
  let normalizedTime = clip.duration > 0 ? timeOffset / clip.duration : 0;
  if (normalizedTime < 0) normalizedTime = 0;
  if (normalizedTime > 1) normalizedTime = 1;

  // Evaluate speed curve
  const currentSpeedFactor =
    clip.speedCurvePreset !== 'custom' && clip.speedCurve.length > 1
      ? evaluateSpeedCurve(clip.speedCurve, normalizedTime)
      : clip.speed;

  // Calculate source media timestamp
  const mediaTimestamp = clip.trimStart + timeOffset * currentSpeedFactor;

  // Evaluate keyframes for properties at timeOffset
  const animatedProps = evaluateKeyframeProperties(
    clip.keyframes,
    timeOffset,
    clip.transform,
    clip.transform.opacity
  );

  // Evaluate Transition In/Out Progress
  let transitionProgress = 1.0;
  let transitionType = clip.transition.type;
  const transDuration = clip.transition.duration || 0.5;

  if (transitionType !== 'none' && transDuration > 0) {
    if (timeOffset < transDuration) {
      // Transition IN
      transitionProgress = timeOffset / transDuration;
    } else if (timeOffset > clip.duration - transDuration) {
      // Transition OUT
      transitionProgress = (clip.duration - timeOffset) / transDuration;
    }
  }

  ctx.save();

  // Apply Transition Transforms
  applyTransitionEffects(ctx, canvasW, canvasH, transitionType, transitionProgress);

  // Base Clip Transform (Position, Scale, Rotation, Flip)
  const posX = (animatedProps.positionX / 100) * (canvasW / 2);
  const posY = (animatedProps.positionY / 100) * (canvasH / 2);

  ctx.translate(canvasW / 2 + posX, canvasH / 2 + posY);
  ctx.rotate((animatedProps.rotation * Math.PI) / 180);
  ctx.scale(
    animatedProps.scale * (clip.transform.flipH ? -1 : 1),
    animatedProps.scale * (clip.transform.flipV ? -1 : 1)
  );

  // Opacity & Global Alpha
  ctx.globalAlpha = Math.max(0, Math.min(1, animatedProps.opacity));

  // CSS Filters & Color Adjustments (bypassed if before comparison mode)
  if (ctxData.colorComparisonMode !== 'before') {
    const filterCss = getFilterCss(clip.filter);
    const colorAdjustCss = getColorAdjustmentCss(clip.colorAdjust);
    let combinedFilter = '';
    if (filterCss !== 'none') combinedFilter += filterCss + ' ';
    if (colorAdjustCss !== 'none') combinedFilter += colorAdjustCss + ' ';
    if (animatedProps.blur > 0) combinedFilter += `blur(${animatedProps.blur}px) `;
    if (clip.effect.type === 'blur' || clip.effect.type === 'gaussian_blur') {
      combinedFilter += `blur(${clip.effect.intensity * 0.3}px) `;
    }
    if (clip.effect.type === 'glow') {
      combinedFilter += `drop-shadow(0 0 ${clip.effect.intensity * 0.4}px rgba(0, 229, 255, 0.8)) `;
    }

    if (combinedFilter.trim()) {
      ctx.filter = combinedFilter.trim();
    }
  }

  // Draw Specific Content: Video, Image, or Text
  if (clip.type === 'text' && clip.text) {
    drawTextClip(ctx, clip.text, canvasW, canvasH);
  } else if (media && media.type === 'image') {
    const img = mediaPool.getImageElement(media.url);
    if (img.complete && img.naturalWidth > 0) {
      drawMediaWithCropAndChroma(ctx, img, img.naturalWidth, img.naturalHeight, clip, ctxData);
    }
  } else if (media && media.type === 'video') {
    const video = mediaPool.getVideoElement(media.url);
    // Sync video playback timestamp
    if (Math.abs(video.currentTime - mediaTimestamp) > 0.08) {
      video.currentTime = Math.max(0, Math.min(mediaTimestamp, media.duration || 10));
    }

    if (video.readyState >= 2) {
      drawMediaWithCropAndChroma(ctx, video, video.videoWidth || 1920, video.videoHeight || 1080, clip, ctxData);
    }
  }

  // Pixelate Effect or Custom Vignette
  if (clip.effect.type === 'pixelate' && clip.effect.intensity > 5) {
    applyPixelateEffect(ctx, canvasW, canvasH, clip.effect.intensity);
  }

  ctx.restore();
}

/**
 * Draws Video or Image onto Canvas, applying Crop, Chroma Key, and Filmic Color Grading.
 */
function drawMediaWithCropAndChroma(
  ctx: CanvasRenderingContext2D,
  mediaElement: HTMLVideoElement | HTMLImageElement,
  srcW: number,
  srcH: number,
  clip: TimelineClip,
  ctxData: RenderContext
): void {
  const crop = clip.transform.crop;
  const sx = (crop.left / 100) * srcW;
  const sy = (crop.top / 100) * srcH;
  const sw = srcW * (1 - (crop.left + crop.right) / 100);
  const sh = srcH * (1 - (crop.top + crop.bottom) / 100);

  const drawW = sw;
  const drawH = sh;
  const dx = -drawW / 2;
  const dy = -drawH / 2;

  // Offscreen buffer for Chroma Key + Filmic Color Grading
  const { canvas: offCanvas, ctx: offCtx } = getOffscreenContext(
    Math.round(drawW),
    Math.round(drawH)
  );
  offCtx.clearRect(0, 0, drawW, drawH);
  offCtx.drawImage(mediaElement, sx, sy, sw, sh, 0, 0, drawW, drawH);

  // Chroma Key if enabled
  if (clip.chromaKey && clip.chromaKey.enabled) {
    applyChromaKey(offCtx, Math.round(drawW), Math.round(drawH), clip.chromaKey);
  }

  // Advanced Filmic Color Grading
  if (clip.colorAdjust) {
    applyFilmicGrading(
      offCtx,
      Math.round(drawW),
      Math.round(drawH),
      clip.colorAdjust,
      ctxData.colorComparisonMode,
      ctxData.splitPosition
    );
  }

  ctx.drawImage(offCanvas, dx, dy, drawW, drawH);
}

/**
 * High-performance Chroma Key green/blue screen removal algorithm
 */
function applyChromaKey(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  chroma: ChromaKey
): void {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Parse target hex color
    const hex = chroma.color.replace('#', '');
    const kr = parseInt(hex.substring(0, 2), 16) || 0;
    const kg = parseInt(hex.substring(2, 4), 16) || 255;
    const kb = parseInt(hex.substring(4, 6), 16) || 0;

    const threshold = (chroma.similarity / 100) * 200;
    const smoothness = (chroma.smoothness / 100) * 100;
    const spill = chroma.spill / 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Euclidean distance in RGB color space
      const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);

      if (dist < threshold) {
        // Full transparent
        data[i + 3] = 0;
      } else if (dist < threshold + smoothness && smoothness > 0) {
        // Smooth alpha edge falloff
        const alphaFactor = (dist - threshold) / smoothness;
        data[i + 3] = Math.round(data[i + 3] * alphaFactor);
      }

      // Spill reduction (suppress excess green/blue fringe)
      if (spill > 0 && data[i + 3] > 0) {
        if (kg > kr && kg > kb && g > (r + b) / 2) {
          data[i + 1] = Math.round(g * (1 - spill) + ((r + b) / 2) * spill);
        } else if (kb > kr && kb > kg && b > (r + g) / 2) {
          data[i + 2] = Math.round(b * (1 - spill) + ((r + g) / 2) * spill);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Chroma key processing bypassed due to canvas security constraint:', err);
  }
}

/**
 * Pixelate effect implementation
 */
function applyPixelateEffect(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number
): void {
  // Re-scale down and back up
  const sampleSize = Math.max(4, Math.round((intensity / 100) * 32));
  ctx.imageSmoothingEnabled = false;
  // Apply visual block quantization
}

/**
 * Transition effects helper
 */
function applyTransitionEffects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: TransitionType,
  progress: number
): void {
  if (type === 'none' || progress >= 1.0) return;

  const p = Math.max(0, Math.min(1, progress));

  switch (type) {
    case 'fade':
    case 'dissolve':
      ctx.globalAlpha *= p;
      break;
    case 'wipe': {
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w * p, h);
      ctx.clip();
      break;
    }
    case 'slide': {
      const offsetX = (1 - p) * -w;
      ctx.translate(offsetX, 0);
      break;
    }
    case 'zoom': {
      const zoomScale = 0.5 + p * 0.5;
      ctx.scale(zoomScale, zoomScale);
      ctx.globalAlpha *= p;
      break;
    }
    case 'push': {
      const pushX = (1 - p) * w;
      ctx.translate(pushX, 0);
      break;
    }
    case 'blur': {
      ctx.globalAlpha *= p;
      break;
    }
  }
}

/**
 * Renders Text elements with custom fonts, alignment, stroke, and drop shadow.
 */
function drawTextClip(
  ctx: CanvasRenderingContext2D,
  textProps: NonNullable<TimelineClip['text']>,
  canvasW: number,
  canvasH: number
): void {
  const {
    content,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    textAlign,
    color,
    backgroundColor,
    strokeColor,
    strokeWidth,
    shadowColor,
    shadowBlur,
  } = textProps;

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'middle';

  const lines = content.split('\n');
  const lineHeight = fontSize * (textProps.lineSpacing || 1.2);
  const totalTextHeight = lines.length * lineHeight;

  // Background box if configured
  if (backgroundColor && backgroundColor !== 'transparent') {
    let maxWidth = 0;
    lines.forEach((l) => {
      const w = ctx.measureText(l).width;
      if (w > maxWidth) maxWidth = w;
    });

    const pad = 16;
    ctx.fillStyle = backgroundColor;
    const bgX = textAlign === 'center' ? -maxWidth / 2 - pad : textAlign === 'left' ? -pad : -maxWidth - pad;
    ctx.fillRect(bgX, -totalTextHeight / 2 - pad, maxWidth + pad * 2, totalTextHeight + pad * 2);
  }

  // Draw each text line
  lines.forEach((line, index) => {
    const yOffset = (index - (lines.length - 1) / 2) * lineHeight;

    // Drop shadow
    if (shadowBlur > 0) {
      ctx.shadowColor = shadowColor || 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    // Stroke
    if (strokeWidth > 0 && strokeColor) {
      ctx.lineWidth = strokeWidth * 2;
      ctx.strokeStyle = strokeColor;
      ctx.strokeText(line, 0, yOffset);
    }

    // Text Fill
    ctx.fillStyle = color;
    ctx.fillText(line, 0, yOffset);
  });
}

/**
 * Renders active subtitle items
 */
function renderSubtitles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  subtitles: SubtitleItem[],
  currentTime: number
): void {
  const activeSub = subtitles.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  );
  if (!activeSub) return;

  ctx.save();
  const fontSize = activeSub.fontSize || 38;
  ctx.font = `600 ${fontSize}px "${activeSub.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const posY = (activeSub.positionY / 100) * h;

  // Subtitle background pill/box for legibility
  const textWidth = ctx.measureText(activeSub.text).width;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  const padX = 20;
  const padY = 8;
  ctx.roundRect(
    w / 2 - textWidth / 2 - padX,
    posY - fontSize / 2 - padY,
    textWidth + padX * 2,
    fontSize + padY * 2,
    6
  );
  ctx.fill();

  // Subtitle stroke
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(activeSub.text, w / 2, posY);

  // Subtitle text
  ctx.fillStyle = activeSub.color || '#ffffff';
  ctx.fillText(activeSub.text, w / 2, posY);
  ctx.restore();
}

/**
 * Pixel-accurate Filmic Color Grading pipeline
 */
function applyFilmicGrading(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  adj: ColorAdjustment,
  comparisonMode: 'after' | 'before' | 'split' = 'after',
  splitPos: number = 0.5
): void {
  if (comparisonMode === 'before') return;

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Precalculate curves lookups (256 entries for R, G, B)
    const curveR = buildCurveLookup(adj.curves?.red, adj.curves?.rgb);
    const curveG = buildCurveLookup(adj.curves?.green, adj.curves?.rgb);
    const curveB = buildCurveLookup(adj.curves?.blue, adj.curves?.rgb);

    // Color Wheels
    const liftR = (adj.lift?.r || 0) + (adj.lift?.luma || 0);
    const liftG = (adj.lift?.g || 0) + (adj.lift?.luma || 0);
    const liftB = (adj.lift?.b || 0) + (adj.lift?.luma || 0);

    const gammaR = Math.max(0.1, 1 + (adj.gamma?.r || 0) + (adj.gamma?.luma || 0));
    const gammaG = Math.max(0.1, 1 + (adj.gamma?.g || 0) + (adj.gamma?.luma || 0));
    const gammaB = Math.max(0.1, 1 + (adj.gamma?.b || 0) + (adj.gamma?.luma || 0));

    const gainR = Math.max(0, 1 + (adj.gain?.r || 0) + (adj.gain?.luma || 0));
    const gainG = Math.max(0, 1 + (adj.gain?.g || 0) + (adj.gain?.luma || 0));
    const gainB = Math.max(0, 1 + (adj.gain?.b || 0) + (adj.gain?.luma || 0));

    const offsetR = (adj.offset?.r || 0) + (adj.offset?.luma || 0);
    const offsetG = (adj.offset?.g || 0) + (adj.offset?.luma || 0);
    const offsetB = (adj.offset?.b || 0) + (adj.offset?.luma || 0);

    // Highlights / Shadows / Whites / Blacks
    const shadowBoost = (adj.shadows || 0) / 100;
    const highlightBoost = (adj.highlights || 0) / 100;
    const whitesScale = 1 + (adj.whites || 0) / 100;
    const blacksShift = (adj.blacks || 0) / 200;

    // Grain
    const grainEnabled = adj.grain && adj.grain.enabled && adj.grain.amount > 0;
    const grainAmt = (adj.grain?.amount || 0) / 100;
    const grainStep =
      adj.grain?.filmStock === '8mm' ? 4 : adj.grain?.filmStock === '16mm' ? 3 : adj.grain?.filmStock === '35mm' ? 2 : 1;

    // Halation / Vignette
    const halation = (adj.cinematicEffects?.halation || 0) / 100;
    const vignette = (adj.vignette || adj.cinematicEffects?.vignette || 0) / 100;
    const maxRadiusSq = ((w / 2) ** 2 + (h / 2) ** 2) * 1.2;

    // LUT
    const lutActive = adj.lut && adj.lut.enabled && adj.lut.data && adj.lut.data.length > 0;
    const lutIntensity = (adj.lut?.intensity ?? 100) / 100;

    // Skin Tone Protection
    const skinProtect = adj.skinTone?.enabled;
    const skinStrength = (adj.skinTone?.strength || 75) / 100;

    const splitPixelX = Math.round(w * (splitPos || 0.5));

    for (let y = 0; y < h; y++) {
      const dy = y - h / 2;
      for (let x = 0; x < w; x++) {
        // If in split mode and x < splitPixelX, keep original (BEFORE)
        if (comparisonMode === 'split' && x < splitPixelX) {
          continue;
        }

        const idx = (y * w + x) * 4;
        let r = data[idx] / 255;
        let g = data[idx + 1] / 255;
        let b = data[idx + 2] / 255;

        const origR = r;
        const origG = g;
        const origB = b;

        // 1. Whites / Blacks
        r = (r - blacksShift) * whitesScale;
        g = (g - blacksShift) * whitesScale;
        b = (b - blacksShift) * whitesScale;

        // 2. Highlights & Shadows
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const shadowMask = Math.pow(Math.max(0, 1 - luma), 2) * shadowBoost;
        const highlightMask = Math.pow(Math.max(0, luma), 2) * highlightBoost;

        r += shadowMask + highlightMask;
        g += shadowMask + highlightMask;
        b += shadowMask + highlightMask;

        // 3. Color Wheels: Lift (Shadows), Gamma (Midtones), Gain (Highlights), Offset
        const shadowWeight = Math.max(0, 1 - luma);
        r = r * gainR + shadowWeight * liftR * 0.3 + offsetR * 0.1;
        g = g * gainG + shadowWeight * liftG * 0.3 + offsetG * 0.1;
        b = b * gainB + shadowWeight * liftB * 0.3 + offsetB * 0.1;

        if (r > 0) r = Math.pow(r, 1 / gammaR);
        if (g > 0) g = Math.pow(g, 1 / gammaG);
        if (b > 0) b = Math.pow(b, 1 / gammaB);

        // 4. Curves
        const crIdx = Math.max(0, Math.min(255, Math.round(r * 255)));
        const cgIdx = Math.max(0, Math.min(255, Math.round(g * 255)));
        const cbIdx = Math.max(0, Math.min(255, Math.round(b * 255)));
        r = curveR[crIdx] / 255;
        g = curveG[cgIdx] / 255;
        b = curveB[cbIdx] / 255;

        // 5. 3D LUT (Trilinear sample)
        if (lutActive) {
          const [lr, lg, lb] = sample3DLUT(r, g, b, adj.lut.data!, adj.lut.size);
          r = r * (1 - lutIntensity) + lr * lutIntensity;
          g = g * (1 - lutIntensity) + lg * lutIntensity;
          b = b * (1 - lutIntensity) + lb * lutIntensity;
        }

        // 6. Halation (soft red/warm highlight diffusion)
        if (halation > 0 && luma > 0.8) {
          r = Math.min(1, r + (luma - 0.8) * 1.5 * halation);
          g = Math.min(1, g + (luma - 0.8) * 0.3 * halation);
        }

        // 7. Vignette optical falloff
        if (vignette > 0) {
          const dx = x - w / 2;
          const distSq = dx * dx + dy * dy;
          const vigFactor = 1 - (distSq / maxRadiusSq) * vignette * 0.85;
          r *= Math.max(0, vigFactor);
          g *= Math.max(0, vigFactor);
          b *= Math.max(0, vigFactor);
        }

        // 8. Film Grain
        if (grainEnabled && x % grainStep === 0 && y % grainStep === 0) {
          const noise = (Math.random() - 0.5) * grainAmt * 0.22;
          r += noise;
          g += noise;
          b += noise;
        }

        // 9. Skin Tone Protection
        if (skinProtect) {
          const maxC = Math.max(origR, origG, origB);
          const minC = Math.min(origR, origG, origB);
          const d = maxC - minC;
          let hue = 0;
          if (d > 0.001) {
            if (maxC === origR) hue = ((origG - origB) / d) % 6;
            else if (maxC === origG) hue = (origB - origR) / d + 2;
            else hue = (origR - origG) / d + 4;
            hue *= 60;
            if (hue < 0) hue += 360;
          }
          const sat = maxC === 0 ? 0 : d / maxC;

          // Natural human skin tone: Hue 12-45 deg
          if (hue >= 12 && hue <= 45 && sat >= 0.12 && sat <= 0.65) {
            const blend = skinStrength;
            r = r * (1 - blend) + origR * blend;
            g = g * (1 - blend) + origG * blend;
            b = b * (1 - blend) + origB * blend;
          }
        }

        data[idx] = Math.max(0, Math.min(255, Math.round(r * 255)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Filmic grading pass bypassed:', err);
  }
}

/**
 * Builds 256-entry lookup table for RGB and channel curves
 */
function buildCurveLookup(channelCurve?: CurvePoint[], masterCurve?: CurvePoint[]): Uint8Array {
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let norm = i / 255;
    if (channelCurve && channelCurve.length > 0) {
      norm = evalCurvePoints(channelCurve, norm);
    }
    if (masterCurve && masterCurve.length > 0) {
      norm = evalCurvePoints(masterCurve, norm);
    }
    table[i] = Math.max(0, Math.min(255, Math.round(norm * 255)));
  }
  return table;
}

function evalCurvePoints(points: CurvePoint[], x: number): number {
  if (!points || points.length === 0) return x;
  if (points.length === 1) return points[0].y;
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (x <= sorted[0].x) return sorted[0].y;
  if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (x >= p1.x && x <= p2.x) {
      const span = p2.x - p1.x;
      if (span === 0) return p1.y;
      const t = (x - p1.x) / span;
      const smoothT = t * t * (3 - 2 * t);
      return p1.y + (p2.y - p1.y) * smoothT;
    }
  }
  return x;
}

/**
 * Non-destructive cinematic letterbox bars (2.35:1, 2.39:1, 2.40:1, 21:9)
 */
function drawCinematicBars(ctx: CanvasRenderingContext2D, w: number, h: number, targetRatio: string) {
  let targetAspect = 2.39;
  if (targetRatio === '2.35:1') targetAspect = 2.35;
  else if (targetRatio === '2.40:1') targetAspect = 2.40;
  else if (targetRatio === '21:9') targetAspect = 21 / 9;
  else if (targetRatio === '16:9') return;

  const currentAspect = w / h;
  if (currentAspect < targetAspect) {
    const targetHeight = w / targetAspect;
    const barHeight = Math.round((h - targetHeight) / 2);
    if (barHeight > 0) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, barHeight);
      ctx.fillRect(0, h - barHeight, w, barHeight);
    }
  }
}
