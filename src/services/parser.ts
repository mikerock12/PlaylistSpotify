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
 * Remove minutagens / timestamps (ex: "0:47", "17:57", "01:15:30", "[17:57]", "(17:57)")
 * e números de faixas no início ou fim da linha.
 */
export function stripTimestampsAndTrackNumbers(str: string): { cleaned: string; hasTimestamp: boolean } {
  let s = str.trim();
  let hasTimestamp = false;

  // 1. Remove números de faixas no início (ex: "01. ", "1 - ", "12) ")
  // CUIDADO: \d+:(?!\d) só remove dois pontos se NÃO for seguido de dígitos de minutagem!
  s = s.replace(/^\s*(?:\d+[.)-]|\(\d+\)|\[\d+\]|\d+:(?!\d))\s*/, '').trim();

  // 2. Remove timestamp no início (ex: "0:47", "17:57", "1:15:30", "[17:57]", "(17:57)", "【17:57】")
  const leadingTimestampRegex = /^\s*(?:\[|\(|【)?\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:\]|\)|】)?\s*[-–—:|.]*\s*/;
  if (leadingTimestampRegex.test(s)) {
    hasTimestamp = true;
    s = s.replace(leadingTimestampRegex, '').trim();
  }

  // 3. Remove número de faixa se colocado após o timestamp (ex: "0:47 - 1. Monarchy of Roses")
  s = s.replace(/^\s*(?:\d+[.)-]|\(\d+\)|\[\d+\]|\d+:(?!\d))\s*/, '').trim();

  // 4. Remove timestamp no fim da linha (ex: "Look Around 17:57", "Look Around (17:57)", "Look Around [17:57]")
  const trailingTimestampRegex = /\s*(?:[-–—:|.]*\s*)?(?:\[|\(|【)?\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:\]|\)|】)?\s*$/;
  if (trailingTimestampRegex.test(s)) {
    hasTimestamp = true;
    s = s.replace(trailingTimestampRegex, '').trim();
  }

  // 5. Remove caracteres de lista soltos no início ou fim
  s = s.replace(/^[\s-–—•*~|]+/, '').replace(/[\s-–—•*~|]+$/, '').trim();

  return { cleaned: s, hasTimestamp };
}

/**
 * Remove números de faixas no início
 */
export function stripTrackNumber(str: string): string {
  return stripTimestampsAndTrackNumbers(str).cleaned;
}

/**
 * Verifica se a linha é um cabeçalho/metadado a ser ignorado (ex: "Setlist:", visualizações, etc.)
 */
export function isIgnoredHeaderLine(line: string): boolean {
  const norm = cleanString(line).toLowerCase();
  if (!norm) return true;

  // Linhas típicas de cabeçalho de setlist
  if (/^(set\s*list|track\s*list|playlist|faixas|músicas|musicas|songs|tracks)(\s*[:-–—].*)?$/i.test(norm)) {
    return true;
  }

  // Informações de vídeo do YouTube (visualizações, data, inscrições)
  if (/visualizaç(?:ão|ões)|views|inscritos|subscribers|inscrever-se|subscribe|inscreva-se/i.test(norm)) {
    return true;
  }

  // Links HTTP
  if (/^https?:\/\//i.test(norm)) {
    return true;
  }

  // Linhas de créditos do vídeo ou filmes
  if (/^(from the basement|the coda collection|the coda collection films|coda collection|official video|full concert|show completo|gravação ao vivo|gravacao ao vivo)/i.test(norm)) {
    return true;
  }

  return false;
}

/**
 * Frases que identificam com segurança o título de um show/vídeo, e não uma música.
 * Ex: "MTV Unplugged in New York (Full Concert)", "LIVE HD (From The Basement 2012)"
 */
const SHOW_TITLE_STRONG =
  /\b(?:full\s+(?:concert|album|show|set)|live\s+(?:at|in|from|hd|session)|ao\s+vivo|show\s+completo|grava(?:ç|c)(?:ã|a)o\s+ao\s+vivo|unplugged|from\s+the\s+basement|the\s+coda|official\s+(?:video|concert|live)|setlist)\b/i;

/**
 * Palavras que só indicam um show quando acompanhadas de contexto (ano, HD, "full").
 * Sozinhas seriam ambíguas: "Oasis - Live Forever" é uma música, não um show.
 */
const SHOW_TITLE_WEAK = /\b(?:live|concert|concerto|tour|festival|acoustic|ac(?:ú|u)stico)\b/i;
const SHOW_TITLE_CONTEXT = /\b(?:19|20)\d{2}\b|\bHD\b|\b4K\b|\bfull\b/i;

/**
 * Decide se o trecho após o separador descreve um show, e não o nome de uma música
 */
export function isShowTitleRemainder(remainder: string): boolean {
  const s = remainder.trim();
  if (!s) return false;
  if (SHOW_TITLE_STRONG.test(s)) return true;
  return SHOW_TITLE_WEAK.test(s) && SHOW_TITLE_CONTEXT.test(s);
}

/**
 * Detecta se há uma banda/artista global no cabeçalho ou rodapé do texto
 */
export function detectGlobalArtist(rawLines: string[]): { detectedArtist: string | null; remainingLines: string[] } {
  let detectedArtist: string | null = null;
  const validLines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    // Prefixo explícito: "Banda: Foo", "Artista: Bar", "Artist: Foo", "Band: Bar"
    const explicitPrefixMatch = line.match(/^(?:banda|artista|artist|band)\s*[:-]\s*(.+)$/i);
    if (explicitPrefixMatch && !detectedArtist) {
      detectedArtist = cleanString(explicitPrefixMatch[1]);
      continue;
    }

    // Linha de cabeçalho informativa a ser ignorada
    if (isIgnoredHeaderLine(line)) {
      continue;
    }

    // Título de show/vídeo do YouTube na primeira linha:
    // ex: "Red Hot Chili Peppers - LIVE HD (From The Basement 2012)"
    //     "Nirvana - MTV Unplugged in New York (Full Concert)"
    if (i === 0 && !detectedArtist) {
      const showTitleMatch = line.match(/^([^-–—:]+?)\s*[-–—:]\s*(.+)$/);
      if (showTitleMatch && isShowTitleRemainder(showTitleMatch[2])) {
        detectedArtist = cleanString(showTitleMatch[1]);
        continue;
      }
    }

    validLines.push(line);
  }

  // Se ainda não detectou artista, verificar se a primeira ou a última linha é apenas o nome da banda
  // (quando as outras linhas contêm minutagens ou estrutura de músicas)
  if (!detectedArtist && validLines.length > 1) {
    const otherLinesHaveTimestamps = validLines.some((l) => stripTimestampsAndTrackNumbers(l).hasTimestamp);

    if (otherLinesHaveTimestamps) {
      // Checar se a primeira linha é o nome da banda
      const firstLine = validLines[0];
      const { hasTimestamp: firstHasTs } = stripTimestampsAndTrackNumbers(firstLine);
      if (!firstHasTs && !firstLine.includes(' - ') && firstLine.length < 50) {
        detectedArtist = cleanString(firstLine);
        validLines.shift();
      } else {
        // Checar se a última linha é o nome da banda
        const lastLine = validLines[validLines.length - 1];
        const { hasTimestamp: lastHasTs } = stripTimestampsAndTrackNumbers(lastLine);
        if (!lastHasTs && !lastLine.includes(' - ') && lastLine.length < 50) {
          detectedArtist = cleanString(lastLine);
          validLines.pop();
        }
      }
    }
  }

  return {
    detectedArtist,
    remainingLines: validLines,
  };
}

export type ParseFormat = 'auto' | 'artist_song' | 'song_artist';

/**
 * Analisa o texto de entrada linha por linha e extrai Artista e Nome da Música
 */
export function parseSongList(
  text: string,
  format: ParseFormat = 'auto',
  defaultArtist?: string
): { songs: ParsedSong[]; detectedArtist: string | null } {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const { detectedArtist, remainingLines } = detectGlobalArtist(rawLines);
  const activeGlobalArtist = (defaultArtist?.trim() || detectedArtist || '').trim();

  const songs: ParsedSong[] = [];

  for (let index = 0; index < remainingLines.length; index++) {
    const rawLine = remainingLines[index];
    const { cleaned: cleanedLine } = stripTimestampsAndTrackNumbers(rawLine);

    if (!cleanedLine) continue;

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
    } else {
      title = cleanedLine;
      artist = activeGlobalArtist;
    }

    // Se o artista ainda estiver vazio mas tivermos um artista global, atribuir
    if (!artist && activeGlobalArtist) {
      artist = activeGlobalArtist;
    }

    songs.push({
      id: `song_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
      rawText: rawLine,
      artistQuery: artist,
      titleQuery: title,
      status: 'pending',
      confidence: 'medium',
      candidates: [],
    });
  }

  return { songs, detectedArtist };
}

