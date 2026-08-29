import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';
import { getRedirectUri } from '../services/auth';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const redirectUri = getRedirectUri();

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container large-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <HelpCircle className="modal-title-icon" size={22} />
            <h3>Como Obter seu Client ID Gratuito no Spotify</h3>
          </div>
          <button className="icon-only-btn close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body modal-scrollable">
          <p className="help-intro">
            O Spotify permite que qualquer pessoa com uma conta comum ou gratuita crie aplicativos e acesse a API oficial de forma <strong>100% gratuita</strong>. Siga os 4 passos rápidos:
          </p>

          <div className="steps-timeline">
            {/* Step 1 */}
            <div className="timeline-item">
              <div className="timeline-badge">1</div>
              <div className="timeline-content">
                <h4>Acesse o Spotify Developer Dashboard</h4>
                <p>
                  Entre no site oficial do Spotify for Developers com seu login usual do Spotify.
                </p>
                <a
                  href="https://developer.spotify.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="step-link"
                >
                  <span>Ir para developer.spotify.com/dashboard</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="timeline-item">
              <div className="timeline-badge">2</div>
              <div className="timeline-content">
                <h4>Crie uma Nova Aplicação ("Create app")</h4>
                <p>Clique no botão <strong>"Create app"</strong> e preencha os campos:</p>
                <ul className="step-list">
                  <li><strong>App name:</strong> <code>Text to Playlist</code></li>
                  <li><strong>App description:</strong> <code>Criador automático de playlists</code></li>
                  <li>
                    <strong>Redirect URIs:</strong> Cole a URL abaixo e clique em <strong>Add</strong>:
                    <div className="inline-copy-box">
                      <code>{redirectUri}</code>
                      <button className="copy-button small-btn" onClick={handleCopy}>
                        {copied ? <Check size={12} className="success-icon" /> : <Copy size={12} />}
                        <span>{copied ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </li>
                  <li><strong>Which API/SDKs are you planning to use?:</strong> Marque ☑ <strong>Web API</strong></li>
                  <li>Aceite os termos e clique em <strong>Save</strong>.</li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="timeline-item">
              <div className="timeline-badge">3</div>
              <div className="timeline-content">
                <h4>Copie o Client ID</h4>
                <p>
                  Na página do seu aplicativo recém-criado, clique em <strong>Settings</strong> e copie a sequência do campo <strong>Client ID</strong>.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="timeline-item">
              <div className="timeline-badge">4</div>
              <div className="timeline-content">
                <h4>Cole no nosso aplicativo e Conecte</h4>
                <p>
                  Clique no botão verde <strong>"Configurar Client ID"</strong> no topo deste site, cole o código e faça o login seguro para autorizar a criação das suas playlists!
                </p>
              </div>
            </div>
          </div>

          <div className="feature-highlight-box">
            <div className="feature-highlight-header">
              <Sparkles className="feature-icon" size={18} />
              <strong>Como o sistema escolhe a versão de cada faixa?</strong>
            </div>
            <p>
              O sistema pesquisa no catálogo oficial do Spotify e ranqueia os resultados por semelhança de artista e de título, descartando tributos, covers não oficiais e karaokê. Quando o Spotify fornece a métrica de <em>Popularity</em> (0 a 100), ela entra no cálculo para priorizar a gravação mais ouvida; sem ela, vale a ordem de relevância da própria busca. Caso haja regravações, álbuns ao vivo ou edições comemorativas muito próximas, a faixa é marcada como <em>Divergência / Ambiguidade</em> para que você escolha a versão exata com 1 clique!
            </p>
          </div>
        </div>

        <div className="modal-footer justify-end">
          <button className="btn primary-btn" onClick={onClose}>
            <CheckCircle2 size={16} />
            <span>Entendi, vamos lá!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
