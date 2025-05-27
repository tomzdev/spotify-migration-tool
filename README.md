# 🎵 Spotify Migration Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A powerful, user-friendly web application to seamlessly migrate your music library between Spotify accounts. Transfer playlists, saved tracks, and followed artists with just a few clicks while preserving the original order and metadata.

## ✨ Features

- 🎶 **Complete Migration**: Transfer playlists, saved tracks, and followed artists
- 🎯 **Selective Transfer**: Choose exactly what you want to migrate
- 🔒 **Secure Authentication**: Direct OAuth with Spotify - your credentials never touch our servers
- 📝 **Preserves Order**: Maintains the original chronological order of your music
- 🚀 **Modern UI**: Beautiful, responsive interface built with React and Material-UI
- 🔄 **Real-time Progress**: Live updates during the migration process
- 🛡️ **Error Handling**: Robust error handling and retry mechanisms

## 🚀 Quick Start

### Option 1: Use the Hosted Version

Visit our hosted version at [your-deployed-url.com](https://your-deployed-url.com) (currently in beta with limited access).

### Option 2: Self-Hosting (Recommended)

See our detailed [Self-Hosting Guide](SELF-HOSTING.md) for complete instructions.

**Quick Setup:**

1. **Clone and Install**
   ```bash
   git clone https://github.com/tomzdev/spotify-migration-tool.git
   cd spotify-migration-tool
   npm install
   ```

2. **Create Spotify App**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Create a new app
   - Add redirect URIs: `http://localhost:5000/api/auth/source/callback` and `http://localhost:5000/api/auth/destination/callback`

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Spotify app credentials
   ```

4. **Start the Application**
   ```bash
   npm start
   ```

Visit `http://localhost:5000` and start migrating! 🎉

## 📖 Documentation

- **[Self-Hosting Guide](SELF-HOSTING.md)** - Complete guide for running your own instance
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[API Documentation](#api-documentation)** - Backend API reference

## 🔧 Development

### Prerequisites

- Node.js ≥ 16.0.0
- npm or yarn
- A Spotify account (free tier works)

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Create your Spotify app in the [Developer Dashboard](https://developer.spotify.com/dashboard/)
4. Copy `.env.example` to `.env` and configure your credentials
5. Start development servers: `npm run dev:full`

This starts both the backend server and React development server with hot reloading.

### Project Structure

```
spotify-migration-tool/
├── server.js              # Express server entry point
├── routes/                 # API routes
│   ├── auth.js            # Authentication endpoints
│   ├── migration.js       # Migration logic
│   └── playlist-tracks.js # Playlist management
├── client/                # React frontend
│   ├── src/
│   │   ├── pages/         # React pages/components
│   │   └── services/      # API services
│   └── public/
└── docs/                  # Documentation
```

## 🔐 Privacy & Security

- **No Data Storage**: We don't store any of your Spotify data or credentials
- **Direct API Communication**: All requests go directly to Spotify's servers
- **OAuth 2.0**: Secure authentication using Spotify's official OAuth flow
- **Minimal Permissions**: Only requests necessary permissions for migration
- **Open Source**: Full transparency - audit the code yourself

## 🌐 Deployment

The application can be deployed to various platforms:

- **Vercel** (Frontend) - Recommended for static hosting
- **Railway** (Full Stack) - Easy deployment with database support
- **Heroku** (Full Stack) - Traditional platform-as-a-service
- **Render** (Full Stack) - Modern hosting platform

See our [deployment guide](SELF-HOSTING.md#-deploy-online-gratuito) for detailed instructions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Ways to Contribute

- 🐛 **Report bugs** through [GitHub Issues](https://github.com/tomzdev/spotify-migration-tool/issues)
- 💡 **Suggest features** or improvements
- 📝 **Improve documentation**
- 🔧 **Submit pull requests** with bug fixes or new features
- 🌍 **Add translations** for internationalization

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⭐ Support the Project

If this tool helped you migrate your Spotify library, consider:

- ⭐ **Starring the repository** on GitHub
- 🐛 **Reporting issues** you encounter
- 🤝 **Contributing** improvements
- 📢 **Sharing** with friends who might need it

## 🆘 Support & FAQ

### Common Issues

**"This app is in development mode"**
- This is normal for self-hosted instances. Add users manually in the Spotify Developer Dashboard.

**Authentication errors**
- Verify your Client ID and Secret in the `.env` file
- Check that redirect URIs match exactly in your Spotify app settings

**Missing playlists or tracks**
- Some content may be restricted by region or availability
- Local files cannot be migrated (Spotify API limitation)

### Getting Help

- 📖 Check our [Self-Hosting Guide](SELF-HOSTING.md)
- 🐛 [Open an issue](https://github.com/tomzdev/spotify-migration-tool/issues) for bugs
- 💬 [Start a discussion](https://github.com/tomzdev/spotify-migration-tool/discussions) for questions

---

**Made with ❤️ for the Spotify community**

## Configurazione dell'App Spotify

Per utilizzare correttamente questo strumento, è necessario configurare **una sola app** nel [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).

### Problemi comuni di autenticazione

Se riscontri errori durante l'autenticazione, verifica i seguenti punti:

1. **Redirect URI configurato correttamente**:
   - URI di reindirizzamento: `http://localhost:5000/api/auth/source/callback` e `http://localhost:5000/api/auth/destination/callback`
   - Nota: Puoi aggiungere entrambi gli URI nella stessa app

2. **Autorizzazioni (Scopes) necessarie**:
   Assicurati che l'app abbia le seguenti autorizzazioni abilitate:
   - `user-read-private`
   - `user-read-email`
   - `playlist-read-private`
   - `playlist-read-collaborative`
   - `playlist-modify-public`
   - `playlist-modify-private`
   - `user-library-read`
   - `user-library-modify`
   - `user-follow-read`
   - `user-follow-modify`
   - `user-top-read`
   - `ugc-image-upload`

3. **Credenziali corrette nel file .env**:
   Verifica che le credenziali nel file `.env` corrispondano esattamente a quelle della tua app Spotify.

4. **Configurazione semplificata**:
   Ora è necessaria solo **una app Spotify** per gestire entrambi gli account (sorgente e destinazione).

### Procedura di configurazione

1. Accedi al [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Crea **una singola app**
3. Vai su "Edit Settings"
4. Aggiungi entrambi i Redirect URI:
   - `http://localhost:5000/api/auth/source/callback`
   - `http://localhost:5000/api/auth/destination/callback`
5. Salva le impostazioni
6. Copia Client ID e Client Secret nel file `.env`

### Configurazione .env

Crea un file `.env` nella root del progetto con le seguenti variabili:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5000/api/auth/source/callback
SESSION_SECRET=your_session_secret
```

### Vantaggi della configurazione a singola app

- **Più semplice da configurare**: Una sola app da gestire
- **Ideale per la pubblicazione**: Solo 25 utenti da aggiungere manualmente invece di 50
- **Meno configurazione**: Meno variabili d'ambiente da gestire
- **Pronta per la produzione**: Più facile ottenere l'approvazione da Spotify

### Risoluzione dei problemi

Se continui a riscontrare errori di autenticazione:

1. Controlla i log del server per messaggi di errore dettagliati
2. Verifica che l'app Spotify sia configurata come "Development Mode" (non in modalità estesa)
3. Prova a cancellare i cookie del browser e riavviare l'applicazione
4. Assicurati che il server sia in esecuzione sulla porta 5000
5. Verifica che entrambi i Redirect URI siano configurati nell'app

## Hosting e Accesso Pubblico

### 🚀 Deploy dell'Applicazione

L'app può essere facilmente deployata su servizi gratuiti:

#### Vercel (Consigliato per il frontend)
```bash
npm install -g vercel
vercel --prod
```

#### Heroku (Per il backend completo)
```bash
# Installa Heroku CLI
heroku create your-spotify-migration-app
git push heroku main
```

#### Railway (Alternativa moderna)
```bash
# Connetti il repository GitHub
# Deploy automatico su ogni push
```

### 🔐 Gestione Accesso in Development Mode

**Limitazioni Spotify Development Mode:**
- Massimo 25 utenti registrati manualmente
- Solo email pre-approvate possono accedere
- Necessaria approvazione manuale per ogni utente

**Strategie per Massimizzare l'Accessibilità:**

1. **Sistema di Richiesta Accesso** ✅ (Implementato)
   - Gli utenti possono richiedere di essere aggiunti
   - Form di richiesta integrato nell'app
   - Log delle richieste per gestione manuale

2. **Rotazione degli Utenti**
   - Rimuovi utenti inattivi per fare spazio ai nuovi
   - Comunica periodi di accesso limitato

3. **Documentazione per Self-Hosting**
   - Guida per far hostare l'app agli utenti stessi
   - Istruzioni per creare la propria app Spotify

### 📋 Come Aggiungere Utenti alla Spotify App

1. Vai su [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Seleziona la tua app
3. Vai su "User Management"
4. Aggiungi gli email degli utenti che hanno richiesto accesso
5. Gli utenti riceveranno una notifica

### 🎯 Procedura per la Pubblicazione

Quando sarai pronto per richiedere l'approval di Spotify:

1. **Completa il Quota Extension Request**
2. **Fornisci documentazione dettagliata**
3. **Implementa Privacy Policy e Terms of Service**
4. **Dimostra la sicurezza dell'app**
5. **Attendi l'approvazione (può richiedere settimane)**

## Avvio dell'applicazione

1. Installa le dipendenze:
   ```
   npm install
   ```

2. Configura il file `.env` con le tue credenziali Spotify

3. Avvia il server:
   ```
   npm start
   ```

4. Accedi all'applicazione nel browser:
   ```
   http://localhost:5000
   ```