import React from 'react';
import type { SpotifyUser } from '../types/spotify';
import { Music2, LogOut, Settings, HelpCircle, User as UserIcon, Sparkles } from 'lucide-react';

interface NavbarProps {
  user: SpotifyUser | null;
  onOpenConfig: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
  clientId: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenConfig,
  onOpenHelp,
  onLogout,
  clientId,
}) => {
  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Logo & Brand */}
        <div className="navbar-brand">
          <div className="logo-icon-wrapper">
            <Music2 className="logo-icon" size={24} />
            <Sparkles className="sparkle-badge" size={12} />
          </div>
          <div className="brand-text">
            <span className="brand-title">Text to Spotify</span>
            <span className="brand-subtitle">Smart Playlist Builder</span>
          </div>
        </div>

        {/* Actions & Profile */}
        <div className="navbar-actions">
          <button
            className="nav-btn ghost-btn"
            onClick={onOpenHelp}
            title="Como configurar e usar"
          >
            <HelpCircle size={18} />
            <span className="btn-label">Como Usar</span>
          </button>

          <button
            className={`nav-btn ${clientId ? 'secondary-btn' : 'glow-btn'}`}
            onClick={onOpenConfig}
            title="Configurar Client ID do Spotify"
          >
            <Settings size={18} />
            <span className="btn-label">
              {clientId ? 'Credenciais' : 'Configurar Client ID'}
            </span>
          </button>

          {user ? (
            <div className="user-profile-badge">
              {user.images && user.images.length > 0 ? (
                <img
                  src={user.images[0].url}
                  alt={user.display_name}
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-fallback">
                  <UserIcon size={16} />
                </div>
              )}
              <div className="user-info">
                <span className="user-name">{user.display_name}</span>
                <span className="user-status">Conectado ao Spotify</span>
              </div>
              <button
                className="icon-only-btn logout-btn"
                onClick={onLogout}
                title="Desconectar do Spotify"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="disconnected-pill">
              <span className="status-dot offline"></span>
              <span>Não Conectado</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
