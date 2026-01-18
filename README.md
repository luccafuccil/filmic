# Filmic

Filmic é um player de vídeo desktop desenvolvido para gerenciar e assistir sua biblioteca local de filmes e séries. Com interface moderna e intuitiva, o aplicativo oferece uma experiência completa para organizar e consumir seu conteúdo de mídia.

## Características Principais

### Gerenciamento de Mídia

- Organização automática de filmes e séries através da leitura de arquivos locais
- Parser inteligente de nomes de arquivos que identifica títulos, anos, temporadas e episódios
- Suporte completo para séries de TV com visualização por temporadas e episódios
- Pesquisa e filtragem por título

### Metadados e Informações

- Integração com TMDB (The Movie Database) para buscar informações detalhadas
- Exibição de sinopse, diretor (filmes) ou criador (séries), ano de lançamento
- Sistema de cache para otimizar consultas e reduzir chamadas à API
- Detecção automática de qualidade de vídeo (resolução)

### Reprodução de Vídeo

- Player de vídeo customizado baseado em Video.js
- Controle de progresso com salvamento automático
- Seção "Continuar Assistindo" para retomar de onde parou
- Suporte a legendas com detecção automática de encoding
- Atalhos de teclado para controle total durante a reprodução

### Geração de Thumbnails

- Criação automática de miniaturas para filmes e episódios usando FFmpeg
- Cache eficiente de thumbnails para carregamento rápido
- Geração sob demanda para otimizar performance

## Arquitetura Técnica

### Stack de Tecnologias

- **Electron**
- **React**
- **Webpack**
- **FFmpeg**
- **Video.js**
- **TMDB API**

### Estrutura do Projeto

```
electron/
├── main.js                      # Processo principal do Electron
├── preload.js                   # Script de contexto isolado
├── handlers/                    # Handlers IPC para comunicação renderer-main
│   ├── fileHandlers.js         # Operações de arquivo e diretório
│   ├── thumbnailHandlers.js    # Geração de thumbnails
│   ├── tmdbHandlers.js         # Consultas à API do TMDB
│   └── watchProgressHandlers.js # Controle de progresso de visualização
└── utils/                       # Utilitários e serviços
    ├── metadataCache.js        # Cache de metadados de arquivos
    ├── movieParser.js          # Parser de nomes de filmes
    ├── tvShowParser.js         # Parser de nomes de séries
    ├── tmdbService.js          # Integração com TMDB API
    ├── thumbnailGenerator.js   # Geração de miniaturas
    ├── subtitleCache.js        # Cache de legendas
    └── watchProgressCache.js   # Persistência de progresso

src/
├── components/                  # Componentes React
│   ├── MovieCard.jsx           # Card de filme
│   ├── TVShowCard.jsx          # Card de série
│   ├── SeasonView.jsx          # Visualização de temporada
│   ├── EpisodeCard.jsx         # Card de episódio
│   ├── VideoPlayer.jsx         # Player de vídeo
│   ├── ContinueWatchingSection.jsx # Seção continuar assistindo
│   └── Settings.jsx            # Configurações
├── hooks/                       # React hooks customizados
│   ├── useMediaLibrary.js      # Hook para gerenciar biblioteca
│   ├── useThumbnail.js         # Hook para carregar thumbnails
│   └── useKeyboardShortcuts.js # Atalhos de teclado
└── services/
    └── electronAPI.js          # API de comunicação com processo principal
```

### Comunicação Entre Processos

O aplicativo utiliza o sistema IPC (Inter-Process Communication) do Electron para comunicação entre o processo principal e o renderer:

- **Processo Principal (main.js)**: Gerencia janelas, sistema de arquivos, processamento de vídeo e APIs externas
- **Processo Renderer (React)**: Interface do usuário e lógica de apresentação
- **Preload Script**: Expõe APIs seguras para o renderer através de contextBridge

### Sistema de Cache

Implementa múltiplos níveis de cache para otimizar performance:

- Cache de metadados TMDB em memória
- Cache de thumbnails em disco
- Cache de legendas processadas
- Cache de progresso de visualização

## Desenvolvimento

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

### Instalação

```bash
npm install
```

### Executar em Modo de Desenvolvimento

```bash
# Terminal 1: Compilar código React em modo watch
npm run dev

# Terminal 2: Iniciar aplicação Electron
npm start
```

### Compilar e Distribuir

```bash
# Build de produção para Windows
npm run dist:win

# Build rápido (sem otimizações) para testes
npm run dist:fast

# Build portátil (não requer instalação)
npm run dist:portable
```

## Scripts Disponíveis

- `npm start` - Inicia a aplicação Electron
- `npm run build` - Compila o código React para produção
- `npm run build:fast` - Compila em modo desenvolvimento (mais rápido)
- `npm run dev` - Compila em modo watch para desenvolvimento
- `npm run pack` - Gera build local sem instalador
- `npm run dist` - Gera distribuível completo
- `npm run dist:win` - Gera instalador para Windows
- `npm run release` - Publica nova versão com auto-update

## Configuração

O arquivo `electron-builder.yml` contém as configurações de build e empacotamento da aplicação.

## Licença

Privado - Não destinado para distribuição pública
