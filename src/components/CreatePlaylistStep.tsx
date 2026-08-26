import React, { useState } from 'react';
import type { ParsedSong, PlaylistCreationResult } from '../types/spotify';
import {
  ListPlus,
  Lock,
  Globe,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  Music2,
  Disc,
  RotateCcw,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { redirectToSpotifyAuthorize, getStoredClientId, logout } from '../services/auth';

interface CreatePlaylistStepProps {
  items: ParsedSong[];
  onCreatePlaylist: (name: string, description: string, isPublic: boolean) => Promise<PlaylistCreationResult>;
  onBackToReview: () => void;
  onResetAll: () => void;
}

export const CreatePlaylistStep: React.FC<CreatePlaylistStepProps> = ({
  items,
  onCreatePlaylist,
  onBackToReview,
  onResetAll,
}) => {
  const selectedTracks = items
    .map((i) => i.selectedTrack)
    .filter((t): t is NonNullable<typeof t> => !!t);

  const defaultDateStr = new Date().toLocaleDateString('pt-BR');
  const [name, setName] = useState(`Minha Playlist (${defaultDateStr})`);
  const [description, setDescription] = useState(
    `Playlist gerada automaticamente com ${selectedTracks.length} músicas selecionadas.`
  );
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<PlaylistCreationResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onCreatePlaylist(name.trim(), description.trim(), isPublic);
      setCreatedResult(result);

      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar a playlist no Spotify.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReconnect = async () => {
    logout();
    const id = getStoredClientId();
    if (id) {
      await redirectToSpotifyAuthorize(id);
    } else {
      window.location.reload();
    }
  };

  if (createdResult) {
    return (
      <div className="step-card success-card fade-in">
        <div className="success-icon-wrapper">
          <CheckCircle2 size={48} className="success-check-icon" />
        </div>

        <h2 className="success-title">Playlist Criada com Sucesso no Spotify!</h2>
        <p className="success-subtitle">
          Adicionamos <strong>{selectedTracks.length}</strong> músicas diretamente na sua conta do Spotify.
        </p>

        <div className="created-playlist-card">
          <div className="created-covers-mosaic">
            {selectedTracks.slice(0, 4).map((t, idx) => (
              <img
                key={idx}
                src={t.album.images?.[0]?.url || ''}
                alt={t.name}
                className="mosaic-cover-mini"
              />
            ))}
          </div>

          <div className="created-playlist-info">
            <h3 className="created-name">{createdResult.name}</h3>
            <p className="created-desc">{createdResult.description}</p>
            <div className="created-meta">
              <span>{isPublic ? '🌐 Playlist Pública' : '🔒 Playlist Privada'}</span>
              <span className="bullet-sep">•</span>
              <span>{selectedTracks.length} faixas</span>
            </div>
          </div>
        </div>

        <div className="success-actions">
          <a
            href={createdResult.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn primary-btn large-btn spotify-open-btn"
          >
            <Music2 size={20} />
            <span>Ouvir Playlist no Spotify</span>
            <ExternalLink size={16} />
          </a>

          <button className="btn secondary-btn" onClick={onResetAll}>
            <RotateCcw size={16} />
            <span>Criar Outra Playlist</span>
          </button>
        </div>
      </div>
    );
  }

  const previewCovers = selectedTracks
    .map((t) => t.album.images?.[0]?.url)
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="step-card fade-in">
      <div className="card-header">
        <div className="card-title-group">
          <ListPlus className="header-icon" size={24} />
          <div>
            <h2>Detalhes da Playlist no Spotify</h2>
            <p className="card-subtitle">
              Personalize o nome, descrição e visibilidade da sua nova playlist.
            </p>
          </div>
        </div>
      </div>

      <div className="create-layout-grid">
        <div className="covers-preview-section">
          <div className="covers-mosaic-box">
            {previewCovers.length >= 4 ? (
              <div className="mosaic-grid">
                {previewCovers.map((url, i) => (
                  <img key={i} src={url} alt="Cover preview" className="mosaic-img" />
                ))}
              </div>
            ) : previewCovers.length > 0 ? (
              <img src={previewCovers[0]} alt="Cover" className="single-cover-img" />
            ) : (
              <div className="empty-cover-placeholder">
                <Disc size={48} />
              </div>
            )}
          </div>
          <div className="covers-caption">
            <Sparkles size={14} className="caption-icon" />
            <span>{selectedTracks.length} músicas prontas para exportação</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="playlist-form">
          {error && (
            <div className="form-error-banner">
              <AlertCircle size={20} className="error-alert-icon" />
              <div className="error-alert-content">
                <strong>Falha ao autorizar criação da playlist</strong>
                <p>{error}</p>
                <button
                  type="button"
                  className="btn primary-btn small-btn reconnect-btn"
                  onClick={handleReconnect}
                >
                  <LogIn size={14} />
                  <span>Reconectar com Novas Permissões</span>
                </button>
              </div>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="playlistName">Nome da Playlist:</label>
            <input
              id="playlistName"
              type="text"
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Melhores do Rock Clássico"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="playlistDesc">Descrição (opcional):</label>
            <textarea
              id="playlistDesc"
              className="text-input textarea-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma breve descrição para sua playlist..."
            />
          </div>

          <div className="privacy-toggle-box">
            <label className="toggle-label">Visibilidade no Spotify:</label>
            <div className="privacy-options">
              <button
                type="button"
                className={`privacy-btn ${!isPublic ? 'active' : ''}`}
                onClick={() => setIsPublic(false)}
              >
                <Lock size={16} />
                <div className="privacy-btn-text">
                  <strong>Privada</strong>
                  <span>Apenas você pode ver e escutar</span>
                </div>
              </button>

              <button
                type="button"
                className={`privacy-btn ${isPublic ? 'active' : ''}`}
                onClick={() => setIsPublic(true)}
              >
                <Globe size={16} />
                <div className="privacy-btn-text">
                  <strong>Pública</strong>
                  <span>Visível no seu perfil e para amigos</span>
                </div>
              </button>
            </div>
          </div>

          <div className="form-actions-footer">
            <button
              type="button"
              className="btn secondary-btn"
              onClick={onBackToReview}
              disabled={isSubmitting}
            >
              <ArrowLeft size={16} />
              <span>Voltar à Revisão</span>
            </button>

            <button
              type="submit"
              className="btn primary-btn large-btn glow-btn"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  <span>Criando no Spotify...</span>
                </>
              ) : (
                <>
                  <ListPlus size={18} />
                  <span>Criar Playlist Agora</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
