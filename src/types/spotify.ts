export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images?: Array<{ url: string; height: number | null; width: number | null }>;
  external_urls: { spotify: string };
  product?: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls?: { spotify: string };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  release_date?: string;
  images: Array<{ url: string; height: number; width: number }>;
  external_urls?: { spotify: string };
  album_type?: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  popularity: number; // 0 to 100
  duration_ms: number;
  preview_url: string | null;
  explicit: boolean;
  external_urls: { spotify: string };
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
}

export type MatchStatus = 'pending' | 'searching' | 'matched' | 'ambiguous' | 'not_found' | 'error';
export type MatchConfidence = 'high' | 'medium' | 'low';

export interface ParsedSong {
  id: string;
  rawText: string;
  artistQuery: string;
  titleQuery: string;
  status: MatchStatus;
  confidence: MatchConfidence;
  selectedTrack?: SpotifyTrack;
  candidates: SpotifyTrack[];
  errorMsg?: string;
  isCustomManualSearch?: boolean;
}

export interface PlaylistCreationResult {
  id: string;
  name: string;
  description: string;
  external_url: string;
  tracksCount: number;
  uri: string;
  images?: Array<{ url: string }>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp in ms
}
