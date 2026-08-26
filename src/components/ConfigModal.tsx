import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck, KeyRound } from 'lucide-react';
import { getRedirectUri, setStoredClientId } from '../services/auth';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClientId: string;
  onSaveAndLogin: (clientId: string) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  currentClientId,
  onSaveAndLogin,
}) => {
  const [clientId, setClientId] = useState(currentClientId);
  const [copied, setCopied] = useState(false);
  const redirectUri = getRedirectUri();

  if (!isOpen) return null;

  const handleCopyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) return;
    setStoredClientId(clientId.trim());
    onSaveAndLogin(clientId.trim());
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <KeyRound className="modal-title-icon" size={22} />
            <h3>Configuração de Credenciais do Spotify</h3>
          </div>
          <button className="icon-only-btn close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <p className="modal-description">
            Para criar playlists e pesquisar músicas na sua conta, insira o seu <strong>Client ID</strong> gratuito gerado no painel de desenvolvedores do Spotify.
          </p>

          {/* Redirect URI box */}
          <div className="info-card">
            <div className="info-card-header">
              <span className="info-label">Sua Redirect URI (Copie e cole no painel do Spotify):</span>
              <button
                type="button"
                className="copy-button"
                onClick={handleCopyRedirect}
              >
                {copied ? <Check size={14} className="success-icon" /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <code className="code-display">{redirectUri}</code>
          </div>

          {/* Client ID Input */}
          <div className="input-group">
            <label htmlFor="clientId">Client ID do Spotify:</label>
            <input
              id="clientId"
              type="text"
              className="text-input"
              placeholder="Ex: 3f8a192c7d0e4f1b8a92c3d4e5f6..."
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />
          </div>

          <div className="security-notice">
            <ShieldCheck size={18} className="shield-icon" />
            <span>
              <strong>100% Seguro:</strong> Utilizamos autenticação <strong>OAuth 2.0 PKCE</strong> direto no seu navegador. Nenhuma senha ou segredo é enviado para terceiros.
            </span>
          </div>

          <div className="modal-footer">
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="link-btn"
            >
              <span>Abrir Spotify Dashboard</span>
              <ExternalLink size={14} />
            </a>

            <div className="footer-actions">
              <button type="button" className="btn secondary-btn" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn primary-btn"
                disabled={!clientId.trim()}
              >
                Conectar ao Spotify
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
