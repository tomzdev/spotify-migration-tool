const express = require('express');
const router = express.Router();
const auth = require('./auth');
const sourceSpotifyApi = auth.sourceSpotifyApi;
const destSpotifyApi = auth.destSpotifyApi;
const refreshSourceToken = auth.refreshSourceToken;
const refreshDestToken = auth.refreshDestToken;
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

// Middleware to ensure both accounts are authenticated
const ensureAuthenticated = (req, res, next) => {
  if (!req.session.sourceUser || !req.session.destUser) {
    return res.status(401).json({ error: 'Both accounts must be authenticated' });
  }
  next();
};

// Funzione per verificare se una playlist esiste già nell'account di destinazione
const checkPlaylistExists = async (playlistName, req) => {
  try {
    // Assicurati che il token sia aggiornato prima di ogni operazione
    if (req && req.session.destTokens) {
      destSpotifyApi.setAccessToken(req.session.destTokens.accessToken);
    }
    
    // Ottieni tutte le playlist dell'utente di destinazione
    let playlists = [];
    let offset = 0;
    const limit = 50;
    let total = 1;
    
    while (offset < total) {
      const response = await destSpotifyApi.getUserPlaylists(req.session.destUser.id, { limit, offset });
      total = response.body.total;
      playlists = playlists.concat(response.body.items);
      offset += limit;
      
      if (playlists.length >= total || offset >= 200) {
        break;
      }
    }
    
    // Cerca una playlist con lo stesso nome
    const existingPlaylist = playlists.find(playlist => 
      playlist.name.toLowerCase() === playlistName.toLowerCase());
    
    return existingPlaylist || null;
  } catch (error) {
    console.error(`Error checking if playlist exists: ${error.message}`);
    return null;
  }
};

// Funzione per verificare se un artista è già seguito nell'account di destinazione
const checkArtistFollowed = async (artistId, req) => {
  try {
    // Assicurati che il token sia aggiornato prima di ogni operazione
    if (req && req.session.destTokens) {
      destSpotifyApi.setAccessToken(req.session.destTokens.accessToken);
    }
    
    // Verifica se l'artista è già seguito
    const response = await destSpotifyApi.isFollowingArtists([artistId]);
    return response.body[0];
  } catch (error) {
    console.error(`Error checking if artist is followed: ${error.message}`);
    return false;
  }
};

// Funzione per verificare se un brano è già salvato nell'account di destinazione
const checkTrackSaved = async (trackId, req) => {
  try {
    // Assicurati che il token sia aggiornato prima di ogni operazione
    if (req && req.session.destTokens) {
      destSpotifyApi.setAccessToken(req.session.destTokens.accessToken);
    }
    
    // Verifica se il brano è già salvato
    const response = await destSpotifyApi.containsMySavedTracks([trackId]);
    return response.body[0];
  } catch (error) {
    console.error(`Error checking if track is saved: ${error.message}`);
    return false;
  }
};

// Get source account playlists
router.get('/playlists', [refreshSourceToken, ensureAuthenticated], async (req, res) => {
  try {
    const data = await sourceSpotifyApi.getUserPlaylists(req.session.sourceUser.id, { limit: 50 });
    res.json({ playlists: data.body.items });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get source account saved tracks (liked songs)
router.get('/saved-tracks', [refreshSourceToken, ensureAuthenticated], async (req, res) => {
  try {
    // Get all saved tracks from source account with pagination
    let tracks = [];
    let offset = 0;
    const limit = 50;
    let total = 1; // Initial value to enter the loop
    
    while (offset < total) {
      const tracksResponse = await sourceSpotifyApi.getMySavedTracks({
        offset,
        limit
      });
      
      total = tracksResponse.body.total;
      tracks = tracks.concat(tracksResponse.body.items);
      offset += limit;
      
      // Break if we've fetched all tracks or reached a reasonable limit
      if (tracks.length >= total || offset >= 2000) {
        break;
      }
    }
    
    res.json({ tracks: tracks });
  } catch (error) {
    console.error('Error fetching saved tracks:', error);
    res.status(500).json({ error: 'Failed to fetch saved tracks' });
  }
});

// Get source account followed artists
router.get('/followed-artists', [refreshSourceToken, ensureAuthenticated], async (req, res) => {
  try {
    // Get all followed artists from source account with pagination
    let artists = [];
    let after = null;
    const limit = 50;
    
    do {
      const artistsResponse = await sourceSpotifyApi.getFollowedArtists({
        limit,
        after
      });
      
      const newArtists = artistsResponse.body.artists.items;
      artists = artists.concat(newArtists);
      
      // Update the after parameter for pagination
      after = newArtists.length > 0 ? newArtists[newArtists.length - 1].id : null;
      
      // Break if we got fewer artists than the limit (last page)
      if (newArtists.length < limit) {
        break;
      }
    } while (after);
    
    res.json({ artists: artists });
  } catch (error) {
    console.error('Error fetching followed artists:', error);
    res.status(500).json({ error: 'Failed to fetch followed artists' });
  }
});

// Rimossa la route per gli utenti seguiti come richiesto

// Rimossa la route per la migrazione degli utenti seguiti come richiesto

// Funzione per trasferire l'immagine di una playlist
const transferPlaylistImage = async (sourcePlaylistId, destPlaylistId, req) => {
  try {
    // Assicurati che i token siano aggiornati prima di ogni operazione
    if (req && req.session.sourceTokens) {
      sourceSpotifyApi.setAccessToken(req.session.sourceTokens.accessToken);
    }
    if (req && req.session.destTokens) {
      destSpotifyApi.setAccessToken(req.session.destTokens.accessToken);
    }
    
    // Ottieni i dettagli della playlist di origine
    const sourcePlaylist = await sourceSpotifyApi.getPlaylist(sourcePlaylistId);
    
    // Controlla se la playlist ha un'immagine
    if (!sourcePlaylist.body.images || sourcePlaylist.body.images.length === 0) {
      return false;
    }
    
    // Ottieni l'URL dell'immagine della playlist
    const imageUrl = sourcePlaylist.body.images[0].url;
    
    // Crea una directory temporanea se non esiste
    const tempDir = path.join(__dirname, '../temp');
    try {
      await mkdirAsync(tempDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Scarica l'immagine
    const imagePath = path.join(tempDir, `playlist_${sourcePlaylistId}.jpg`);
    const imageResponse = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer'
    });
    
    // Salva l'immagine localmente
    await writeFileAsync(imagePath, imageResponse.data);
    
    // Leggi l'immagine come base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Carica l'immagine nella playlist di destinazione
    await destSpotifyApi.uploadCustomPlaylistCoverImage(destPlaylistId, base64Image);
    
    // Elimina il file temporaneo
    await unlinkAsync(imagePath);
    
    return true;
  } catch (error) {
    console.error(`Error transferring image for playlist: ${error.message}`);
    return false;
  }
};

// Funzione per ottenere tutte le tracce di una playlist
const getAllPlaylistTracks = async (playlistId, req) => {
  let tracks = [];
  let offset = 0;
  const limit = 100; // Massimo possibile per chiamata
  let total = 1;
  let skippedLocalTracks = [];
  
  try {
    // Assicurati che il token sia aggiornato prima di ogni operazione
    if (req && req.session.sourceTokens) {
      sourceSpotifyApi.setAccessToken(req.session.sourceTokens.accessToken);
    }
    
    while (offset < total) {
      // Usa getPlaylistTracks con fields per limitare i dati restituiti e risparmiare banda
      const tracksResponse = await sourceSpotifyApi.getPlaylistTracks(playlistId, {
        offset,
        limit,
        fields: 'items(track(uri,id,name)),total'
      });
      
      total = tracksResponse.body.total;
      
      // Filtra le tracce valide (non nulle) e rimuovi le tracce locali
      const validTracks = [];
      
      tracksResponse.body.items.forEach(item => {
        if (item.track && item.track.uri) {
          // Verifica se è una traccia locale (inizia con "spotify:local:")
          if (item.track.uri.startsWith('spotify:local:')) {
            // Salva informazioni sulla traccia locale saltata per il log
            skippedLocalTracks.push({
              uri: item.track.uri,
              name: item.track.name || 'Traccia locale senza nome'
            });
          } else {
            validTracks.push(item.track);
          }
        }
      });
      
      tracks = tracks.concat(validTracks);
      offset += limit;
      
      // Pausa più lunga tra le richieste per evitare rate limiting
      if (offset < total) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Rimuovi eventuali duplicati (può succedere nelle playlist)
    const uniqueTracks = [];
    const seenUris = new Set();
    
    for (const track of tracks) {
      if (!seenUris.has(track.uri)) {
        seenUris.add(track.uri);
        uniqueTracks.push(track);
      }
    }
    
    // Ritorna sia le tracce valide che le informazioni sulle tracce locali saltate
    return {
      tracks: uniqueTracks,
      skippedLocalTracks: skippedLocalTracks
    };
  } catch (error) {
    console.error(`Error retrieving tracks for playlist ${playlistId}:`, error);
    throw error;
  }
};

// Funzione per aggiungere tracce a una playlist in batch
const addTracksToPlaylist = async (playlistId, tracks, playlistName, req) => {
  const batchSize = 50; // Ridotto per maggiore stabilità
  const trackUris = tracks.map(track => track.uri);
  let addedCount = 0;
  let skippedTracks = [];
  
  try {
    // Assicurati che il token sia aggiornato prima di ogni operazione
    if (req && req.session.destTokens) {
      destSpotifyApi.setAccessToken(req.session.destTokens.accessToken);
    }
    // Aggiungi le tracce in batch
    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);
      let retryCount = 0;
      const maxRetries = 5; // Aumentato il numero di tentativi
      let success = false;
      
      while (!success && retryCount < maxRetries) {
        try {
          await destSpotifyApi.addTracksToPlaylist(playlistId, batch);
          success = true;
          addedCount += batch.length;
        } catch (error) {
          retryCount++;
          console.error(`Error adding batch ${i/batchSize + 1}/${Math.ceil(trackUris.length/batchSize)} to playlist ${playlistName} (attempt ${retryCount}/${maxRetries}):`, error.message);
          
          // Verifica se l'errore è relativo a un ID base62 non valido (tracce locali)
          if (error.message && error.message.includes('Invalid base62 id')) {
            console.log(`Il batch contiene probabilmente tracce locali non migrabili. Provo ad aggiungere i brani singolarmente.`);
            break; // Esci dal ciclo while e prova con approccio singolo brano
          }
          
          if (retryCount >= maxRetries) {
            // Se falliscono tutti i tentativi con il batch, prova ad aggiungere i brani uno alla volta
            console.log(`Trying to add tracks one by one for batch ${i/batchSize + 1}`);
            break; // Esci dal ciclo while e prova con approccio singolo brano
          } else {
            // Attesa esponenziale con jitter
            const baseWait = 2000; // 2 secondi di base
            const jitter = Math.random() * 1000; // Random jitter fino a 1 secondo
            const waitTime = (baseWait * Math.pow(2, retryCount - 1)) + jitter;
            console.log(`Waiting ${Math.round(waitTime)}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // Se non siamo riusciti ad aggiungere il batch intero, prova ad aggiungere i brani uno alla volta
      if (!success) {
        for (const trackUri of batch) {
          try {
            // Verifica se è una traccia locale prima di tentare di aggiungerla
            if (trackUri.startsWith('spotify:local:')) {
              console.log(`Salto traccia locale: ${trackUri}`);
              skippedTracks.push(trackUri);
              continue;
            }
            
            await destSpotifyApi.addTracksToPlaylist(playlistId, [trackUri]);
            addedCount++;
            // Pausa più breve tra i singoli brani
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (singleError) {
            console.error(`Failed to add track ${trackUri} to playlist:`, singleError.message);
            if (singleError.message && singleError.message.includes('Invalid base62 id')) {
              skippedTracks.push(trackUri);
            }
          }
        }
      }
      
      // Pausa più breve tra batch per bilanciare velocità e rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return {
      addedCount,
      skippedTracks
    };
  } catch (error) {
    console.error(`Error in addTracksToPlaylist for playlist ${playlistName}:`, error);
    throw error;
  }
};

// Funzione per elaborare una singola playlist
const processPlaylist = async (playlistId, index, total, res, migrationLog, errors, followNonUserPlaylists, transferImages, req) => {
  try {
    // Aggiorna i token prima di ogni operazione
    if (req.session.sourceTokens) {
      sourceSpotifyApi.setAccessToken(req.session.sourceTokens.accessToken);
    }
    if (req.session.destTokens) {
      destSpotifyApi.setAccessToken(req.session.destTokens.accessToken);
    }
    
    // Ottieni dettagli della playlist sorgente
    let sourcePlaylist;
    try {
      sourcePlaylist = await sourceSpotifyApi.getPlaylist(playlistId);
    } catch (error) {
      console.error(`Error fetching playlist ${playlistId}:`, error.message);
      return {
        success: false,
        playlistId,
        error: `Failed to fetch playlist details: ${error.message}`
      };
    }
    
    const playlistData = sourcePlaylist.body;
    const playlistName = playlistData.name || `Playlist ${playlistId}`;
    
    // Verifica se la playlist è stata creata dall'utente
    const isUserPlaylist = playlistData.owner.id === req.session.sourceUser.id;
    
    // Gestisci le playlist non create dall'utente
    if (!isUserPlaylist) {
      if (followNonUserPlaylists) {
        migrationLog.push(`Seguendo playlist esistente: ${playlistName} (creata da ${playlistData.owner.display_name})`);
        
        try {
          await destSpotifyApi.followPlaylist(playlistId, { public: playlistData.public });
          migrationLog.push(`Successfully followed playlist: ${playlistName}`);
          return {
            success: true,
            playlistId,
            message: `Followed playlist: ${playlistName}`
          };
        } catch (followError) {
          console.error(`Error following playlist ${playlistName}:`, followError.message);
          return {
            success: false,
            playlistId,
            error: `Failed to follow playlist: ${followError.message}`
          };
        }
      } else {
        migrationLog.push(`Skipped playlist '${playlistName}' (not created by user)`);
        return {
          success: true,
          playlistId,
          skipped: true,
          message: `Skipped playlist: ${playlistName}`
        };
      }
    }
    
    // Verifica se la playlist esiste già nell'account di destinazione
    const existingPlaylist = await checkPlaylistExists(playlistName, req);
    if (existingPlaylist) {
      migrationLog.push(`Playlist '${playlistName}' già esistente nell'account di destinazione. Migrazione saltata.`);
      return {
        success: true,
        playlistId,
        existingPlaylistId: existingPlaylist.id,
        skipped: true,
        message: `Skipped duplicate playlist: ${playlistName}`
      };
    }
    
    // Se la playlist è stata creata dall'utente e non esiste già, la ricreiamo
    migrationLog.push(`Creazione nuova playlist: ${playlistName}`);
    
    // Check if the playlist is private
    const wasPrivate = !playlistData.public;
    
    // Step 1: Make the playlist public if it was private
    if (wasPrivate) {
      try {
        await sourceSpotifyApi.changePlaylistDetails(playlistId, { public: true });
        migrationLog.push(`Made playlist '${playlistName}' public temporarily.`);
      } catch (error) {
        console.error(`Error making playlist ${playlistName} public:`, error.message);
      }
    }
    
    // Step 2: Clone the playlist in the destination account
    let newPlaylist;
    try {
      newPlaylist = await destSpotifyApi.createPlaylist(req.session.destUser.id, {
        name: playlistData.name,
        public: playlistData.public,
        collaborative: playlistData.collaborative,
        description: playlistData.description || ''
      });
    } catch (createError) {
      console.error(`Error creating new playlist for ${playlistName}:`, createError.message);
      
      if (wasPrivate) {
        try {
          await sourceSpotifyApi.changePlaylistDetails(playlistId, { public: false });
          migrationLog.push(`Reverted playlist '${playlistName}' to private.`);
        } catch (error) {
          console.error(`Error reverting playlist ${playlistName} to private:`, error.message);
        }
      }
      
      return {
        success: false,
        playlistId,
        error: `Failed to create new playlist: ${createError.message}`
      };
    }
    
    // Step 3: Get all tracks from source playlist
    let tracks = [];
    let skippedLocalTracks = [];
    try {
      const result = await getAllPlaylistTracks(playlistId, req);
      tracks = result.tracks;
      skippedLocalTracks = result.skippedLocalTracks;
      
      migrationLog.push(`Fetched ${tracks.length} tracks from playlist '${playlistName}'.`);
      
      if (skippedLocalTracks.length > 0) {
        migrationLog.push(`Saltate ${skippedLocalTracks.length} tracce locali non migrabili dalla playlist '${playlistName}'.`);
        // Registra i dettagli delle tracce locali saltate per riferimento
        for (const localTrack of skippedLocalTracks) {
          migrationLog.push(`  - Traccia locale saltata: ${localTrack.name}`);
        }
      }
    } catch (tracksError) {
      console.error(`Error fetching tracks for playlist ${playlistName}:`, tracksError.message);
      tracks = [];
      migrationLog.push(`Warning: Failed to fetch tracks for playlist '${playlistName}': ${tracksError.message}`);
    }
    
    // Step 4: Add tracks to the new playlist
    let addedTracksCount = 0;
    let skippedTracks = [];
    if (tracks.length > 0) {
      try {
        const result = await addTracksToPlaylist(newPlaylist.body.id, tracks, playlistName, req);
        addedTracksCount = result.addedCount;
        skippedTracks = result.skippedTracks;
        
        migrationLog.push(`Added ${addedTracksCount} of ${tracks.length} tracks to playlist '${playlistName}'.`);
        
        if (skippedTracks.length > 0) {
          migrationLog.push(`Non è stato possibile aggiungere ${skippedTracks.length} tracce alla playlist '${playlistName}' (probabilmente tracce locali).`);
        }
      } catch (addTracksError) {
        console.error(`Error adding tracks to playlist ${playlistName}:`, addTracksError.message);
        migrationLog.push(`Warning: Failed to add all tracks to playlist '${playlistName}': ${addTracksError.message}`);
      }
    }
    
    // Step 5: Transfer playlist image if requested
    let imageTransferred = false;
    if (transferImages && isUserPlaylist) {
      migrationLog.push(`Tentativo di trasferimento dell'immagine per la playlist '${playlistName}'...`);
      try {
        imageTransferred = await transferPlaylistImage(playlistId, newPlaylist.body.id, req);
        if (imageTransferred) {
          migrationLog.push(`Immagine trasferita con successo per la playlist '${playlistName}'`);
        }
      } catch (imageError) {
        console.error(`Error transferring image for playlist ${playlistName}:`, imageError.message);
        errors.push(`Failed to transfer image for playlist '${playlistName}': ${imageError.message}`);
      }
    }
    
    // Step 6: Revert the playlist to private if it was private originally
    if (wasPrivate) {
      try {
        await sourceSpotifyApi.changePlaylistDetails(playlistId, { public: false });
        migrationLog.push(`Reverted playlist '${playlistName}' to private.`);
      } catch (revertError) {
        console.error(`Error reverting playlist ${playlistName} to private:`, revertError.message);
        errors.push(`Failed to revert playlist '${playlistName}' to private: ${revertError.message}`);
      }
    }
    
    // Verifica se la migrazione è stata parzialmente completata
    const totalTracksToMigrate = tracks.length;
    const partialSuccess = addedTracksCount > 0 && addedTracksCount < totalTracksToMigrate;
    
    if (partialSuccess) {
      migrationLog.push(`Partially cloned playlist '${playlistName}' with ${addedTracksCount}/${totalTracksToMigrate} tracks.`);
    } else if (addedTracksCount === totalTracksToMigrate) {
      migrationLog.push(`Cloned playlist '${playlistName}' successfully with ${totalTracksToMigrate} tracks.`);
    } else {
      migrationLog.push(`Created empty playlist '${playlistName}' but failed to add any tracks.`);
    }
    
    const totalLocalTracks = skippedLocalTracks.length + (skippedTracks ? skippedTracks.length : 0);
    
    return {
      success: true,
      playlistId,
      newPlaylistId: newPlaylist.body.id,
      trackCount: totalTracksToMigrate,
      addedTracks: addedTracksCount,
      localTracksSkipped: totalLocalTracks,
      imageTransferred,
      partialSuccess,
      message: partialSuccess ? 
        `Partially cloned playlist: ${playlistName} (${addedTracksCount}/${totalTracksToMigrate} tracks)` : 
        `Successfully cloned playlist: ${playlistName}`
    };
  } catch (error) {
    console.error(`Error processing playlist ${playlistId}:`, error);
    errors.push(`Failed to migrate playlist ID ${playlistId}: ${error.message}`);
    return {
      success: false,
      playlistId,
      error: error.message
    };
  }
};

// Migrate saved tracks
router.post('/migrate/saved-tracks', [refreshSourceToken, refreshDestToken, ensureAuthenticated], async (req, res) => {
  const { savedTrackIds } = req.body;
  const migrationLog = [];
  const errors = [];
  
  try {
    if (!savedTrackIds || !Array.isArray(savedTrackIds) || savedTrackIds.length === 0) {
      return res.json({
        success: false,
        error: 'Nessun brano selezionato da migrare',
        migrationLog: ['Nessun brano selezionato da migrare'],
        errors: ['Nessun brano selezionato da migrare']
      });
    }
    
    // Assicurati che i token siano impostati correttamente
    console.log('Migrazione brani preferiti: impostazione token');
    // Usa i token dalla sessione tokens invece che da sourceUser/destUser
    if (req.session.sourceTokens && req.session.sourceTokens.accessToken) {
      sourceSpotifyApi.setAccessToken(req.session.sourceTokens.accessToken);
    } else {
      sourceSpotifyApi.setAccessToken(req.session.sourceUser.accessToken);
    }
    
    if (req.session.destTokens && req.session.destTokens.accessToken) {
      destSpotifyApi.setAccessToken(req.session.destTokens.accessToken);
    } else {
      destSpotifyApi.setAccessToken(req.session.destUser.accessToken);
    }
    
    migrationLog.push(`Inizio migrazione di ${savedTrackIds.length} brani preferiti...`);
    
    // Verifica quali brani sono già salvati nell'account di destinazione
    const batchCheckSize = 50;
    let alreadySavedTracks = [];
    
    for (let i = 0; i < savedTrackIds.length; i += batchCheckSize) {
      const batchToCheck = savedTrackIds.slice(i, i + batchCheckSize);
      try {
        const checkResult = await destSpotifyApi.containsMySavedTracks(batchToCheck);
        
        // Aggiungi gli ID dei brani già salvati all'array
        batchToCheck.forEach((trackId, index) => {
          if (checkResult.body[index]) {
            alreadySavedTracks.push(trackId);
          }
        });
      } catch (error) {
        console.error(`Error checking saved tracks:`, error);
        // In caso di errore, continua con la migrazione normale
      }
      
      // Pausa breve per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (alreadySavedTracks.length > 0) {
      migrationLog.push(`Trovati ${alreadySavedTracks.length} brani già salvati nell'account di destinazione. Questi brani verranno saltati.`);
    }
    
    // Filtra i brani da migrare, escludendo quelli già salvati
    const tracksToMigrate = savedTrackIds.filter(trackId => !alreadySavedTracks.includes(trackId));
    
    if (tracksToMigrate.length === 0) {
      migrationLog.push(`Tutti i brani selezionati sono già presenti nell'account di destinazione. Nessun brano da migrare.`);
      return res.json({
        success: true,
        migrationLog,
        errors
      });
    }
    
    migrationLog.push(`Migrazione di ${tracksToMigrate.length} brani non ancora salvati...`);
    
    // Aggiungi i brani in batch
    const batchSize = 50;
    let migratedCount = 0;
    
    for (let i = 0; i < tracksToMigrate.length; i += batchSize) {
      const batch = tracksToMigrate.slice(i, i + batchSize);
      
      try {
        console.log(`Aggiunta batch ${i/batchSize + 1} di brani preferiti (${batch.length} brani)`);
        await destSpotifyApi.addToMySavedTracks(batch);
        migratedCount += batch.length;
        migrationLog.push(`Aggiunti ${batch.length} brani ai preferiti (${migratedCount}/${tracksToMigrate.length})`);
      } catch (error) {
        console.error(`Error adding batch of tracks to saved tracks:`, error);
        
        // Gestione dettagliata degli errori
        if (error.statusCode === 401) {
          console.log('Errore di autenticazione 401, aggiornamento token');
          await new Promise((resolve) => {
            refreshDestToken(req, res, () => {
              destSpotifyApi.setAccessToken(req.session.destUser.accessToken);
              resolve();
            });
          });
          
          // Prova di nuovo con il token aggiornato
          try {
            await destSpotifyApi.addToMySavedTracks(batch);
            migratedCount += batch.length;
            migrationLog.push(`Aggiunti ${batch.length} brani ai preferiti dopo aggiornamento token (${migratedCount}/${tracksToMigrate.length})`);
          } catch (retryError) {
            errors.push(`Errore nell'aggiunta di brani ai preferiti anche dopo aggiornamento token: ${retryError.message}`);
          }
        } else if (error.statusCode === 429) {
          // Rate limiting - attendi più a lungo
          const retryAfter = error.headers['retry-after'] ? parseInt(error.headers['retry-after']) * 1000 : 5000;
          migrationLog.push(`Rate limit raggiunto, attendo ${retryAfter/1000} secondi prima di riprovare...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          // Decremento i per riprovare lo stesso batch
          i -= batchSize;
          continue;
        } else {
          errors.push(`Errore nell'aggiunta di alcuni brani ai preferiti: ${error.message}`);
        }
      }
      
      // Pausa per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    migrationLog.push(`Migrazione brani preferiti completata: ${migratedCount}/${savedTrackIds.length} brani migrati`);
    
    res.json({
      success: migratedCount > 0,
      migrationLog,
      errors
    });
  } catch (error) {
    console.error('Error during saved tracks migration:', error);
    res.json({
      success: false,
      error: 'Failed to complete saved tracks migration',
      migrationLog,
      errors: [...errors, error.message]
    });
  }
});

// Migrate followed artists
router.post('/migrate/followed-artists', [refreshSourceToken, refreshDestToken, ensureAuthenticated], async (req, res) => {
  const { followedArtistIds } = req.body;
  const migrationLog = [];
  const errors = [];
  
  try {
    if (!followedArtistIds || !Array.isArray(followedArtistIds) || followedArtistIds.length === 0) {
      return res.json({
        success: false,
        error: 'Nessun artista selezionato da migrare',
        migrationLog: ['Nessun artista selezionato da migrare'],
        errors: ['Nessun artista selezionato da migrare']
      });
    }
    
    // Assicurati che i token siano impostati correttamente
    console.log('Migrazione artisti seguiti: impostazione token');
    // Usa i token dalla sessione tokens invece che da sourceUser/destUser
    if (req.session.sourceTokens && req.session.sourceTokens.accessToken) {
      sourceSpotifyApi.setAccessToken(req.session.sourceTokens.accessToken);
    } else {
      sourceSpotifyApi.setAccessToken(req.session.sourceUser.accessToken);
    }
    
    if (req.session.destTokens && req.session.destTokens.accessToken) {
      destSpotifyApi.setAccessToken(req.session.destTokens.accessToken);
    } else {
      destSpotifyApi.setAccessToken(req.session.destUser.accessToken);
    }
    
    migrationLog.push(`Inizio migrazione di ${followedArtistIds.length} artisti...`);
    
    // Verifica quali artisti sono già seguiti nell'account di destinazione
    const batchCheckSize = 50;
    let alreadyFollowedArtists = [];
    
    for (let i = 0; i < followedArtistIds.length; i += batchCheckSize) {
      const batchToCheck = followedArtistIds.slice(i, i + batchCheckSize);
      try {
        const checkResult = await destSpotifyApi.isFollowingArtists(batchToCheck);
        
        // Aggiungi gli ID degli artisti già seguiti all'array
        batchToCheck.forEach((artistId, index) => {
          if (checkResult.body[index]) {
            alreadyFollowedArtists.push(artistId);
          }
        });
      } catch (error) {
        console.error(`Error checking followed artists:`, error);
        // In caso di errore, continua con la migrazione normale
      }
      
      // Pausa breve per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (alreadyFollowedArtists.length > 0) {
      migrationLog.push(`Trovati ${alreadyFollowedArtists.length} artisti già seguiti nell'account di destinazione. Questi artisti verranno saltati.`);
    }
    
    // Filtra gli artisti da seguire, escludendo quelli già seguiti
    const artistsToFollow = followedArtistIds.filter(artistId => !alreadyFollowedArtists.includes(artistId));
    
    if (artistsToFollow.length === 0) {
      migrationLog.push(`Tutti gli artisti selezionati sono già seguiti nell'account di destinazione. Nessun artista da seguire.`);
      return res.json({
        success: true,
        migrationLog,
        errors
      });
    }
    
    migrationLog.push(`Seguendo ${artistsToFollow.length} artisti non ancora seguiti...`);
    
    // Segui gli artisti in batch
    const batchSize = 50;
    let migratedCount = 0;
    
    for (let i = 0; i < artistsToFollow.length; i += batchSize) {
      const batch = artistsToFollow.slice(i, i + batchSize);
      
      try {
        console.log(`Seguendo batch ${i/batchSize + 1} di artisti (${batch.length} artisti)`);
        await destSpotifyApi.followArtists(batch);
        migratedCount += batch.length;
        migrationLog.push(`Seguiti ${batch.length} artisti (${migratedCount}/${artistsToFollow.length})`);
      } catch (error) {
        console.error(`Error following batch of artists:`, error);
        
        // Gestione dettagliata degli errori
        if (error.statusCode === 401) {
          console.log('Errore di autenticazione 401, aggiornamento token');
          await new Promise((resolve) => {
            refreshDestToken(req, res, () => {
              destSpotifyApi.setAccessToken(req.session.destUser.accessToken);
              resolve();
            });
          });
          
          // Prova di nuovo con il token aggiornato
          try {
            await destSpotifyApi.followArtists(batch);
            migratedCount += batch.length;
            migrationLog.push(`Seguiti ${batch.length} artisti dopo aggiornamento token (${migratedCount}/${artistsToFollow.length})`);
          } catch (retryError) {
            errors.push(`Errore nel seguire artisti anche dopo aggiornamento token: ${retryError.message}`);
          }
        } else if (error.statusCode === 429) {
          // Rate limiting - attendi più a lungo
          const retryAfter = error.headers['retry-after'] ? parseInt(error.headers['retry-after']) * 1000 : 5000;
          migrationLog.push(`Rate limit raggiunto, attendo ${retryAfter/1000} secondi prima di riprovare...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          // Decremento i per riprovare lo stesso batch
          i -= batchSize;
          continue;
        } else {
          errors.push(`Errore nel seguire alcuni artisti: ${error.message}`);
        }
      }
      
      // Pausa per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    migrationLog.push(`Migrazione artisti completata: ${migratedCount}/${followedArtistIds.length} artisti seguiti`);
    
    res.json({
      success: migratedCount > 0,
      migrationLog,
      errors
    });
  } catch (error) {
    console.error('Error during artist following migration:', error);
    res.json({
      success: false,
      error: 'Failed to complete artist following migration',
      migrationLog,
      errors: [...errors, error.message]
    });
  }
});

// Funzione principale di migrazione
router.post('/migrate', [refreshSourceToken, refreshDestToken, ensureAuthenticated], async (req, res) => {
  try {
    const { 
      playlists, 
      savedTracks, 
      savedTrackIds,
      followedArtists,
      followedArtistIds,
      followNonUserPlaylists,
      transferImages 
    } = req.body;
    
    console.log('Dati ricevuti per la migrazione:', {
      playlists: playlists?.length || 0,
      savedTracks: savedTracks,
      savedTrackIds: savedTrackIds?.length || 0,
      followedArtists: followedArtists,
      followedArtistIds: followedArtistIds?.length || 0,
      followNonUserPlaylists,
      transferImages
    });
    
    if (!req.session.sourceUser || !req.session.destUser) {
      return res.status(401).json({ error: 'Sessione non valida' });
    }
    
    // Inizializza le API di Spotify
    sourceSpotifyApi.setAccessToken(req.session.sourceUser.accessToken);
    destSpotifyApi.setAccessToken(req.session.destUser.accessToken);
    
    const migrationLog = [];
    const errors = [];
    
    try {
      // Migra le playlist
      if (playlists && playlists.length > 0) {
        migrationLog.push(`Inizio migrazione di ${playlists.length} playlist...`);
        
        // Dividi le playlist in batch per gestirle in parallelo
        const MAX_CONCURRENT = 3;
        const batches = [];
        for (let i = 0; i < playlists.length; i += MAX_CONCURRENT) {
          batches.push(playlists.slice(i, i + MAX_CONCURRENT));
        }
        
        for (const batch of batches) {
          // Assicurati che i token siano sempre aggiornati
          sourceSpotifyApi.setAccessToken(req.session.sourceUser.accessToken);
          destSpotifyApi.setAccessToken(req.session.destUser.accessToken);
          
          const results = await Promise.all(
            batch.map((playlistId, index) => 
              processPlaylist(
                playlistId, 
                index, 
                playlists.length, 
                res, 
                migrationLog, 
                errors, 
                followNonUserPlaylists, 
                transferImages,
                req
              )
            )
          );
          
          // Pausa tra i batch per evitare rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        migrationLog.push('Migrazione playlist completata');
      }
    } catch (playlistError) {
      console.error('Errore durante la migrazione delle playlist:', playlistError);
      errors.push(`Errore durante la migrazione delle playlist: ${playlistError.message}`);
    }
    
    try {
      // Migra i brani preferiti
      if (savedTracks === true && savedTrackIds && savedTrackIds.length > 0) {
        // Effettua la chiamata a saved-tracks come richiesta separata
        try {
          // Aggiorna i token prima della chiamata
          await new Promise((resolve) => refreshSourceToken(req, res, resolve));
          await new Promise((resolve) => refreshDestToken(req, res, resolve));
          
          // Assicurati che i token siano aggiornati nella sessione
          req.session.sourceUser = {
            ...req.session.sourceUser,
            accessToken: req.session.sourceTokens.accessToken
          };
          
          req.session.destUser = {
            ...req.session.destUser,
            accessToken: req.session.destTokens.accessToken
          };
          
          // Imposta i token aggiornati nelle API
          sourceSpotifyApi.setAccessToken(req.session.sourceTokens.accessToken);
          destSpotifyApi.setAccessToken(req.session.destTokens.accessToken);
          
          const savedTracksResult = await axios.post('http://localhost:' + (process.env.PORT || 5000) + '/api/migration/migrate/saved-tracks', 
            { savedTrackIds },
            { 
              headers: { 
                Cookie: req.headers.cookie 
              }
            }
          );
          
          if (savedTracksResult.data.migrationLog) {
            migrationLog.push(...savedTracksResult.data.migrationLog);
          }
          
          if (savedTracksResult.data.errors) {
            errors.push(...savedTracksResult.data.errors);
          }
        } catch (axiosError) {
          console.error('Errore durante la chiamata alla route dei brani preferiti:', axiosError);
          errors.push(`Errore durante la chiamata alla route dei brani preferiti: ${axiosError.message}`);
        }
      } else if (savedTracks) {
        console.log('Brani preferiti impostati su true ma nessun ID fornito');
        migrationLog.push('Non sono stati forniti brani preferiti da migrare');
      }
    } catch (savedTracksError) {
      console.error('Errore durante la migrazione dei brani preferiti:', savedTracksError);
      errors.push(`Errore durante la migrazione dei brani preferiti: ${savedTracksError.message}`);
    }
    
    try {
      // Migra gli artisti seguiti
      if (followedArtists === true && followedArtistIds && followedArtistIds.length > 0) {
        // Effettua la chiamata a followed-artists come richiesta separata
        try {
          // Aggiorna i token prima della chiamata
          await new Promise((resolve) => refreshSourceToken(req, res, resolve));
          await new Promise((resolve) => refreshDestToken(req, res, resolve));
          
          // Assicurati che i token siano aggiornati nella sessione
          req.session.sourceUser = {
            ...req.session.sourceUser,
            accessToken: req.session.sourceTokens.accessToken
          };
          
          req.session.destUser = {
            ...req.session.destUser,
            accessToken: req.session.destTokens.accessToken
          };
          
          // Imposta i token aggiornati nelle API
          sourceSpotifyApi.setAccessToken(req.session.sourceTokens.accessToken);
          destSpotifyApi.setAccessToken(req.session.destTokens.accessToken);
          
          const followedArtistsResult = await axios.post('http://localhost:' + (process.env.PORT || 5000) + '/api/migration/migrate/followed-artists', 
            { followedArtistIds },
            { 
              headers: { 
                Cookie: req.headers.cookie 
              }
            }
          );
          
          if (followedArtistsResult.data.migrationLog) {
            migrationLog.push(...followedArtistsResult.data.migrationLog);
          }
          
          if (followedArtistsResult.data.errors) {
            errors.push(...followedArtistsResult.data.errors);
          }
        } catch (axiosError) {
          console.error('Errore durante la chiamata alla route degli artisti seguiti:', axiosError);
          errors.push(`Errore durante la chiamata alla route degli artisti seguiti: ${axiosError.message}`);
        }
      } else if (followedArtists) {
        console.log('Artisti seguiti impostati su true ma nessun ID fornito');
        migrationLog.push('Non sono stati forniti artisti da seguire');
      }
    } catch (followedArtistsError) {
      console.error('Errore durante la migrazione degli artisti seguiti:', followedArtistsError);
      errors.push(`Errore durante la migrazione degli artisti seguiti: ${followedArtistsError.message}`);
    }
    
    // Invia il risultato finale
    res.json({
      success: errors.length === 0,
      log: migrationLog,
      errors: errors
    });
    
  } catch (error) {
    console.error('Error in migration route:', error);
    res.status(500).json({ 
      error: 'Errore durante la migrazione',
      details: error.message 
    });
  }
});

// Migration status endpoint
router.get('/migration/status', ensureAuthenticated, (req, res) => {
  // This would typically connect to a database or in-memory store
  // to retrieve the status of ongoing migrations
  res.json({
    status: 'No active migrations',
    completedTasks: [],
    pendingTasks: [],
    errors: []
  });
});

module.exports = router;