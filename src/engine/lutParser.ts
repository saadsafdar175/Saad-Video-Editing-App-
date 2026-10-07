/**
 * Professional .CUBE 3D LUT Parser and Trilinear Interpolator for Saad Video Studio.
 * Operates 100% offline without network requests.
 */

export interface ParsedLUT {
  title: string;
  size: number;
  data: Float32Array; // Flattened size * size * size * 3 float array
}

export function parseCubeLUT(cubeContent: string): ParsedLUT {
  const lines = cubeContent.split(/\r?\n/);
  let size = 0;
  let title = 'Custom LUT';
  const dataValues: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('#')) continue;

    if (rawLine.startsWith('TITLE')) {
      const match = rawLine.match(/TITLE\s+"?([^"]+)"?/i);
      if (match) title = match[1];
      continue;
    }

    if (rawLine.startsWith('LUT_3D_SIZE')) {
      const parts = rawLine.split(/\s+/);
      size = parseInt(parts[1], 10);
      continue;
    }

    if (rawLine.startsWith('LUT_1D_SIZE')) {
      // Fallback 1D LUT size
      const parts = rawLine.split(/\s+/);
      size = parseInt(parts[1], 10);
      continue;
    }

    // Number lines (r g b)
    const tokens = rawLine.split(/\s+/).filter(Boolean);
    if (tokens.length >= 3) {
      const r = parseFloat(tokens[0]);
      const g = parseFloat(tokens[1]);
      const b = parseFloat(tokens[2]);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        dataValues.push(r, g, b);
      }
    }
  }

  if (size === 0) {
    // Infer size from cube root of triplet count
    const tripletCount = Math.floor(dataValues.length / 3);
    size = Math.round(Math.cbrt(tripletCount)) || 17;
  }

  const data = new Float32Array(dataValues);
  return { title, size, data };
}

/**
 * Trilinear interpolation sample from 3D LUT
 * Inputs: r, g, b in [0, 1]
 * Returns: [outR, outG, outB] in [0, 1]
 */
export function sample3DLUT(
  r: number,
  g: number,
  b: number,
  lut: Float32Array,
  size: number
): [number, number, number] {
  if (!lut || lut.length === 0 || size < 2) return [r, g, b];

  const maxIdx = size - 1;
  const rf = Math.max(0, Math.min(1, r)) * maxIdx;
  const gf = Math.max(0, Math.min(1, g)) * maxIdx;
  const bf = Math.max(0, Math.min(1, b)) * maxIdx;

  const r0 = Math.floor(rf);
  const r1 = Math.min(maxIdx, r0 + 1);
  const g0 = Math.floor(gf);
  const g1 = Math.min(maxIdx, g0 + 1);
  const b0 = Math.floor(bf);
  const b1 = Math.min(maxIdx, b0 + 1);

  const dr = rf - r0;
  const dg = gf - g0;
  const db = bf - b0;

  // Index helper: index = (r + g * size + b * size * size) * 3
  const getIndex = (ri: number, gi: number, bi: number) =>
    (ri + gi * size + bi * size * size) * 3;

  const i000 = getIndex(r0, g0, b0);
  const i100 = getIndex(r1, g0, b0);
  const i010 = getIndex(r0, g1, b0);
  const i110 = getIndex(r1, g1, b0);
  const i001 = getIndex(r0, g0, b1);
  const i101 = getIndex(r1, g0, b1);
  const i011 = getIndex(r0, g1, b1);
  const i111 = getIndex(r1, g1, b1);

  const out: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const c000 = lut[i000 + c] ?? 0;
    const c100 = lut[i100 + c] ?? 0;
    const c010 = lut[i010 + c] ?? 0;
    const c110 = lut[i110 + c] ?? 0;
    const c001 = lut[i001 + c] ?? 0;
    const c101 = lut[i101 + c] ?? 0;
    const c011 = lut[i011 + c] ?? 0;
    const c111 = lut[i111 + c] ?? 0;

    const c00 = c000 * (1 - dr) + c100 * dr;
    const c10 = c010 * (1 - dr) + c110 * dr;
    const c01 = c001 * (1 - dr) + c101 * dr;
    const c11 = c011 * (1 - dr) + c111 * dr;

    const c0 = c00 * (1 - dg) + c10 * dg;
    const c1 = c01 * (1 - dg) + c11 * dg;

    out[c] = c0 * (1 - db) + c1 * db;
  }

  return out;
}

/**
 * Procedural offline built-in cinematic LUT table generator (17x17x17)
 */
export function generateProceduralLUT(type: 'teal_orange' | 'kodak_2383' | 'matrix_green' | 'vintage_warm'): ParsedLUT {
  const size = 17;
  const totalEntries = size * size * size;
  const data = new Float32Array(totalEntries * 3);

  let ptr = 0;
  for (let b = 0; b < size; b++) {
    const bNorm = b / (size - 1);
    for (let g = 0; g < size; g++) {
      const gNorm = g / (size - 1);
      for (let r = 0; r < size; r++) {
        const rNorm = r / (size - 1);

        let outR = rNorm;
        let outG = gNorm;
        let outB = bNorm;

        if (type === 'teal_orange') {
          // Push shadows/mid-blues to cyan/teal, highlights/warm to amber/orange
          const luma = 0.299 * rNorm + 0.587 * gNorm + 0.114 * bNorm;
          if (luma < 0.5) {
            outR = Math.max(0, rNorm * 0.85);
            outG = Math.min(1, gNorm * 1.05);
            outB = Math.min(1, bNorm * 1.25);
          } else {
            outR = Math.min(1, rNorm * 1.2);
            outG = Math.min(1, gNorm * 1.05);
            outB = Math.max(0, bNorm * 0.8);
          }
        } else if (type === 'kodak_2383') {
          // Rich filmic DCI contrast curve, subtle yellow highlights, deep shadow density
          outR = Math.pow(rNorm, 1.1) * 1.05;
          outG = Math.pow(gNorm, 1.08);
          outB = Math.pow(bNorm, 1.2) * 0.95;
        } else if (type === 'matrix_green') {
          outR = rNorm * 0.85;
          outG = Math.min(1, gNorm * 1.25);
          outB = bNorm * 0.9;
        } else if (type === 'vintage_warm') {
          outR = Math.min(1, rNorm * 1.15 + 0.05);
          outG = Math.min(1, gNorm * 1.05 + 0.02);
          outB = Math.max(0, bNorm * 0.85);
        }

        data[ptr++] = Math.max(0, Math.min(1, outR));
        data[ptr++] = Math.max(0, Math.min(1, outG));
        data[ptr++] = Math.max(0, Math.min(1, outB));
      }
    }
  }

  const titles: Record<string, string> = {
    teal_orange: 'Teal & Orange Hollywood 3D LUT',
    kodak_2383: 'Kodak Vision3 2383 Print LUT',
    matrix_green: 'Cyber Cinematic Green LUT',
    vintage_warm: 'Vintage 70s Gold Film LUT',
  };

  return { title: titles[type] || 'Cinematic LUT', size, data };
}
