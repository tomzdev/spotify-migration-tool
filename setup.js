#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🎵 SPOTIFY MIGRATION TOOL - SETUP AUTOMATICO
============================================

Questo script ti aiuterà a configurare la tua istanza self-hosted in pochi minuti!

NOTA IMPORTANTE: Per bypassare il limite di 25 utenti di Spotify Development Mode,
ogni utente dovrebbe hostare la propria versione dell'app. Questo setup è perfetto per quello!

`);

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  try {
    console.log('📋 STEP 1: Raccolta informazioni...\n');

    const clientId = await question('🔑 Inserisci il SPOTIFY_CLIENT_ID: ');
    const clientSecret = await question('🔐 Inserisci il SPOTIFY_CLIENT_SECRET: ');
    const port = await question('🌐 Porta del server (default 5000): ') || '5000';
    
    // Genera una session secret casuale
    const sessionSecret = require('crypto').randomBytes(32).toString('hex');
    
    const baseUrl = await question(`🔗 URL base dell'app (default http://localhost:${port}): `) || `http://localhost:${port}`;
    
    console.log('\n📝 STEP 2: Creazione file .env...');
    
    const envContent = `# Spotify Migration Tool - Configurazione
# Generato automaticamente il ${new Date().toISOString()}

SPOTIFY_CLIENT_ID=${clientId}
SPOTIFY_CLIENT_SECRET=${clientSecret}
SPOTIFY_REDIRECT_URI=${baseUrl}/api/auth/source/callback
SESSION_SECRET=${sessionSecret}
PORT=${port}
NODE_ENV=production

# Optional: Database URL (se userai MongoDB)
# DATABASE_URL=mongodb://localhost:27017/spotify-migration

# Optional: Log level
LOG_LEVEL=info
`;

    fs.writeFileSync('.env', envContent);
    console.log('✅ File .env creato con successo!');

    console.log('\n🔧 STEP 3: Installazione dipendenze...');
    
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dipendenze installate!');
    } catch (error) {
      console.log('⚠️ Errore nell\'installazione delle dipendenze. Esegui manualmente: npm install');
    }

    console.log('\n📋 STEP 4: Configurazione Spotify App...');
    console.log(`
🎯 IMPORTANTE: Vai su https://developer.spotify.com/dashboard/ e configura:

Redirect URIs da aggiungere alla tua app Spotify:
  - ${baseUrl}/api/auth/source/callback
  - ${baseUrl}/api/auth/destination/callback

Scopes necessari (già inclusi nel codice):
  ✅ user-read-private
  ✅ user-read-email  
  ✅ playlist-read-private
  ✅ playlist-modify-public
  ✅ playlist-modify-private
  ✅ user-library-read
  ✅ user-library-modify
  ✅ user-follow-read
  ✅ user-follow-modify
`);

    console.log('\n🚀 STEP 5: Avvio dell\'applicazione...');
    
    const startNow = await question('Vuoi avviare l\'app ora? (y/n): ');
    
    if (startNow.toLowerCase() === 'y' || startNow.toLowerCase() === 'yes') {
      console.log('🎉 Avvio in corso...\n');
      
      try {
        execSync('npm start', { stdio: 'inherit' });
      } catch (error) {
        console.log('\n⚠️ Per avviare manualmente: npm start');
      }
    } else {
      console.log(`
🎉 SETUP COMPLETATO!

Per avviare l'applicazione:
  npm start

Poi vai su: ${baseUrl}

📚 Documentazione completa: README.md
🆘 Supporto: https://github.com/tomzdev/spotify-migration-tool/issues

💡 SUGGERIMENTO: Condividi questa guida con altri utenti perché possano
   creare la loro istanza e bypassare i limiti di Spotify Development Mode!
`);
    }

  } catch (error) {
    console.error('❌ Errore durante il setup:', error.message);
  } finally {
    rl.close();
  }
}

setup(); 