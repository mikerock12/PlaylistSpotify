import type { AuthTokens } from '../types/spotify';

const SPOTIFY_CLIENT_ID_KEY = 'spotify_client_id';
const SPOTIFY_VERIFIER_KEY = 'spotify_code_verifier';
const SPOTIFY_TOKENS_KEY = 'spotify_auth_tokens';

let authExchangePromise: Promise<AuthTokens | null> | null = null;

export const SPOTIFY_SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-private',
  'user-read-email',
].join(' ');

export function getStoredClientId(): string {
  return localStorage.getItem(SPOTIFY_CLIENT_ID_KEY) || (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string) || '';
}

export function setStoredClientId(clientId: string): void {
  if (clientId.trim()) {
    localStorage.setItem(SPOTIFY_CLIENT_ID_KEY, clientId.trim());
  } else {
    localStorage.removeItem(SPOTIFY_CLIENT_ID_KEY);
  }
}

/**
 * Retorna a Redirect URI atual usando 127.0.0.1 (exigência de segurança do Spotify)
 */
export function getRedirectUri(): string {
  const origin = window.location.origin.replace('localhost', '127.0.0.1');
  const path = window.location.pathname;
  if (path === '/' || path === '') {
    return origin;
  }
  return `${origin}${path}`.replace(/\/$/, '');
}

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function redirectToSpotifyAuthorize(clientId: string): Promise<void> {
  if (!clientId) throw new Error('Client ID do Spotify é obrigatório.');

  const verifier = generateRandomString(64);
  const hashed = await sha256(verifier);
  const codeChallenge = base64UrlEncode(hashed);

  localStorage.setItem(SPOTIFY_VERIFIER_KEY, verifier);
  setStoredClientId(clientId);

  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: 'true',
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function handleAuthCallback(): Promise<AuthTokens | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (error) {
    window.history.replaceState({}, document.title, window.location.pathname);
    throw new Error(`Erro na autorização do Spotify: ${error}`);
  }

  if (!code) {
    return null;
  }

  if (authExchangePromise) {
    return authExchangePromise;
  }

  // Remove os parâmetros da URL imediatamente
  window.history.replaceState({}, document.title, window.location.pathname);

  const verifier = localStorage.getItem(SPOTIFY_VERIFIER_KEY);
  const clientId = getStoredClientId();

  if (!verifier || !clientId) {
    const existing = getStoredTokens();
    if (existing && Date.now() < existing.expiresAt) {
      return existing;
    }
    return null;
  }

  authExchangePromise = (async () => {
    try {
      const redirectUri = getRedirectUri();
      const body = new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const existing = getStoredTokens();
        if (existing && Date.now() < existing.expiresAt) {
          return existing;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || errorData.error || 'Falha ao obter token de acesso do Spotify.');
      }

      const data = await response.json();
      const tokens: AuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
      };

      localStorage.setItem(SPOTIFY_TOKENS_KEY, JSON.stringify(tokens));
      localStorage.removeItem(SPOTIFY_VERIFIER_KEY);

      return tokens;
    } finally {
      authExchangePromise = null;
    }
  })();

  return authExchangePromise;
}

export function getStoredTokens(): AuthTokens | null {
  const stored = localStorage.getItem(SPOTIFY_TOKENS_KEY);
  if (!stored) return null;
  try {
    const tokens = JSON.parse(stored) as AuthTokens;
    return tokens;
  } catch {
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  if (Date.now() < tokens.expiresAt) {
    return tokens.accessToken;
  }

  if (tokens.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      return refreshed.accessToken;
    } catch (e) {
      console.warn('Erro ao renovar token Spotify:', e);
      logout();
      return null;
    }
  }

  logout();
  return null;
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const clientId = getStoredClientId();
  if (!clientId) throw new Error('Client ID não encontrado para renovação.');

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error('Falha ao renovar token de acesso.');
  }

  const data = await response.json();
  const newTokens: AuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  localStorage.setItem(SPOTIFY_TOKENS_KEY, JSON.stringify(newTokens));
  return newTokens;
}

export function logout(): void {
  localStorage.removeItem(SPOTIFY_TOKENS_KEY);
  localStorage.removeItem(SPOTIFY_VERIFIER_KEY);
}
