const express = require('express');
const router = express.Router();
const auth = require('./auth');
const sourceSpotifyApi = auth.sourceSpotifyApi;
const refreshSourceToken = auth.refreshSourceToken;

// Middleware to ensure both accounts are authenticated
const ensureAuthenticated = (req, res, next) => {
  if (!req.session.sourceUser || !req.session.destUser) {
    return res.status(401).json({ error: 'Both accounts must be authenticated' });
  }
  next();
};

// Get tracks for a specific playlist
router.get('/playlist-tracks/:playlistId', [refreshSourceToken, ensureAuthenticated], async (req, res) => {
  const { playlistId } = req.params;
  
  try {
    // Get all tracks from source playlist with pagination
    let tracks = [];
    let offset = 0;
    const limit = 100;
    let total = 1; // Initial value to enter the loop
    
    while (offset < total) {
      const tracksResponse = await sourceSpotifyApi.getPlaylistTracks(playlistId, {
        offset,
        limit,
        fields: 'items(track(id,name,artists(name))),total'
      });
      
      total = tracksResponse.body.total;
      tracks = tracks.concat(tracksResponse.body.items.map(item => item.track));
      offset += limit;
      
      // Break if we've fetched all tracks or reached a reasonable limit
      if (tracks.length >= total || offset >= 500) {
        break;
      }
    }
    
    res.json({ tracks });
  } catch (error) {
    console.error(`Error fetching tracks for playlist ${playlistId}:`, error);
    res.status(500).json({ error: 'Failed to fetch playlist tracks' });
  }
});

module.exports = router;