/**
 * Professional Video Scopes Engine for Saad Video Studio.
 * Computes Histogram, Waveform, RGB Parade, and Vectorscope from current video frame offline.
 */

export type ScopeType = 'histogram' | 'waveform' | 'parade' | 'vectorscope';

export class ScopeEngine {
  /**
   * Downsamples source canvas to an ImageData buffer for high-fps scope calculations
   */
  static extractFrameData(sourceCanvas: HTMLCanvasElement): ImageData | null {
    try {
      const sampleW = 240;
      const sampleH = Math.round(240 * (sourceCanvas.height / (sourceCanvas.width || 1)));
      const offscreen = document.createElement('canvas');
      offscreen.width = sampleW;
      offscreen.height = sampleH;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(sourceCanvas, 0, 0, sampleW, sampleH);
      return ctx.getImageData(0, 0, sampleW, sampleH);
    } catch {
      return null;
    }
  }

  /**
   * Renders Histogram (RGB / Luminance)
   */
  static renderHistogram(targetCtx: CanvasRenderingContext2D, w: number, h: number, imgData: ImageData) {
    targetCtx.fillStyle = '#080a0f';
    targetCtx.fillRect(0, 0, w, h);

    const rBins = new Uint32Array(256);
    const gBins = new Uint32Array(256);
    const bBins = new Uint32Array(256);
    const lumaBins = new Uint32Array(256);

    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      rBins[r]++;
      gBins[g]++;
      bBins[b]++;
      lumaBins[luma]++;
    }

    // Find peak for normalization
    let max = 1;
    for (let i = 0; i < 256; i++) {
      if (rBins[i] > max) max = rBins[i];
      if (gBins[i] > max) max = gBins[i];
      if (bBins[i] > max) max = bBins[i];
    }

    // Grid lines (0, 64, 128, 192, 255)
    targetCtx.strokeStyle = '#18202c';
    targetCtx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach((frac) => {
      const x = frac * w;
      targetCtx.beginPath();
      targetCtx.moveTo(x, 0);
      targetCtx.lineTo(x, h);
      targetCtx.stroke();
    });

    // Draw Red, Green, Blue histograms
    const drawChannel = (bins: Uint32Array, color: string) => {
      targetCtx.beginPath();
      targetCtx.strokeStyle = color;
      targetCtx.lineWidth = 1.5;
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * w;
        const barH = (bins[i] / max) * (h - 10);
        const y = h - barH;
        if (i === 0) targetCtx.moveTo(x, y);
        else targetCtx.lineTo(x, y);
      }
      targetCtx.stroke();
    };

    targetCtx.globalCompositeOperation = 'screen';
    drawChannel(rBins, 'rgba(239, 68, 68, 0.8)');
    drawChannel(gBins, 'rgba(34, 197, 94, 0.8)');
    drawChannel(bBins, 'rgba(59, 130, 246, 0.8)');
    targetCtx.globalCompositeOperation = 'source-over';

    // Labels
    targetCtx.fillStyle = '#64748b';
    targetCtx.font = '9px monospace';
    targetCtx.fillText('0', 4, h - 4);
    targetCtx.fillText('128', w / 2 - 8, h - 4);
    targetCtx.fillText('255', w - 24, h - 4);
  }

  /**
   * Renders Waveform Monitor (IRE 0 to 100)
   */
  static renderWaveform(targetCtx: CanvasRenderingContext2D, w: number, h: number, imgData: ImageData) {
    targetCtx.fillStyle = '#080a0f';
    targetCtx.fillRect(0, 0, w, h);

    // Graticule IRE lines (0, 25, 50, 75, 100)
    targetCtx.strokeStyle = '#1a222e';
    targetCtx.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach((ire) => {
      const y = h - (ire / 100) * (h - 16) - 8;
      targetCtx.beginPath();
      targetCtx.moveTo(0, y);
      targetCtx.lineTo(w, y);
      targetCtx.stroke();

      targetCtx.fillStyle = '#475569';
      targetCtx.font = '8px monospace';
      targetCtx.fillText(`${ire}`, 4, y - 2);
    });

    const srcW = imgData.width;
    const srcH = imgData.height;
    const data = imgData.data;

    targetCtx.fillStyle = 'rgba(0, 229, 255, 0.15)';
    const scaleX = w / srcW;
    const usableH = h - 16;

    for (let y = 0; y < srcH; y += 2) {
      for (let x = 0; x < srcW; x += 2) {
        const idx = (y * srcW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        const plotX = x * scaleX;
        const plotY = h - (luma * usableH) - 8;
        targetCtx.fillRect(plotX, plotY, 1.5, 1.5);
      }
    }
  }

  /**
   * Renders RGB Parade (Red, Green, Blue columns)
   */
  static renderRGBParade(targetCtx: CanvasRenderingContext2D, w: number, h: number, imgData: ImageData) {
    targetCtx.fillStyle = '#080a0f';
    targetCtx.fillRect(0, 0, w, h);

    const colW = w / 3;
    const srcW = imgData.width;
    const srcH = imgData.height;
    const data = imgData.data;
    const usableH = h - 16;

    // Divider lines between channels
    targetCtx.strokeStyle = '#1f2937';
    targetCtx.lineWidth = 1;
    targetCtx.beginPath();
    targetCtx.moveTo(colW, 0);
    targetCtx.lineTo(colW, h);
    targetCtx.moveTo(colW * 2, 0);
    targetCtx.lineTo(colW * 2, h);
    targetCtx.stroke();

    // Red Channel
    targetCtx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    for (let y = 0; y < srcH; y += 3) {
      for (let x = 0; x < srcW; x += 3) {
        const idx = (y * srcW + x) * 4;
        const val = data[idx] / 255;
        const px = (x / srcW) * colW;
        const py = h - (val * usableH) - 8;
        targetCtx.fillRect(px, py, 1.5, 1.5);
      }
    }

    // Green Channel
    targetCtx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    for (let y = 0; y < srcH; y += 3) {
      for (let x = 0; x < srcW; x += 3) {
        const idx = (y * srcW + x) * 4;
        const val = data[idx + 1] / 255;
        const px = colW + (x / srcW) * colW;
        const py = h - (val * usableH) - 8;
        targetCtx.fillRect(px, py, 1.5, 1.5);
      }
    }

    // Blue Channel
    targetCtx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    for (let y = 0; y < srcH; y += 3) {
      for (let x = 0; x < srcW; x += 3) {
        const idx = (y * srcW + x) * 4;
        const val = data[idx + 2] / 255;
        const px = colW * 2 + (x / srcW) * colW;
        const py = h - (val * usableH) - 8;
        targetCtx.fillRect(px, py, 1.5, 1.5);
      }
    }

    // Header labels
    targetCtx.font = 'bold 9px monospace';
    targetCtx.fillStyle = '#ef4444';
    targetCtx.fillText('RED', 6, 12);
    targetCtx.fillStyle = '#22c55e';
    targetCtx.fillText('GREEN', colW + 6, 12);
    targetCtx.fillStyle = '#3b82f6';
    targetCtx.fillText('BLUE', colW * 2 + 6, 12);
  }

  /**
   * Renders Vectorscope with color targets and Skin Tone I-Line
   */
  static renderVectorscope(targetCtx: CanvasRenderingContext2D, w: number, h: number, imgData: ImageData) {
    targetCtx.fillStyle = '#080a0f';
    targetCtx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 14;

    // Crosshairs and outer circle
    targetCtx.strokeStyle = '#1b2330';
    targetCtx.lineWidth = 1;
    targetCtx.beginPath();
    targetCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    targetCtx.moveTo(cx - radius, cy);
    targetCtx.lineTo(cx + radius, cy);
    targetCtx.moveTo(cx, cy - radius);
    targetCtx.lineTo(cx, cy + radius);
    targetCtx.stroke();

    // 75% Reference Ring
    targetCtx.beginPath();
    targetCtx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
    targetCtx.stroke();

    // Skin Tone Indicator Line (approx ~123 degrees / top-left quadrant)
    const skinAngle = (123 * Math.PI) / 180;
    targetCtx.strokeStyle = 'rgba(251, 146, 60, 0.4)';
    targetCtx.setLineDash([3, 3]);
    targetCtx.beginPath();
    targetCtx.moveTo(cx, cy);
    targetCtx.lineTo(cx - Math.cos(skinAngle) * radius, cy - Math.sin(skinAngle) * radius);
    targetCtx.stroke();
    targetCtx.setLineDash([]);

    targetCtx.fillStyle = '#fb923c';
    targetCtx.font = '8px monospace';
    targetCtx.fillText('SKIN', cx - radius * 0.75, cy - radius * 0.45);

    // Color Targets: R, Mg, B, Cy, G, Yl
    const targets = [
      { name: 'R', angle: 104, color: '#ef4444' },
      { name: 'Mg', angle: 61, color: '#ec4899' },
      { name: 'B', angle: 348, color: '#3b82f6' },
      { name: 'Cy', angle: 284, color: '#06b6d4' },
      { name: 'G', angle: 241, color: '#22c55e' },
      { name: 'Yl', angle: 168, color: '#eab308' },
    ];

    targets.forEach((t) => {
      const rad = (t.angle * Math.PI) / 180;
      const tx = cx + Math.cos(rad) * (radius * 0.75);
      const ty = cy - Math.sin(rad) * (radius * 0.75);
      targetCtx.strokeStyle = t.color;
      targetCtx.strokeRect(tx - 3, ty - 3, 6, 6);
      targetCtx.fillStyle = t.color;
      targetCtx.font = '8px monospace';
      targetCtx.fillText(t.name, tx + 5, ty + 3);
    });

    // Plot Chrominance data points
    const data = imgData.data;
    targetCtx.fillStyle = 'rgba(250, 204, 21, 0.12)';

    for (let i = 0; i < data.length; i += 8) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert RGB to YCbCr
      const cb = -0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 0.5 * r - 0.418688 * g - 0.081312 * b;

      const px = cx + (cb / 128) * radius * 0.9;
      const py = cy - (cr / 128) * radius * 0.9;

      targetCtx.fillRect(px, py, 1.5, 1.5);
    }
  }
}
