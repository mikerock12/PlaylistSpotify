import React, { useState, useEffect, useRef } from 'react';
import type { SpotifyTrack, ParsedSong } from '../types/spotify';
import { X, Search, Flame, Play, Pause, Check, Disc, Music, AlertTriangle, ExternalLink, ArrowLeftRight, Eraser } from 'lucide-react';
import { searchTrackWithSmartPopularity } from '../services/spotifyApi';

interface TrackOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ParsedSong | null;
  token: string | null;
  onSelectTrack: (itemId: string, track: SpotifyTrack) => void;
}

export const TrackOptionModal: React.FC<TrackOptionModalProps> = ({
  isOpen,
  onClose,
  item,
  token,
  onSelectTrack,
}) => {
  const [searchArtist, setSearchArtist] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<SpotifyTrack[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const doSearch = React.useCallback(
    async (artist: string, title: string) => {
      if (!token) return;
      setIsSearching(true);
      setErrorMessage(null);
      try {
        const result = await searchTrackWithSmartPopularity(token, artist, title, 10);
        setCandidates(result.candidates);
        if (result.candidates.length === 0 && result.errorMsg) {
          setErrorMessage(result.errorMsg);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao consultar o Spotify.');
      } finally {
        setIsSearching(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (item && isOpen) {
      setSearchArtist(item.artistQuery);
      setSearchTitle(item.titleQuery);
      setPlayingTrackId(null);
      setErrorMessage(null);

      if (item.candidates && item.candidates.length > 0) {
        setCandidates(item.candidates);
      } else if (token && (item.titleQuery || item.artistQuery)) {
        // Busca automática se ainda não tem candidatos
        doSearch(item.artistQuery, item.titleQuery);
      } else {
        setCandidates([]);
      }
    }
  }, [item, isOpen, token, doSearch]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(searchArtist, searchTitle);
  };

  const handleSwap = () => {
    const newArtist = searchTitle;
    const newTitle = searchArtist;
    setSearchArtist(newArtist);
    setSearchTitle(newTitle);
    doSearch(newArtist, newTitle);
  };

  const handleSearchTitleOnly = () => {
    setSearchArtist('');
    doSearch('', searchTitle);
  };

  const handleTogglePlay = (track: SpotifyTrack) => {
    if (!track.preview_url) {
      window.open(track.external_urls.spotify, '_blank');
      return;
    }

    if (playingTrackId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingTrackId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(track.preview_url);
      audio.play().catch(() => {});
      audio.onended = () => setPlayingTrackId(null);
      audioRef.current = audio;
      setPlayingTrackId(track.id);
    }
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleChoose = (track: SpotifyTrack) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onSelectTrack(item.id, track);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container large-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Disc className="modal-title-icon" size={22} />
            <div>
              <h3>Escolher Versão da Música</h3>
              <p className="modal-subtitle">
                Linha original: <em>"{item.rawText}"</em>
              </p>
            </div>
          </div>
          <button className="icon-only-btn close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body modal-scrollable">
          {/* Form de busca rápida personalizada */}
          <form onSubmit={handleManualSearch} className="modal-search-bar">
            <div className="search-inputs-grid">
              <div className="search-input-field">
                <label>Artista / Banda:</label>
                <input
                  type="text"
                  value={searchArtist}
                  onChange={(e) => setSearchArtist(e.target.value)}
                  placeholder="Ex: Red Hot Chili Peppers"
                />
              </div>
              <div className="search-input-field">
                <label>Título da Música:</label>
                <input
                  type="text"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  placeholder="Ex: Look Around"
                />
              </div>
            </div>

            <div className="modal-search-actions-row">
              <div className="quick-search-helpers">
                <button
                  type="button"
                  className="quick-helper-btn"
                  onClick={handleSwap}
                  title="Inverter Artista e Música"
                >
                  <ArrowLeftRight size={13} />
                  <span>Inverter</span>
                </button>
                {searchArtist && (
                  <button
                    type="button"
                    className="quick-helper-btn"
                    onClick={handleSearchTitleOnly}
                    title="Remover filtro de artista e buscar só pelo título"
                  >
                    <Eraser size={13} />
                    <span>Buscar só por Título</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="btn secondary-btn search-action-btn"
                disabled={isSearching}
              >
                <Search size={16} />
                <span>{isSearching ? 'Buscando...' : 'Rebuscar no Spotify'}</span>
              </button>
            </div>
          </form>

          {/* Divergence note */}
          <div className="modal-notice">
            <AlertTriangle size={16} className="notice-icon" />
            <span>
              Listamos as versões encontradas ordenadas por <strong>Popularidade (mais ouvidas)</strong> no Spotify. Escolha a versão desejada abaixo:
            </span>
          </div>

          {/* Results list */}
          <div className="candidates-list">
            {isSearching ? (
              <div className="empty-candidates">
                <Music size={32} className="spin-icon" />
                <p>Consultando catálogo do Spotify...</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="empty-candidates">
                <Music size={32} />
                <p>{errorMessage || 'Nenhuma versão encontrada com os termos acima.'}</p>
                <span>Tente ajustar o nome da banda ou da música na busca acima.</span>
              </div>
            ) : (
              candidates.map((cand, idx) => {
                const isSelected = item.selectedTrack?.id === cand.id;
                const isPlaying = playingTrackId === cand.id;
                const albumArt = cand.album.images?.[0]?.url;
                const releaseYear = cand.album.release_date?.substring(0, 4);

                return (
                  <div
                    key={cand.id}
                    className={`candidate-card ${isSelected ? 'selected-candidate' : ''}`}
                  >
                    <div className="candidate-rank">#{idx + 1}</div>

                    <div className="candidate-art-wrapper">
                      {albumArt ? (
                        <img src={albumArt} alt={cand.name} className="candidate-art" />
                      ) : (
                        <div className="candidate-art-fallback">
                          <Disc size={20} />
                        </div>
                      )}
                      {cand.preview_url && (
                        <button
                          className={`candidate-play-btn ${isPlaying ? 'playing' : ''}`}
                          onClick={() => handleTogglePlay(cand)}
                          title="Ouvir prévia de 30s"
                        >
                          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      )}
                    </div>

                    <div className="candidate-details">
                      <div className="candidate-title-row">
                        <span className="candidate-title">{cand.name}</span>
                        {cand.explicit && <span className="explicit-badge">E</span>}
                      </div>

                      <div className="candidate-artist-row">
                        <span className="candidate-artist">
                          {cand.artists.map((a) => a.name).join(', ')}
                        </span>
                        <span className="bullet-sep">•</span>
                        <span className="candidate-album">{cand.album.name}</span>
                        {releaseYear && (
                          <>
                            <span className="bullet-sep">•</span>
                            <span className="candidate-year">{releaseYear}</span>
                          </>
                        )}
                      </div>

                      {/* Popularidade: só exibida quando a API a fornece */}
                      <div className="candidate-popularity-bar-wrapper">
                        {typeof cand.popularity === 'number' && (
                          <>
                            <div className="popularity-indicator">
                              <Flame
                                size={14}
                                className={`flame-icon ${
                                  cand.popularity > 60 ? 'hot' : cand.popularity > 30 ? 'warm' : 'low'
                                }`}
                              />
                              <span className="popularity-text">Popularidade: {cand.popularity}%</span>
                            </div>
                            <div className="pop-bar-bg">
                              <div
                                className="pop-bar-fill"
                                style={{ width: `${cand.popularity}%` }}
                              />
                            </div>
                          </>
                        )}
                        <span className="candidate-duration">{formatDuration(cand.duration_ms)}</span>
                      </div>
                    </div>

                    <div className="candidate-actions">
                      <a
                        href={cand.external_urls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-only-btn spotify-link-btn"
                        title="Ver no Spotify"
                      >
                        <ExternalLink size={16} />
                      </a>

                      <button
                        className={`btn ${isSelected ? 'selected-btn' : 'primary-btn select-btn'}`}
                        onClick={() => handleChoose(cand)}
                      >
                        {isSelected ? (
                          <>
                            <Check size={16} />
                            <span>Selecionada</span>
                          </>
                        ) : (
                          <span>Escolher Esta</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer justify-end">
          <button className="btn secondary-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

