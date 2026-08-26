import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StepIndicator } from './components/StepIndicator';
import type { AppStep } from './components/StepIndicator';
import { TextInputStep } from './components/TextInputStep';
import { ReviewStep } from './components/ReviewStep';
import { TrackOptionModal } from './components/TrackOptionModal';
import { CreatePlaylistStep } from './components/CreatePlaylistStep';
import { ConfigModal } from './components/ConfigModal';
import { HelpModal } from './components/HelpModal';

import {
  getStoredClientId,
  getValidAccessToken,
  handleAuthCallback,
  redirectToSpotifyAuthorize,
  logout as authLogout,
} from './services/auth';
import {
  getCurrentUser,
  searchTrackWithSmartPopularity,
  createSpotifyPlaylist,
  addTracksToSpotifyPlaylist,
} from './services/spotifyApi';
import { parseSongList } from './services/parser';
import type { ParseFormat } from './services/parser';
import type { SpotifyUser, ParsedSong, SpotifyTrack, PlaylistCreationResult } from './types/spotify';

export const App: React.FC = () => {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [clientId, setClientId] = useState<string>(getStoredClientId());

  // App step
  const [currentStep, setCurrentStep] = useState<AppStep>('input');

  // Input & parsed data
  const [inputText, setInputText] = useState<string>('');
  const [customArtist, setCustomArtist] = useState<string>('');
  const [parsedSongs, setParsedSongs] = useState<ParsedSong[]>([]);

  // Search execution state
  const [isSearchingBatch, setIsSearchingBatch] = useState<boolean>(false);
  const [searchProgress, setSearchProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  // Modals
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [modalItem, setModalItem] = useState<ParsedSong | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Inicialização e captura do retorno de autenticação do Spotify
  useEffect(() => {
    const initAuth = async () => {
      try {
        const callbackTokens = await handleAuthCallback();
        let activeToken: string | null = callbackTokens?.accessToken || null;

        if (!activeToken) {
          activeToken = await getValidAccessToken();
        }

        if (activeToken) {
          setToken(activeToken);
          const profile = await getCurrentUser(activeToken);
          setUser(profile);
          setGlobalError(null);
        }
      } catch (err: any) {
        // Se já temos o token e o perfil carregado, ignorar aviso de reutilização de código
        const existing = await getValidAccessToken();
        if (existing) {
          setToken(existing);
          const profile = await getCurrentUser(existing);
          setUser(profile);
          setGlobalError(null);
        } else {
          console.error('Erro na autenticação inicial:', err);
          setGlobalError(err.message || 'Erro ao conectar ao Spotify.');
        }
      }
    };

    initAuth();
  }, []);

  const handleLogout = () => {
    authLogout();
    setToken(null);
    setUser(null);
  };

  const handleSaveAndLogin = async (id: string) => {
    setIsConfigOpen(false);
    setClientId(id);
    try {
      await redirectToSpotifyAuthorize(id);
    } catch (err: any) {
      setGlobalError(err.message || 'Falha ao iniciar autenticação.');
    }
  };

  // Executa busca em lote com limitação de concorrência
  const runBatchSearch = useCallback(
    async (songs: ParsedSong[], currentToken?: string) => {
      setIsSearchingBatch(true);
      setSearchProgress({ current: 0, total: songs.length });

      const activeToken = (await getValidAccessToken()) || currentToken || token;
      if (!activeToken) {
        setIsSearchingBatch(false);
        setGlobalError('Sessão expirada. Por favor, desconecte e reconecte sua conta do Spotify no topo direito.');
        return;
      }
      setToken(activeToken);

      const updatedList = [...songs];
      const CONCURRENCY = 3;

      for (let i = 0; i < updatedList.length; i += CONCURRENCY) {
        const chunk = updatedList.slice(i, i + CONCURRENCY);
        await Promise.all(
          chunk.map(async (song) => {
            const result = await searchTrackWithSmartPopularity(
              activeToken,
              song.artistQuery,
              song.titleQuery
            );
            song.status = result.status;
            song.confidence = result.confidence;
            song.selectedTrack = result.bestMatch || undefined;
            song.candidates = result.candidates;
            song.errorMsg = result.errorMsg;
          })
        );

        setSearchProgress({
          current: Math.min(i + CONCURRENCY, updatedList.length),
          total: updatedList.length,
        });
        setParsedSongs([...updatedList]);
      }

      setIsSearchingBatch(false);
    },
    [token]
  );

  const handleProcessList = async (rawText: string, format: ParseFormat, defaultArtist?: string) => {
    setInputText(rawText);
    if (defaultArtist !== undefined) {
      setCustomArtist(defaultArtist);
    }

    const activeToken = (await getValidAccessToken()) || token;
    if (!activeToken) {
      setIsConfigOpen(true);
      return;
    }
    setToken(activeToken);

    const { songs, detectedArtist } = parseSongList(rawText, format, defaultArtist);
    if (detectedArtist && !defaultArtist) {
      setCustomArtist(detectedArtist);
    }
    setParsedSongs(songs);
    setCurrentStep('review');

    await runBatchSearch(songs, activeToken);
  };

  const handleRetrySearchAll = async () => {
    const activeToken = (await getValidAccessToken()) || token;
    if (!activeToken) {
      setIsConfigOpen(true);
      return;
    }
    setToken(activeToken);
    await runBatchSearch(parsedSongs, activeToken);
  };

  const handleSelectTrack = (itemId: string, track: SpotifyTrack) => {
    setParsedSongs((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            selectedTrack: track,
            status: 'matched',
            confidence: 'high',
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setParsedSongs((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleCreatePlaylist = async (
    name: string,
    description: string,
    isPublic: boolean
  ): Promise<PlaylistCreationResult> => {
    if (!token || !user) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const trackUris = parsedSongs
      .map((i) => i.selectedTrack?.uri)
      .filter((uri): uri is string => Boolean(uri));

    if (trackUris.length === 0) {
      throw new Error('Nenhuma música selecionada para adicionar à playlist.');
    }

    const created = await createSpotifyPlaylist(token, user.id, name, description, isPublic);
    await addTracksToSpotifyPlaylist(token, created.id, trackUris);

    return {
      ...created,
      tracksCount: trackUris.length,
    };
  };

  const handleResetAll = () => {
    setInputText('');
    setCustomArtist('');
    setParsedSongs([]);
    setCurrentStep('input');
  };

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        clientId={clientId}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onLogout={handleLogout}
      />

      {globalError && (
        <div className="global-error-banner">
          <span>{globalError}</span>
          <button className="error-close-btn" onClick={() => setGlobalError(null)}>
            ×
          </button>
        </div>
      )}

      <main className="main-content">
        <div className="container">
          <StepIndicator
            currentStep={currentStep}
            onStepClick={(step) => setCurrentStep(step)}
            canNavigateToReview={parsedSongs.length > 0}
            canNavigateToCreate={parsedSongs.some((i) => !!i.selectedTrack)}
          />

          {currentStep === 'input' && (
            <TextInputStep
              initialText={inputText}
              initialArtist={customArtist}
              onProcessList={handleProcessList}
              isAuthenticated={!!token}
              onConnectClick={() => setIsConfigOpen(true)}
            />
          )}

          {currentStep === 'review' && (
            <ReviewStep
              items={parsedSongs}
              isSearchingBatch={isSearchingBatch}
              searchProgress={searchProgress}
              onOpenOptionModal={(item) => setModalItem(item)}
              onRemoveItem={handleRemoveItem}
              onRetrySearchAll={handleRetrySearchAll}
              onProceedToCreate={() => setCurrentStep('create')}
              onBackToInput={() => setCurrentStep('input')}
            />
          )}

          {currentStep === 'create' && (
            <CreatePlaylistStep
              items={parsedSongs}
              onCreatePlaylist={handleCreatePlaylist}
              onBackToReview={() => setCurrentStep('review')}
              onResetAll={handleResetAll}
            />
          )}
        </div>
      </main>

      <TrackOptionModal
        isOpen={!!modalItem}
        onClose={() => setModalItem(null)}
        item={modalItem}
        token={token}
        onSelectTrack={handleSelectTrack}
      />

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentClientId={clientId}
        onSaveAndLogin={handleSaveAndLogin}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export default App;
