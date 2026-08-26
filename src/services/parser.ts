import type { ParsedSong } from '../types/spotify';

/**
 * Normaliza e limpa o texto das músicas
 */
export function cleanString(str: string): string {
  return str
    .replace(/^["'«“]/, '')
    .replace(/["'»”]$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove números de faixas no início (ex: "01. ", "1 - ", "12) ")
 */
export function stripTrackNumber(str: string): string {
  return str.replace(/^\s*(\d+[\.\-\)\:]|\(\d+\)|\[\d+\])\s*/, '').trim();
}

export type ParseFormat = 'auto' | 'artist_song' | 'song_artist';

/**
 * Analisa o texto de entrada linha por linha e extrai Artista e Nome da Música
 */
export function parseSongList(text: string, format: ParseFormat = 'auto'): ParsedSong[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const results: ParsedSong[] = [];

  for (let index = 0; index < lines.length; index++) {
    const rawLine = lines[index];
    const cleanedLine = stripTrackNumber(rawLine);

    let artist = '';
    let title = '';

    // Prioridades de separadores
    const separators = [' - ', ' – ', ' — ', '\t', ' : ', ' / ', ' | ', ' -- '];
    let matchedSeparator: string | null = null;

    for (const sep of separators) {
      if (cleanedLine.includes(sep)) {
        matchedSeparator = sep;
        break;
      }
    }

    if (matchedSeparator) {
      const parts = cleanedLine.split(matchedSeparator);
      const part1 = cleanString(parts[0]);
      const part2 = cleanString(parts.slice(1).join(matchedSeparator));

      if (format === 'song_artist') {
        title = part1;
        artist = part2;
      } else {
        artist = part1;
        title = part2;
      }
    } else if (cleanedLine.includes(',') && !cleanedLine.includes(' - ')) {
      const parts = cleanedLine.split(',');
      artist = cleanString(parts[0]);
      title = cleanString(parts.slice(1).join(','));
    } else if (cleanedLine.includes(':')) {
      const parts = cleanedLine.split(':');
      artist = cleanString(parts[0]);
      title = cleanString(parts.slice(1).join(':'));
    } else {
      title = cleanedLine;
      artist = '';
    }

    results.push({
      id: `song_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
      rawText: rawLine,
      artistQuery: artist,
      titleQuery: title,
      status: 'pending',
      confidence: 'medium',
      candidates: [],
    });
  }

  return results;
}
