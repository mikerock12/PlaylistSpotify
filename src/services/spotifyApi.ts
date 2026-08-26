import type {
  SpotifyUser,
  SpotifyTrack,
  MatchStatus,
  MatchConfidence,
  PlaylistCreationResult,
} from '../types/spotify';

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

    // 1. Tentar busca direcionada: track + artist
    if (cleanArtist && cleanTitle) {
      const q = `track:"${cleanTitle.replace(/"/g, '')}" artist:"${cleanArtist.replace(/"/g, '')}"`;
      const url = `${BASE_URL}/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        tracks = data.tracks?.items || [];
      }
    }

    // 2. Se não encontrou resultados, tentar busca ampla combinada
    if (tracks.length === 0) {
      const combinedQuery = `${cleanArtist} ${cleanTitle}`.trim();
      if (combinedQuery) {
        const url = `${BASE_URL}/search?q=${encodeURIComponent(combinedQuery)}&type=track&limit=${limit}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          tracks = data.tracks?.items || [];
        }
      }
    }

    if (tracks.length === 0) {
      return {
        bestMatch: null,
        candidates: [],
        status: 'not_found',
        confidence: 'low',
        errorMsg: 'Nenhum resultado encontrado no catálogo do Spotify.',
      };
    }

    // 3. Ranqueamento e Avaliação de Candidatos
    const scoredCandidates = tracks.map((track) => {
      const trackArtists = track.artists.map((a) => a.name).join(' ');
      const artistSim = cleanArtist ? calculateSimilarity(cleanArtist, trackArtists) : 0.8;
      const titleSim = calculateSimilarity(cleanTitle || cleanArtist, track.name);

      const normTrackName = normalizeText(track.name);
      const normArtist = normalizeText(trackArtists);
      let penalty = 0;
      if (normTrackName.includes('tribute') || normTrackName.includes('karaoke') || normTrackName.includes('instrumental version')) {
        penalty += 0.3;
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
