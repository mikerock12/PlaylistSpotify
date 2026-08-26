import React, { useState, useEffect, useRef } from 'react';
import type { SpotifyTrack, ParsedSong } from '../types/spotify';
import { X, Search, Flame, Play, Pause, Check, Disc, Music, AlertTriangle, ExternalLink } from 'lucide-react';
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
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (item) {
      setSearchArtist(item.artistQuery);
      setSearchTitle(item.titleQuery);
      setCandidates(item.candidates || []);
      setPlayingTrackId(null);
    }
  }, [item]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSearching(true);
    try {
      const result = await searchTrackWithSmartPopularity(token, searchArtist, searchTitle, 15);
      setCandidates(result.candidates);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
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
                <label>Artista:</label>
                <input
                  type="text"
                  value={searchArtist}
                  onChange={(e) => setSearchArtist(e.target.value)}
                  placeholder="Nome da Banda/Artista"
                />
              </div>
              <div className="search-input-field">
                <label>Música:</label>
                <input
                  type="text"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  placeholder="Título da Música"
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn secondary-btn search-action-btn"
              disabled={isSearching}
            >
              <Search size={16} />
              <span>{isSearching ? 'Buscando...' : 'Rebuscar no Spotify'}</span>
            </button>
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
            {candidates.length === 0 ? (
              <div className="empty-candidates">
                <Music size={32} />
                <p>Nenhuma versão encontrada com os termos acima.</p>
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
                      <button
                        className={`candidate-play-btn ${isPlaying ? 'playing' : ''}`}
                        onClick={() => handleTogglePlay(cand)}
                        title={cand.preview_url ? 'Ouvir prévia de 30s' : 'Abrir no Spotify'}
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </button>
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

                      {/* Popularity metric */}
                      <div className="candidate-popularity-bar-wrapper">
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
