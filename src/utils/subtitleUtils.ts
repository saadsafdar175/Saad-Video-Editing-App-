import { SubtitleItem } from '../types/editor';

/**
 * Parses an SRT file string into SubtitleItem[]
 */
export function parseSRT(srtContent: string): SubtitleItem[] {
  const subtitles: SubtitleItem[] = [];
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Line 0: index (e.g. 1)
    // Line 1: timecodes (00:00:01,000 --> 00:00:04,000)
    // Line 2+: subtitle text
    let timeLineIdx = 1;
    if (lines[0].includes('-->')) {
      timeLineIdx = 0;
    }

    const timeLine = lines[timeLineIdx];
    const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!match) continue;

    const startH = parseInt(match[1], 10);
    const startM = parseInt(match[2], 10);
    const startS = parseInt(match[3], 10);
    const startMs = parseInt(match[4], 10);
    const startTime = startH * 3600 + startM * 60 + startS + startMs / 1000;

    const endH = parseInt(match[5], 10);
    const endM = parseInt(match[6], 10);
    const endS = parseInt(match[7], 10);
    const endMs = parseInt(match[8], 10);
    const endTime = endH * 3600 + endM * 60 + endS + endMs / 1000;

    const textLines = lines.slice(timeLineIdx + 1).join('\n').trim();
    if (textLines.length === 0) continue;

    subtitles.push({
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      startTime,
      endTime,
      text: textLines,
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 36,
      color: '#ffffff',
      positionY: 85,
    });
  }

  return subtitles;
}

/**
 * Formats SubtitleItem[] into standard SRT text format
 */
export function exportSRT(subtitles: SubtitleItem[]): string {
  const sorted = [...subtitles].sort((a, b) => a.startTime - b.startTime);
  const blocks: string[] = [];

  const formatSRTTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
  };

  sorted.forEach((sub, idx) => {
    blocks.push(`${idx + 1}\n${formatSRTTime(sub.startTime)} --> ${formatSRTTime(sub.endTime)}\n${sub.text}`);
  });

  return blocks.join('\n\n');
}
