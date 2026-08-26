import React, { useState } from 'react';
import type { ParsedSong, SpotifyTrack } from '../types/spotify';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Flame,
  Play,
  Pause,
  SlidersHorizontal,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Disc,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface ReviewStepProps {
  items: ParsedSong[];
  isSearchingBatch: boolean;
  searchProgress: { current: number; total: number };
  onOpenOptionModal: (item: ParsedSong) => void;
  onRemoveItem: (id: string) => void;
  onRetrySearchAll: () => void;
  onProceedToCreate: () => void;
  onBackToInput: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  items,
  isSearchingBatch,
  searchProgress,
  onOpenOptionModal,
  onRemoveItem,
  onRetrySearchAll,
  onProceedToCreate,
  onBackToInput,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'ambiguous' | 'not_found'>('all');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);

  const stats = {
    total: items.length,
    high: items.filter((i) => i.status === 'matched' && i.confidence === 'high').length,
    ambiguous: items.filter((i) => i.status === 'ambiguous').length,
    notFound: items.filter((i) => i.status === 'not_found' || i.status === 'error').length,
    selectedCount: items.filter((i) => !!i.selectedTrack).length,
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'high') return item.status === 'matched' && item.confidence === 'high';
    if (activeTab === 'ambiguous') return item.status === 'ambiguous';
    if (activeTab === 'not_found') return item.status === 'not_found' || item.status === 'error';
    return true;
  });

  const handleTogglePlay = (track: SpotifyTrack) => {
    if (!track.preview_url) {
      window.open(track.external_urls.spotify, '_blank');
      return;
    }

    if (playingTrackId === track.id) {
      if (audioInstance) {
        audioInstance.pause();
      }
      setPlayingTrackId(null);
    } else {
      if (audioInstance) {
        audioInstance.pause();
      }
      const audio = new Audio(track.preview_url);
      audio.play().catch(() => {});
      audio.onended = () => setPlayingTrackId(null);
      setAudioInstance(audio);
      setPlayingTrackId(track.id);
    }
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const totalDurationMs = items.reduce(
    (acc, curr) => acc + (curr.selectedTrack?.duration_ms || 0),
    0
  );
  const totalMinutes = Math.floor(totalDurationMs / (1000 * 60));

  return (
    <div className="step-card fade-in">
      {/* Header */}
      <div className="card-header">
        <div className="card-title-group">
          <SlidersHorizontal className="header-icon" size={24} />
          <div>
            <h2>Revisão & Seleção de Versões</h2>
            <p className="card-subtitle">
              Identificamos automaticamente a gravação oficial mais escutada para cada faixa. Se houver divergências de nomes ou versões, você pode ajustar com 1 clique.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn ghost-btn"
            onClick={onRetrySearchAll}
            disabled={isSearchingBatch}
            title="Refazer busca de todas as músicas"
          >
            <RefreshCw size={16} className={isSearchingBatch ? 'spin-icon' : ''} />
            <span>Reprocessar</span>
          </button>
        </div>
      </div>

      {/* Searching progress bar */}
      {isSearchingBatch && (
        <div className="batch-progress-box">
          <div className="progress-text-row">
            <span className="progress-title">
              <RefreshCw size={14} className="spin-icon" />
              Analisando popularidade no catálogo do Spotify...
            </span>
            <span className="progress-count">
              {searchProgress.current} de {searchProgress.total} faixas
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill animated-gradient"
              style={{
                width: `${(searchProgress.current / Math.max(searchProgress.total, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="tabs-container">
        <div className="tabs-list">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>Todas as Músicas</span>
            <span className="tab-badge">{stats.total}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'high' ? 'active' : ''}`}
            onClick={() => setActiveTab('high')}
          >
            <CheckCircle2 size={15} className="tab-icon success" />
            <span>Alta Confiança</span>
            <span className="tab-badge success-badge">{stats.high}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'ambiguous' ? 'active' : ''}`}
            onClick={() => setActiveTab('ambiguous')}
          >
            <AlertTriangle size={15} className="tab-icon warning" />
            <span>Divergências / Múltiplas Versões</span>
            <span className={`tab-badge ${stats.ambiguous > 0 ? 'warning-badge' : ''}`}>
              {stats.ambiguous}
            </span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'not_found' ? 'active' : ''}`}
            onClick={() => setActiveTab('not_found')}
          >
            <XCircle size={15} className="tab-icon error" />
            <span>Não Encontradas</span>
            <span className={`tab-badge ${stats.notFound > 0 ? 'error-badge' : ''}`}>
              {stats.notFound}
            </span>
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="review-list">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma música encontrada nesta aba de filtro.</p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const track = item.selectedTrack;
            const isPlaying = track ? playingTrackId === track.id : false;
            const albumArt = track?.album.images?.[0]?.url;
            const releaseYear = track?.album.release_date?.substring(0, 4);

            return (
              <div
                key={item.id}
                className={`review-row-card ${
                  item.status === 'ambiguous'
                    ? 'card-ambiguous'
                    : item.status === 'not_found'
                    ? 'card-not-found'
                    : 'card-matched'
                }`}
              >
                {/* Number & Original Query */}
                <div className="row-index-col">
                  <span className="row-number">#{index + 1}</span>
                </div>

                {/* Track Info */}
                <div className="row-content-col">
                  <div className="original-query-tag">
                    <span className="query-label">Texto original:</span>
                    <strong className="query-text">{item.rawText}</strong>
                  </div>

                  {track ? (
                    <div className="matched-track-box">
                      <div className="track-art-wrapper">
                        {albumArt ? (
                          <img src={albumArt} alt={track.name} className="track-art" />
                        ) : (
                          <div className="track-art-fallback">
                            <Disc size={18} />
                          </div>
                        )}
                        <button
                          className={`track-play-btn ${isPlaying ? 'playing' : ''}`}
                          onClick={() => handleTogglePlay(track)}
                          title={track.preview_url ? 'Ouvir prévia de 30s' : 'Abrir no Spotify'}
                        >
                          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                      </div>

                      <div className="track-main-info">
                        <div className="track-title-row">
                          <span className="track-title">{track.name}</span>
                          {track.explicit && <span className="explicit-badge">E</span>}
                        </div>

                        <div className="track-artists-album">
                          <span className="track-artists">
                            {track.artists.map((a) => a.name).join(', ')}
                          </span>
                          <span className="bullet-sep">•</span>
                          <span className="track-album">{track.album.name}</span>
                          {releaseYear && (
                            <>
                              <span className="bullet-sep">•</span>
                              <span className="track-year">{releaseYear}</span>
                            </>
                          )}
                        </div>

                        {/* Popularity metric */}
                        <div className="track-pop-info">
                          <div className="pop-badge">
                            <Flame
                              size={12}
                              className={`flame-icon ${
                                track.popularity > 60
                                  ? 'hot'
                                  : track.popularity > 30
                                  ? 'warm'
                                  : 'low'
                              }`}
                            />
                            <span>Versão mais ouvida ({track.popularity}% pop.)</span>
                          </div>
                          <span className="bullet-sep">•</span>
                          <span className="track-duration">{formatDuration(track.duration_ms)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="not-found-box">
                      <XCircle size={20} className="not-found-icon" />
                      <div className="not-found-text">
                        <strong>Faixa não localizada automaticamente</strong>
                        <p>Clique em "Buscar Opções" para ajustar o nome da banda ou música.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="row-actions-col">
                  {item.status === 'matched' && item.confidence === 'high' && (
                    <div className="status-pill matched-pill" title="Correspondência de alta confiança">
                      <CheckCircle2 size={13} />
                      <span>Versão Oficial</span>
                    </div>
                  )}

                  {item.status === 'ambiguous' && (
                    <div className="status-pill ambiguous-pill" title="Múltiplas versões encontradas">
                      <AlertTriangle size={13} />
                      <span>{item.candidates.length} Versões Disponíveis</span>
                    </div>
                  )}

                  {item.status === 'not_found' && (
                    <div className="status-pill not-found-pill">
                      <XCircle size={13} />
                      <span>Não Encontrada</span>
                    </div>
                  )}

                  <div className="action-buttons-group">
                    <button
                      className="btn secondary-btn small-btn option-btn"
                      onClick={() => onOpenOptionModal(item)}
                      title="Ver outras versões / álbuns ou editar busca"
                    >
                      <SlidersHorizontal size={14} />
                      <span>{track ? 'Trocar Versão' : 'Buscar Opções'}</span>
                    </button>

                    {track && (
                      <a
                        href={track.external_urls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-only-btn spotify-link-icon-btn"
                        title="Abrir no Spotify"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}

                    <button
                      className="icon-only-btn delete-btn"
                      onClick={() => onRemoveItem(item.id)}
                      title="Remover da lista"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      <div className="review-footer-bar">
        <button className="btn secondary-btn" onClick={onBackToInput}>
          <ArrowLeft size={16} />
          <span>Voltar e Editar Lista</span>
        </button>

        <div className="summary-info">
          <Sparkles size={16} className="sparkle-accent" />
          <span>
            <strong>{stats.selectedCount}</strong> {stats.selectedCount === 1 ? 'música selecionada' : 'músicas selecionadas'} (~{totalMinutes} min)
          </span>
        </div>

        <button
          className="btn primary-btn large-btn"
          onClick={onProceedToCreate}
          disabled={stats.selectedCount === 0 || isSearchingBatch}
        >
          <span>Avançar para Criar Playlist</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
