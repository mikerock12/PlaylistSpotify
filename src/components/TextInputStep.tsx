import React, { useState, useMemo } from 'react';
import { parseSongList, detectGlobalArtist } from '../services/parser';
import type { ParseFormat } from '../services/parser';
import { Sparkles, Trash2, ArrowRight, Info, Disc3, LogIn, Radio } from 'lucide-react';

interface TextInputStepProps {
  initialText: string;
  initialArtist?: string;
  onProcessList: (rawText: string, format: ParseFormat, defaultArtist?: string) => void;
  isAuthenticated: boolean;
  onConnectClick: () => void;
}

const PRESET_EXAMPLES: Record<string, { label: string; text: string; artist?: string }> = {
  youtube_rhcp: {
    label: '🔴 Show no YouTube (RHCP)',
    artist: 'Red Hot Chili Peppers',
    text: `Red Hot Chili Peppers - LIVE HD (From The Basement 2012)
Setlist:
0:47 Monarchy of Roses
6:03 Factory of Faith
11:18 Ethiopia
17:57 Look Around
21:25 The Adventures of Rain Dance Maggie
27:44 Did I Let You Know
32:13 Goodbye Hooray
36:08 Police Station
42:31 Meet Me at the Corner`,
  },
  rock: {
    label: '🎸 Rock Clássico',
    text: `Queen - Bohemian Rhapsody
Pink Floyd - Wish You Were Here
Led Zeppelin - Stairway to Heaven
AC/DC - Back in Black
The Beatles - Come Together
Dire Straits - Sultans of Swing
Eagles - Hotel California
Guns N' Roses - Sweet Child O' Mine`,
  },
  pop: {
    label: '✨ Pop Internacional',
    text: `Michael Jackson - Billie Jean
The Weeknd - Blinding Lights
Dua Lipa - Levitating
Coldplay - Viva La Vida
Bruno Mars - 24K Magic
Harry Styles - As It Was
Adele - Rolling in the Deep`,
  },
  mpb: {
    label: '🇧🇷 Música Brasileira',
    text: `Tim Maia - Não Quero Dinheiro
Legião Urbana - Tempo Perdido
Jorge Ben Jor - Mas Que Nada
Elis Regina - Como Nossos Pais
Caetano Veloso - Sozinho
Alceu Valença - Anunciação
Djavan - Oceano`,
  },
};

export const TextInputStep: React.FC<TextInputStepProps> = ({
  initialText,
  initialArtist = '',
  onProcessList,
  isAuthenticated,
  onConnectClick,
}) => {
  const [text, setText] = useState(initialText);
  const [customArtist, setCustomArtist] = useState(initialArtist);
  const [format, setFormat] = useState<ParseFormat>('auto');

  // Auto-detectar artista a partir do texto quando o usuário cola algo
  const autoDetectedArtist = useMemo(() => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const { detectedArtist } = detectGlobalArtist(lines);
    return detectedArtist;
  }, [text]);

  // Se detectou artista e o usuário ainda não digitou um customizado, sugerir
  const activeArtist = customArtist.trim() || autoDetectedArtist || '';

  const { songs: parsedPreview } = useMemo(() => {
    return parseSongList(text, format, customArtist);
  }, [text, format, customArtist]);

  const handlePresetClick = (presetKey: string) => {
    const preset = PRESET_EXAMPLES[presetKey];
    setText(preset.text);
    if (preset.artist) {
      setCustomArtist(preset.artist);
    } else {
      setCustomArtist('');
    }
  };

  const handleClear = () => {
    setText('');
    setCustomArtist('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || parsedPreview.length === 0) return;
    onProcessList(text, format, activeArtist);
  };

  return (
    <div className="step-card fade-in">
      <div className="card-header">
        <div className="card-title-group">
          <Disc3 className="header-icon" size={24} />
          <div>
            <h2>Cole ou Digite sua Lista de Músicas</h2>
            <p className="card-subtitle">
              Insira músicas individuais ou <strong>setlists de shows do YouTube</strong> com minutagens (ex: <code>17:57 Look Around</code>). O sistema identifica a banda e busca as versões mais ouvidas no Spotify.
            </p>
          </div>
        </div>

        {/* Presets */}
        <div className="presets-bar">
          <span className="preset-label">Exemplos rápidos:</span>
          {Object.entries(PRESET_EXAMPLES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              className="preset-btn"
              onClick={() => handlePresetClick(key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        {/* Setlist & Global Artist Bar */}
        <div className="global-artist-box">
          <div className="global-artist-header">
            <Radio size={16} className="global-artist-icon" />
            <label htmlFor="customArtistInput">
              Banda / Artista Principal <em>(Opcional - Útil para shows completos e setlists do YouTube)</em>:
            </label>
          </div>
          <div className="global-artist-input-wrapper">
            <input
              id="customArtistInput"
              type="text"
              className="global-artist-input"
              placeholder="Ex: Red Hot Chili Peppers (ou deixe em branco se cada linha tiver seu próprio artista)"
              value={customArtist}
              onChange={(e) => setCustomArtist(e.target.value)}
            />
            {autoDetectedArtist && !customArtist && (
              <button
                type="button"
                className="detected-artist-chip"
                onClick={() => setCustomArtist(autoDetectedArtist)}
                title="Clique para fixar este artista detectado"
              >
                <Sparkles size={13} />
                <span>Detectado no texto: <strong>{autoDetectedArtist}</strong></span>
              </button>
            )}
          </div>
        </div>

        {/* Formats and helper bar */}
        <div className="form-settings-bar">
          <div className="format-selector">
            <label htmlFor="formatSelect">Estrutura das Linhas:</label>
            <select
              id="formatSelect"
              className="select-dropdown"
              value={format}
              onChange={(e) => setFormat(e.target.value as ParseFormat)}
            >
              <option value="auto">Detecção Automática (Show, Minutagem ou Artista - Música)</option>
              <option value="artist_song">Artista - Nome da Música</option>
              <option value="song_artist">Nome da Música - Artista</option>
            </select>
          </div>

          <div className="song-counter-badge">
            <Sparkles size={14} className="counter-icon" />
            <span>
              <strong>{parsedPreview.length}</strong> {parsedPreview.length === 1 ? 'música identificada' : 'músicas identificadas'}
              {activeArtist && ` (Banda: ${activeArtist})`}
            </span>
          </div>
        </div>

        {/* Main Textarea */}
        <div className="textarea-container">
          <textarea
            className="song-textarea"
            rows={12}
            placeholder={`Cole sua lista aqui...\n\nFormatos aceitos:\n✓ Setlists do YouTube: "17:57 Look Around" ou "0:47 Monarchy of Roses"\n✓ Padrão com traço: "Red Hot Chili Peppers - Californication"\n✓ Lista numerada: "1. Look Around"\n✓ O nome da banda pode estar no início, no fim ou no campo acima!`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />

          {text && (
            <button
              type="button"
              className="clear-text-btn"
              onClick={handleClear}
              title="Limpar texto"
            >
              <Trash2 size={16} />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Format tip */}
        <div className="format-tip">
          <Info size={16} className="tip-icon" />
          <span>
            Dica: Copie a descrição ou os comentários do show no YouTube diretamente. O sistema remove automaticamente minutagens como <code>17:57</code> e cabeçalhos como <code>Setlist:</code>!
          </span>
        </div>

        {/* Authentication Notice if not logged in */}
        {!isAuthenticated && (
          <div className="auth-alert-banner">
            <div className="alert-content">
              <strong>Você ainda não conectou sua conta do Spotify.</strong>
              <p>Conecte seu Client ID gratuito para podermos buscar no catálogo oficial e gerar sua playlist.</p>
            </div>
            <button
              type="button"
              className="btn login-alert-btn"
              onClick={onConnectClick}
            >
              <LogIn size={16} />
              <span>Conectar ao Spotify</span>
            </button>
          </div>
        )}

        {/* Action Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn primary-btn large-btn"
            disabled={parsedPreview.length === 0}
          >
            <span>Buscar & Analisar Versões Mais Ouvidas</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

