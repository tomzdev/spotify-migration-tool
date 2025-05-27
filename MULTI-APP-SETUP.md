# 🚀 Multi-App Setup: Bypassare il Limite di 25 Utenti

Questa guida ti mostra come configurare **multiple app Spotify** per supportare più di 25 utenti su un singolo sito pubblico.

## 🎯 **Panoramica della Strategia**

Invece di essere limitato a 25 utenti con una sola app, puoi:
- **3 app = 75 utenti**
- **4 app = 100 utenti**  
- **5 app = 125 utenti**
- **6 app = 150 utenti**

Il sistema assegna automaticamente gli utenti all'app con più spazio disponibile.

## 📋 **Requisiti**

- Multiple Spotify Developer Apps (una per ogni 25 utenti)
- Stesso codice dell'applicazione (solo credenziali diverse)
- Sistema di gestione utenti automatico

## 🛠️ **Setup Passo per Passo**

### **Step 1: Crea Multiple App Spotify**

1. Vai su [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Crea **3-6 app** con questi nomi:
   - `My Migration Tool - App 1`
   - `My Migration Tool - App 2` 
   - `My Migration Tool - App 3`
   - etc.

3. **Per OGNI app**, configura:
   - **Redirect URIs**: 
     - `https://yourdomain.com/api/auth/source/callback`
     - `https://yourdomain.com/api/auth/destination/callback`
   - **Scopes**: Tutti quelli necessari (vedi README.md)

### **Step 2: Configura l'Ambiente**

Copia il file `env.multiple-apps.example` come `.env`:

```bash
cp env.multiple-apps.example .env
```

Compila con le credenziali di ogni app:

```env
# App 1
SPOTIFY_CLIENT_ID_1=abc123...
SPOTIFY_CLIENT_SECRET_1=def456...

# App 2  
SPOTIFY_CLIENT_ID_2=ghi789...
SPOTIFY_CLIENT_SECRET_2=jkl012...

# App 3
SPOTIFY_CLIENT_ID_3=mno345...
SPOTIFY_CLIENT_SECRET_3=pqr678...
```

### **Step 3: Integra il Multi-App Manager**

Aggiungi al tuo `server.js`:

```javascript
const { MultiAppManager } = require('./multi-app-config');
const multiAppManager = new MultiAppManager();

// Middleware per assegnare app agli utenti
app.use('/api/auth', (req, res, next) => {
  if (req.query.email || req.session.userEmail) {
    const userEmail = req.query.email || req.session.userEmail;
    const credentials = multiAppManager.getCredentialsForUser(userEmail);
    
    // Imposta credenziali dinamiche per questo utente
    req.spotifyCredentials = credentials;
  }
  next();
});
```

### **Step 4: Aggiorna le Route di Autenticazione**

Modifica `routes/auth.js`:

```javascript
// Usa credenziali dinamiche invece di quelle statiche
router.get('/source/login', (req, res) => {
  const userEmail = req.query.email || req.session.userEmail;
  
  if (!userEmail) {
    return res.redirect('/error?message=Email required for authentication');
  }
  
  const credentials = req.app.locals.multiAppManager.getCredentialsForUser(userEmail);
  
  const spotifyApi = new SpotifyWebApi({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    redirectUri: credentials.redirectUri
  });
  
  const authURL = spotifyApi.createAuthorizeURL(SPOTIFY_SCOPES, userEmail);
  res.redirect(authURL);
});
```

### **Step 5: Dashboard di Monitoraggio**

Aggiungi una route per monitorare l'utilizzo:

```javascript
router.get('/admin/stats', (req, res) => {
  const stats = multiAppManager.getUsageStats();
  res.json(stats);
});
```

Output esempio:
```json
{
  "totalUsers": 67,
  "totalCapacity": 75,
  "utilizationRate": "89.3%",
  "appsStatus": [
    {
      "id": "app1",
      "users": 25,
      "capacity": 25,
      "utilization": "100%"
    },
    {
      "id": "app2", 
      "users": 25,
      "capacity": 25,
      "utilization": "100%"
    },
    {
      "id": "app3",
      "users": 17,
      "capacity": 25,
      "utilization": "68%"
    }
  ]
}
```

## 👥 **Gestione Utenti**

### **Aggiunta Automatica**
Il sistema assegna automaticamente nuovi utenti all'app con più spazio.

### **Aggiunta Manuale alle App Spotify**
Devi ancora aggiungere manualmente gli utenti in ogni Spotify App:

1. **App 1**: Aggiungi utenti 1-25
2. **App 2**: Aggiungi utenti 26-50  
3. **App 3**: Aggiungi utenti 51-75
4. etc.

### **Sistema di Rotazione**
Se un'app raggiunge il limite, il sistema:
1. Assegna nuovi utenti ad altre app
2. Può spostare utenti inattivi per ottimizzare

## 🔧 **Configurazione Avanzata**

### **Bilanciamento del Carico**
```javascript
// Riequilibra utenti tra app
multiAppManager.rebalanceUsers();
```

### **Monitoraggio in Tempo Reale**
```javascript
// WebSocket per aggiornamenti live dell'utilizzo
socket.emit('app-usage', multiAppManager.getUsageStats());
```

### **Failover Automatico**
Se un'app ha problemi, il sistema reindirizza automaticamente gli utenti verso app funzionanti.

## 📊 **Vantaggi di Questo Approccio**

✅ **Scalabilità**: 25 → 150+ utenti  
✅ **Gestione Automatica**: Sistema intelligente di assegnazione  
✅ **Monitoring**: Dashboard per monitorare utilizzo  
✅ **Resilienza**: Failover automatico tra app  
✅ **Trasparente**: Gli utenti non vedono la complessità  

## ⚠️ **Limitazioni**

❌ **Gestione Manuale**: Devi ancora aggiungere utenti manualmente in ogni app Spotify  
❌ **Complessità**: Setup più complesso rispetto a singola app  
❌ **Manutenzione**: Più app da gestire nel Developer Dashboard  

## 🚀 **Deploy**

Il sistema funziona su qualsiasi piattaforma di hosting:
- **Vercel** (con database serverless)
- **Railway** (con PostgreSQL)
- **Heroku** (con PostgreSQL addon)
- **VPS** (con MongoDB/PostgreSQL)

## 📞 **Supporto**

Se hai problemi con il setup multi-app:
1. Verifica che tutte le credenziali siano corrette
2. Controlla che i redirect URI siano identici in tutte le app
3. Monitora i log per errori di autenticazione
4. Usa la dashboard `/admin/stats` per diagnostica

---

Con questo setup, puoi supportare **centinaia di utenti** mantenendo un singolo sito pubblico! 🎉 