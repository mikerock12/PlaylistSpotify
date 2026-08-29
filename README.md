<h1 align="center">🎵 Text to Spotify Playlist</h1>

<p align="center">
  <strong>Cole uma lista de músicas em texto — receba uma playlist oficial no seu Spotify.</strong><br>
  Entende setlists do YouTube com minutagem, detecta a banda sozinho e escolhe a versão mais ouvida de cada faixa.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="Spotify Web API" src="https://img.shields.io/badge/Spotify-Web%20API-1DB954?logo=spotify&logoColor=white">
  <img alt="OAuth 2.0 PKCE" src="https://img.shields.io/badge/OAuth%202.0-PKCE-0F9D58">
</p>

---

## 📖 O que é

Você acha um show completo no YouTube, copia a setlist da descrição — e ela vem assim:

```
Red Hot Chili Peppers - LIVE HD (From The Basement 2012)
Setlist:
0:47 Monarchy of Roses
6:03 Factory of Faith
11:18 Ethiopia
```

Recriar isso na mão no Spotify é tedioso: apagar minutagem, digitar o nome da banda em toda linha, e ainda tomar cuidado para não cair em cover, karaokê ou tributo.

O **Text to Spotify Playlist** faz esse trabalho. Você cola o texto cru, ele limpa, identifica cada faixa no catálogo oficial do Spotify, mostra o que encontrou para você revisar, e cria a playlist na sua conta.

---

## ✨ Funcionalidades

| | |
|---|---|
| 🧹 **Limpeza automática de texto** | Remove minutagens (`0:47`, `17:57`, `1:15:30`, `[17:57]`, `(17:57)`), numeração de faixas (`01.`, `1 -`, `12)`), cabeçalhos (`Setlist:`, `Tracklist`), contagem de visualizações e links. |
| 🎯 **Detecção automática de artista** | Reconhece a banda no título do vídeo (`Red Hot Chili Peppers - LIVE HD (...)`), em prefixos explícitos (`Banda:`, `Artista:`) ou quando o nome aparece isolado na primeira/última linha — e aplica em todas as faixas sem artista. |
| 🔀 **Formatos flexíveis de linha** | Detecção automática, ou forçar `Artista - Música` / `Música - Artista`. Aceita hífen, travessão, dois-pontos, barra, pipe, vírgula e tabulação como separador. |
| 🔥 **Busca por popularidade inteligente** | Ranqueia os candidatos combinando similaridade de artista (35%), similaridade de título (35%) e popularidade no Spotify (30%) — priorizando a versão que o público realmente ouve, não a primeira que aparece. |
| 🚫 **Filtro anti-cover** | Penaliza resultados marcados como *tribute*, *karaoke*, *cover* e *instrumental version*, evitando as armadilhas clássicas da busca do Spotify. |
| 🚦 **Classificação por confiança** | Cada faixa vira **Alta Confiança**, **Ambígua** ou **Não Encontrada**, com abas para filtrar e resolver só o que precisa de atenção. |
| 🎧 **Prévia de áudio e troca de versão** | Toque o preview de 30s direto na revisão e, num clique, abra as 10 melhores alternativas para escolher outra gravação (ao vivo, remaster, single). |
| 📝 **Playlist sob medida** | Nome, descrição e visibilidade (pública/privada) definidos por você antes de enviar. |
| 🔐 **OAuth 2.0 + PKCE** | Login direto no navegador contra o Spotify. Sem backend, sem *client secret*, sem senha passando por lugar nenhum. |

---

## 🖼️ Como funciona, na prática

### 1. Cole a lista

A tela inicial aceita desde uma lista simples `Artista - Música` até a descrição bruta de um show do YouTube. Há exemplos prontos para testar em um clique.

![Tela de entrada de músicas](docs/screenshots/01-inserir-musicas.png)

### 2. O parser resolve o resto

Ao colar uma setlist com minutagem, o app **identifica a banda automaticamente**, remove os timestamps e já mostra quantas faixas foram reconhecidas — tudo antes de qualquer chamada à API.

![Setlist do YouTube com artista detectado automaticamente](docs/screenshots/02-setlist-youtube.png)

### 3. Conecte sua conta

A conexão usa apenas o **Client ID** (público) de um app gratuito no painel do Spotify. A Redirect URI é gerada e exibida pronta para copiar.

![Modal de configuração do Client ID](docs/screenshots/03-config-client-id.png)

### 4. Guia embutido

Um passo a passo dentro do próprio app explica como gerar o Client ID em 4 etapas, sem sair da tela.

![Modal Como Usar](docs/screenshots/04-como-usar.png)

> As telas **2. Revisar Versões & Ambiguidade** e **3. Criar Playlist** exigem uma sessão autenticada do Spotify e por isso não estão nas capturas acima.

---

## 🧠 Características de desenvolvimento

**Arquitetura 100% client-side.** Não existe servidor próprio: o navegador fala direto com `accounts.spotify.com` e `api.spotify.com`. Isso elimina a superfície de backend e, junto com o PKCE, dispensa qualquer segredo de aplicação.

**Separação em camadas.** A regra de negócio vive fora da UI:

```
src/
├── services/
│   ├── parser.ts       # Análise de texto: timestamps, artista global, separadores
│   ├── spotifyApi.ts   # Busca em cascata, scoring, criação de playlist
│   └── auth.ts         # OAuth 2.0 PKCE, persistência e refresh de token
├── components/         # UI em passos + modais
├── types/spotify.ts    # Contratos de tipo compartilhados
└── App.tsx             # Orquestração de estado e fluxo entre passos
```

**Busca em cascata com fallbacks.** A consulta ao Spotify não é uma tentativa só: começa com a query estruturada (`artist:` + `track:`), degrada para busca livre, depois para o título limpo de sufixos (`(Live)`, `feat. ...`) e, por último, só o título. Cada nível só roda se o anterior não trouxe resultado.

**Scoring determinístico e auditável.** O `totalScore` é uma fórmula explícita — `artistSim × 0.35 + titleSim × 0.35 + popularidade × 0.30 − penalidades` — sobre similaridade de Jaccard com normalização Unicode (acentos removidos, caixa unificada). Empates dentro de 0,05 são desempatados por popularidade, e diferenças menores que 0,03 entre 1º e 2º lugar marcam a faixa como **ambígua** em vez de escolher no escuro.

**Resiliência de sessão.** Token renovado automaticamente via `refresh_token`; um `401` no meio de um lote dispara o refresh e refaz a requisição. A troca do `authorization_code` é protegida contra corrida por uma promise única, evitando o erro de código reutilizado no retorno do OAuth.

**Busca em lote com concorrência limitada.** As faixas são processadas em blocos de 3 requisições paralelas, com barra de progresso — rápido o bastante sem provocar rate limit da API.

**TypeScript estrito.** Todas as respostas da API têm tipo declarado em `types/spotify.ts`. Lint com **Oxlint** (Rust) e build com **Vite 8** + **React 19**.

---

## 🔒 Segurança

- **Nenhuma credencial no repositório.** Não há *client secret* — o fluxo PKCE não usa um.
- **O Client ID é seu e fica no seu navegador**, em `localStorage`. Nunca é commitado nem enviado a terceiros.
- **Tokens ficam apenas no seu `localStorage`**, e o botão de desconectar os apaga.
- `.env` está no `.gitignore`. A variável opcional `VITE_SPOTIFY_CLIENT_ID` existe só como conveniência local.
- Redirect URI fixada em `127.0.0.1` (exigência atual do Spotify — `localhost` é rejeitado).

---

## 🚀 Como rodar

**Pré-requisitos:** Node.js 20+ e uma conta Spotify (a gratuita serve).

```bash
git clone https://github.com/mikerock12/PlaylistSpotify.git
cd PlaylistSpotify
npm install
npm run dev
```

Acesse **http://127.0.0.1:5173** (no Windows, `iniciar.bat` sobe o servidor e abre o navegador).

### Gerando seu Client ID

1. Acesse o [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) e clique em **Create app**.
2. Preencha nome e descrição livremente.
3. Em **Redirect URIs**, adicione exatamente `http://127.0.0.1:5173`.
4. Em **Which API/SDKs**, marque **Web API**. Aceite os termos e salve.
5. Em **Settings**, copie o **Client ID** e cole no botão **Configurar Client ID** do app.

### Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Type-check (`tsc -b`) + build de produção |
| `npm run preview` | Serve o build localmente |
| `npm run lint` | Análise estática com Oxlint |

---

## 🛠️ Stack

**React 19** · **TypeScript 6** · **Vite 8** · **Oxlint** · **Spotify Web API** · **lucide-react** · **canvas-confetti**

---

## 👤 Autor

**Maicon Nunes** — [@mikerock12](https://github.com/mikerock12)
