# 🏠 Self-Hosting Guide per Spotify Migration Tool

**🚀 BYPASSARE IL LIMITE DI 25 UTENTI CON SELF-HOSTING**

Se stai cercando un modo per aggirare la limitazione di Spotify Development Mode (25 utenti max), il self-hosting è la soluzione **più efficace e immediata**!

**⚠️ CHIARIMENTO IMPORTANTE**: 
- Devi **sempre creare un'app Spotify** - questo è obbligatorio per usare le API
- Quello che bypassa il self-hosting è il **limite di utenti per app**
- Invece di 1 app condivisa (25 utenti max), ogni utente ha la sua app (illimitato)

## ✅ **Perché Self-Hosting è Meglio**

- 🚫 **Zero limitazioni** - nessun limite di utenti
- 🔒 **Massima privacy** - i tuoi dati rimangono sul tuo server
- 💰 **Gratuito** - hosting gratis su molte piattaforme
- ⚡ **Setup rapido** - 5 minuti e sei online
- 🛠️ **Personalizzabile** - modifica l'app come vuoi

Se non puoi accedere alla versione hostata ufficialmente (a causa dei limiti del Development Mode di Spotify), puoi hostare la tua versione personale dell'app!

## 🎯 Vantaggi del Self-Hosting

- **Accesso illimitato** per te e i tuoi amici
- **Controllo completo** sui tuoi dati
- **Nessuna limitazione** di 25 utenti
- **Personalizzazione** dell'app secondo le tue esigenze

## 📋 Requisiti

- **Node.js** v16 o superiore
- **Un account Spotify** (gratuito va bene)
- **Un servizio di hosting** (molti sono gratuiti)

## 🚀 Setup Rapido (5 minuti)

### **⚡ Setup con Un Solo Comando**
```bash
# Download e setup automatico
curl -L https://github.com/tomzdev/spotify-migration-tool/archive/main.zip -o spotify-migration.zip && unzip spotify-migration.zip && cd spotify-migration-tool-main && npm run setup
```

**OPPURE passo per passo:**

### 1. Clona il Repository
```bash
git clone https://github.com/your-username/spotify-migration-tool.git
cd spotify-migration-tool
npm install
```

### 2. Crea la Tua App Spotify
1. Vai su [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Clicca "Create an App"
3. Compila i campi:
   - **App name**: "My Spotify Migration Tool"
   - **App description**: "Personal tool for migrating Spotify data"
   - **Redirect URI**: `http://localhost:5000/api/auth/source/callback` e `http://localhost:5000/api/auth/destination/callback`

### 3. Configura l'Ambiente
Crea un file `.env`:
```env
SPOTIFY_CLIENT_ID=il_tuo_client_id_qui
SPOTIFY_CLIENT_SECRET=il_tuo_client_secret_qui
SPOTIFY_REDIRECT_URI=http://localhost:5000/api/auth/source/callback
SESSION_SECRET=una_chiave_segreta_casuale_molto_lunga
PORT=5000
```

### 4. Avvia l'App
```bash
npm start
```

Vai su `http://localhost:5000` e l'app funzionerà!

## 🌐 Deploy Online (Gratuito)

### Opzione A: Vercel (Solo Frontend)
```bash
npm install -g vercel
vercel --prod
```

### Opzione B: Railway (Full Stack)
1. Vai su [railway.app](https://railway.app)
2. Connetti il tuo repository GitHub
3. Aggiungi le variabili d'ambiente
4. Deploy automatico!

### Opzione C: Heroku
```bash
heroku create my-spotify-migration
git push heroku main
```

### Opzione D: Render (Consigliato)
1. Vai su [render.com](https://render.com)
2. Connetti repository GitHub
3. Aggiungi variabili d'ambiente
4. Deploy con un click!

## 🔧 Configurazione Avanzata

### Per Hosting Pubblico
Se vuoi che anche altri usino la tua istanza:

1. **Aggiorna i Redirect URI** nella tua app Spotify:
   ```
   https://your-app.vercel.app/api/auth/source/callback
   https://your-app.vercel.app/api/auth/destination/callback
   ```

2. **Aggiorna il file .env**:
   ```env
   SPOTIFY_REDIRECT_URI=https://your-app.vercel.app/api/auth/source/callback
   ```

### Sicurezza
- **Cambia sempre SESSION_SECRET** in produzione
- **Non condividere mai** CLIENT_SECRET pubblicamente
- **Usa HTTPS** in produzione

## 🛠️ Personalizzazioni

### Cambiare il Nome dell'App
Modifica `client/public/index.html`:
```html
<title>My Custom Spotify Migration Tool</title>
```

### Aggiungere Funzionalità
- Modifica i file in `routes/` per il backend
- Modifica i file in `client/src/` per il frontend

### Cambiare i Colori
Modifica `client/src/App.jsx` nel tema Material-UI.

## 🐛 Risoluzione Problemi

### "App not found" o "Invalid client"
- Verifica CLIENT_ID e CLIENT_SECRET nel file .env
- Controlla che i Redirect URI siano corretti

### "This app is in development mode"
- È normale! La tua app funzionerà per te e per massimo 25 utenti che aggiungi manualmente

### Errori di CORS
- Aggiungi il tuo dominio ai Redirect URI nell'app Spotify

## 📞 Supporto

Se hai problemi:
1. Controlla i log della console
2. Verifica che tutte le variabili d'ambiente siano impostate
3. Assicurati che Node.js sia aggiornato

## 🎉 Pronto!

Una volta completato il setup, avrai la tua versione personale del Spotify Migration Tool che potrai usare senza limitazioni!

---

**Nota**: Questo è completamente legale e segue le best practice di Spotify. Stai usando le API ufficiali e i tuoi dati rimangono privati. 