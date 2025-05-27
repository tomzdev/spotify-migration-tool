// Multi-App Configuration for Bypassing Spotify's 25-User Limit
// This allows a single public site to support more users by rotating between multiple Spotify apps

const SPOTIFY_APPS = [
  {
    id: 'app1',
    clientId: process.env.SPOTIFY_CLIENT_ID_1,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET_1,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI_1,
    maxUsers: 25,
    currentUsers: 0,
    active: true
  },
  {
    id: 'app2', 
    clientId: process.env.SPOTIFY_CLIENT_ID_2,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET_2,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI_2,
    maxUsers: 25,
    currentUsers: 0,
    active: true
  },
  {
    id: 'app3',
    clientId: process.env.SPOTIFY_CLIENT_ID_3,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET_3,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI_3,
    maxUsers: 25,
    currentUsers: 0,
    active: true
  }
  // Aggiungi più app secondo necessità
];

class MultiAppManager {
  constructor() {
    this.apps = SPOTIFY_APPS.filter(app => app.clientId && app.clientSecret);
    this.userAppMapping = new Map(); // email -> appId
    this.loadUserMappings();
  }

  // Trova la migliore app disponibile per un nuovo utente
  getAvailableApp() {
    // Cerca app con spazio disponibile
    const availableApp = this.apps.find(app => 
      app.active && app.currentUsers < app.maxUsers
    );
    
    if (availableApp) {
      return availableApp;
    }
    
    // Se nessuna app ha spazio, usa la meno piena
    return this.apps
      .filter(app => app.active)
      .sort((a, b) => a.currentUsers - b.currentUsers)[0];
  }

  // Assegna un utente a un'app specifica
  assignUserToApp(userEmail, appId = null) {
    let targetApp;
    
    if (appId) {
      targetApp = this.apps.find(app => app.id === appId);
    } else {
      targetApp = this.getAvailableApp();
    }
    
    if (!targetApp) {
      throw new Error('Nessuna app Spotify disponibile');
    }
    
    // Rimuovi da app precedente se esistente
    const previousApp = this.getUserApp(userEmail);
    if (previousApp && previousApp.id !== targetApp.id) {
      previousApp.currentUsers = Math.max(0, previousApp.currentUsers - 1);
    }
    
    // Aggiungi alla nuova app
    this.userAppMapping.set(userEmail, targetApp.id);
    targetApp.currentUsers++;
    
    this.saveUserMappings();
    return targetApp;
  }

  // Ottieni l'app assegnata a un utente
  getUserApp(userEmail) {
    const appId = this.userAppMapping.get(userEmail);
    return this.apps.find(app => app.id === appId) || this.getAvailableApp();
  }

  // Ottieni le credenziali per un utente specifico
  getCredentialsForUser(userEmail) {
    const app = this.getUserApp(userEmail);
    return {
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      redirectUri: app.redirectUri,
      appId: app.id
    };
  }

  // Statistiche di utilizzo
  getUsageStats() {
    const totalCapacity = this.apps.reduce((sum, app) => sum + app.maxUsers, 0);
    const totalUsers = this.apps.reduce((sum, app) => sum + app.currentUsers, 0);
    
    return {
      totalUsers,
      totalCapacity,
      utilizationRate: (totalUsers / totalCapacity * 100).toFixed(1),
      appsStatus: this.apps.map(app => ({
        id: app.id,
        users: app.currentUsers,
        capacity: app.maxUsers,
        utilization: (app.currentUsers / app.maxUsers * 100).toFixed(1) + '%'
      }))
    };
  }

  // Rotazione intelligente degli utenti
  rebalanceUsers() {
    // Trova app sovraccariche
    const overloadedApps = this.apps.filter(app => app.currentUsers > app.maxUsers);
    const underutilizedApps = this.apps.filter(app => app.currentUsers < app.maxUsers);
    
    overloadedApps.forEach(app => {
      const excessUsers = app.currentUsers - app.maxUsers;
      // Logica per spostare utenti meno attivi verso altre app
      console.log(`App ${app.id} ha ${excessUsers} utenti in eccesso`);
    });
  }

  // Carica mapping utenti da storage persistente
  loadUserMappings() {
    try {
      const fs = require('fs');
      if (fs.existsSync('user-app-mappings.json')) {
        const data = JSON.parse(fs.readFileSync('user-app-mappings.json', 'utf8'));
        this.userAppMapping = new Map(data.mappings || []);
        
        // Aggiorna contatori
        data.appCounters?.forEach(counter => {
          const app = this.apps.find(a => a.id === counter.appId);
          if (app) app.currentUsers = counter.users;
        });
      }
    } catch (error) {
      console.error('Errore nel caricamento user mappings:', error);
    }
  }

  // Salva mapping utenti su storage persistente
  saveUserMappings() {
    try {
      const fs = require('fs');
      const data = {
        mappings: Array.from(this.userAppMapping.entries()),
        appCounters: this.apps.map(app => ({
          appId: app.id,
          users: app.currentUsers
        })),
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync('user-app-mappings.json', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Errore nel salvataggio user mappings:', error);
    }
  }

  // Rimuovi utente inattivo
  removeUser(userEmail) {
    const app = this.getUserApp(userEmail);
    if (app) {
      app.currentUsers = Math.max(0, app.currentUsers - 1);
      this.userAppMapping.delete(userEmail);
      this.saveUserMappings();
    }
  }
}

module.exports = { MultiAppManager, SPOTIFY_APPS }; 