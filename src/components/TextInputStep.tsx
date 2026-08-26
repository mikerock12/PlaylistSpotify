import React, { useState, useMemo } from 'react';
import { parseSongList } from '../services/parser';
import type { ParseFormat } from '../services/parser';
import { Sparkles, Trash2, ArrowRight, Info, Disc3, LogIn } from 'lucide-react';

interface TextInputStepProps {
  initialText: string;
  onProcessList: (rawText: string, format: ParseFormat) => void;
  isAuthenticated: boolean;
  onConnectClick: () => void;
}

const PRESET_EXAMPLES: Record<string, { label: string; text: string }> = {
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
  onProcessList,
  isAuthenticated,
  onConnectClick,
}) => {
  const [text, setText] = useState(initialText);
  const [format, setFormat] = useState<ParseFormat>('auto');

  const parsedPreview = useMemo(() => {
    return parseSongList(text, format);
  }, [text, format]);

  const handlePresetClick = (presetKey: string) => {
    setText(PRESET_EXAMPLES[presetKey].text);
  };

  const handleClear = () => {
    setText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || parsedPreview.length === 0) return;
    onProcessList(text, format);
  };

  return (
    <div className="step-card fade-in">
      <div className="card-header">
        <div className="card-title-group">
          <Disc3 className="header-icon" size={24} />
          <div>
            <h2>Cole ou Digite sua Lista de Músicas</h2>
            <p className="card-subtitle">
              Insira as bandas e músicas linha por linha. O sistema identificará automaticamente e buscará a versão mais ouvida no Spotify.
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
              <option value="auto">Detecção Automática (Recomendado)</option>
              <option value="artist_song">Artista - Nome da Música</option>
              <option value="song_artist">Nome da Música - Artista</option>
            </select>
          </div>

          <div className="song-counter-badge">
            <Sparkles size={14} className="counter-icon" />
            <span>
              <strong>{parsedPreview.length}</strong> {parsedPreview.length === 1 ? 'música identificada' : 'músicas identificadas'}
            </span>
          </div>
        </div>

        {/* Main Textarea */}
        <div className="textarea-container">
          <textarea
            className="song-textarea"
            rows={12}
            placeholder={`Cole sua lista aqui...\n\nExemplos de formatos aceitos:\nQueen - Bohemian Rhapsody\nPink Floyd: Wish You Were Here\n1. The Beatles - Come Together\nMichael Jackson, Billie Jean`}
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
            Dica: Você pode copiar listas do Bloco de Notas, Word, WhatsApp, Excel ou sites de letras. Nós cuidamos da limpeza de números e pontuações.
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
