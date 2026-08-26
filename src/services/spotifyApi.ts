import type {
  SpotifyUser,
  SpotifyTrack,
  MatchStatus,
  MatchConfidence,
  PlaylistCreationResult,
} from '../types/spotify';
import { getValidAccessToken } from './auth';

const BASE_URL = 'https://api.spotify.com/v1';

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;

  const tokens1 = new Set(norm1.split(' ').filter(Boolean));
  const tokens2 = new Set(norm2.split(' ').filter(Boolean));

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

export async function getCurrentUser(token: string): Promise<SpotifyUser> {
  const res = await fetch(`${BASE_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Sessão expirada. Por favor, reconecte sua conta do Spotify.');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao buscar perfil do usuário no Spotify.');
  }

  return res.json();
}

export interface SearchTrackResult {
  bestMatch: SpotifyTrack | null;
  candidates: SpotifyTrack[];
  status: MatchStatus;
  confidence: MatchConfidence;
  errorMsg?: string;
}

function cleanTitleForFallback(title: string): string {
  return title
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\b(feat|ft|featuring)\.?\s+.*$/i, '')
    .replace(/[-–—:|/]+.*$/, '')
    .trim();
}

export async function searchTrackWithSmartPopularity(
  token: string,
  artistQuery: string,
  titleQuery: string,
  limit: number = 10
): Promise<SearchTrackResult> {
  try {
    let tracks: SpotifyTrack[] = [];

    const cleanArtist = artistQuery.trim();
    const cleanTitle = titleQuery.trim();

    if (!cleanTitle && !cleanArtist) {
      return {
        bestMatch: null,
        candidates: [],
        status: 'not_found',
        confidence: 'low',
        errorMsg: 'Nenhum termo de busca fornecido.',
      };
    }

    let activeToken = token;
    const safeLimit = Math.min(Math.max(limit || 10, 1), 10);

    const executeSearch = async (query: string): Promise<SpotifyTrack[]> => {
      if (!query.trim()) return [];

      const doFetch = async (tok: string) => {
        const url = `${BASE_URL}/search?q=${encodeURIComponent(query.trim())}&type=track&limit=${safeLimit}`;
        return fetch(url, {
          headers: { Authorization: `Bearer ${tok}` },
        });
      };

      let res = await doFetch(activeToken);

      if (res.status === 401) {
        // Tenta renovar token
        const fresh = await getValidAccessToken();
        if (fresh && fresh !== activeToken) {
          activeToken = fresh;
          res = await doFetch(activeToken);
        }
      }

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Sessão expirada. Por favor, desconecte e reconecte sua conta do Spotify no topo direito.');
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Erro ${res.status} ao consultar Spotify.`);
      }

      const data = await res.json();
      return data.tracks?.items || [];
    };

    // 1. Busca direcionada: track + artist
    if (cleanArtist && cleanTitle) {
      const q = `track:"${cleanTitle.replace(/["']/g, '')}" artist:"${cleanArtist.replace(/["']/g, '')}"`;
      tracks = await executeSearch(q);
    }

    // 2. Busca exata combinada com aspas
    if (tracks.length === 0 && cleanArtist && cleanTitle) {
      const q = `"${cleanArtist.replace(/"/g, '')}" "${cleanTitle.replace(/"/g, '')}"`;
      tracks = await executeSearch(q);
    }

    // 3. Busca ampla combinada
    if (tracks.length === 0) {
      const combined = `${cleanArtist} ${cleanTitle}`.trim();
      if (combined) {
        tracks = await executeSearch(combined);
      }
    }

    // 4. Fallback: Limpeza de sufixos (ex: "(Live)", "(Ao Vivo)", "feat.", etc.)
    if (tracks.length === 0 && cleanTitle) {
      const sanitizedTitle = cleanTitleForFallback(cleanTitle);
      if (sanitizedTitle && sanitizedTitle !== cleanTitle) {
        const queryWithSanitized = cleanArtist ? `${cleanArtist} ${sanitizedTitle}` : sanitizedTitle;
        tracks = await executeSearch(queryWithSanitized);
      }
    }

    // 5. Fallback final: apenas o título da faixa
    if (tracks.length === 0 && cleanTitle) {
      tracks = await executeSearch(`track:"${cleanTitle.replace(/["']/g, '')}"`);
      if (tracks.length === 0) {
        tracks = await executeSearch(cleanTitle);
      }
    }

    if (tracks.length === 0) {
      return {
        bestMatch: null,
        candidates: [],
        status: 'not_found',
        confidence: 'low',
        errorMsg: `Nenhum resultado encontrado no Spotify para "${cleanTitle}"${cleanArtist ? ` (${cleanArtist})` : ''}.`,
      };
    }

    // 6. Ranqueamento e Avaliação de Candidatos
    const scoredCandidates = tracks.map((track) => {
      const trackArtists = track.artists.map((a) => a.name).join(' ');
      const artistSim = cleanArtist ? calculateSimilarity(cleanArtist, trackArtists) : 0.8;
      const titleSim = calculateSimilarity(cleanTitle || cleanArtist, track.name);

      const normTrackName = normalizeText(track.name);
      const normArtist = normalizeText(trackArtists);
      let penalty = 0;
      if (normTrackName.includes('tribute') || normTrackName.includes('karaoke') || normTrackName.includes('instrumental version')) {
        penalty += 0.35;
      }
      if (normArtist.includes('tribute') || normArtist.includes('cover') || normArtist.includes('karaoke')) {
        penalty += 0.5;
      }

      const popularityScore = (track.popularity || 0) / 100;
      const totalScore = (artistSim * 0.35 + titleSim * 0.35 + popularityScore * 0.30) - penalty;

      return {
        track,
        artistSim,
        titleSim,
        popularity: track.popularity || 0,
        totalScore,
      };
    });

    scoredCandidates.sort((a, b) => {
      if (Math.abs(b.totalScore - a.totalScore) > 0.05) {
        return b.totalScore - a.totalScore;
      }
      return b.popularity - a.popularity;
    });

    const orderedTracks = scoredCandidates.map((c) => c.track);
    const topScored = scoredCandidates[0];
    const secondScored = scoredCandidates[1];

    let confidence: MatchConfidence = 'medium';
    let status: MatchStatus = 'matched';

    const isHighMatch =
      topScored.artistSim >= 0.7 &&
      topScored.titleSim >= 0.6 &&
      topScored.popularity >= 15;

    if (isHighMatch) {
      if (secondScored && Math.abs(secondScored.totalScore - topScored.totalScore) < 0.03) {
        status = 'ambiguous';
        confidence = 'medium';
      } else {
        status = 'matched';
        confidence = 'high';
      }
    } else if (topScored.artistSim < 0.4 || topScored.titleSim < 0.4) {
      status = 'ambiguous';
      confidence = 'low';
    } else {
      status = 'ambiguous';
      confidence = 'medium';
    }

    return {
      bestMatch: topScored.track,
      candidates: orderedTracks,
      status,
      confidence,
    };
  } catch (error: any) {
    return {
      bestMatch: null,
      candidates: [],
      status: 'error',
      confidence: 'low',
      errorMsg: error.message || 'Erro de rede ao consultar o Spotify.',
    };
  }
}

/**
 * Cria uma playlist nova no Spotify do usuário autenticado
 * Usa POST /v1/me/playlists
 */
export async function createSpotifyPlaylist(
  token: string,
  _userId: string,
  name: string,
  description: string,
  isPublic: boolean = false
): Promise<PlaylistCreationResult> {
  const res = await fetch(`${BASE_URL}/me/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name.trim() || 'Minha Playlist Importada',
      description: description.trim() || 'Playlist criada automaticamente via Text to Playlist',
      public: isPublic,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 403) {
      throw new Error(
        'Permissão 403 Forbidden: Seu token atual foi gerado sem autorização de criação de playlist. Por favor, clique no botão de Desconectar (ícone ao lado do seu nome no topo direito) e conecte novamente.'
      );
    }
    const message = err.error?.message || err.message || `Erro ${res.status}: Falha ao criar playlist.`;
    throw new Error(message);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    external_url: data.external_urls?.spotify || `https://open.spotify.com/playlist/${data.id}`,
    tracksCount: 0,
    uri: data.uri,
    images: data.images,
  };
}

/**
 * Adiciona faixas à playlist em lotes de até 100 faixas
 */
export async function addTracksToSpotifyPlaylist(
  token: string,
  playlistId: string,
  trackUris: string[],
  onProgress?: (addedCount: number, totalCount: number) => void
): Promise<void> {
  const BATCH_SIZE = 100;
  const validUris = trackUris.filter(Boolean);

  let added = 0;
  for (let i = 0; i < validUris.length; i += BATCH_SIZE) {
    const batch = validUris.slice(i, i + BATCH_SIZE);
    
    // Tenta primeiro /tracks
    let res = await fetch(`${BASE_URL}/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: batch,
      }),
    });

    if (!res.ok && (res.status === 404 || res.status === 403)) {
      res = await fetch(`${BASE_URL}/playlists/${playlistId}/items`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: batch,
        }),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao adicionar músicas na playlist.');
    }

    added += batch.length;
    if (onProgress) {
      onProgress(added, validUris.length);
    }
  }
}
