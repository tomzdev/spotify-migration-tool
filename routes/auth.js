const express = require('express');
const router = express.Router();
const SpotifyWebApi = require('spotify-web-api-node');

// Scopes for Spotify API access
const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  'user-library-modify',
  'user-follow-read',
  'user-follow-modify',
  'ugc-image-upload'
];

// Single Spotify app configuration
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Helper function to create a separate API instance for each user
const createUserApiInstance = () => {
  return new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
  });
};

// Source account authentication
const sourceSpotifyApi = createUserApiInstance();

// Destination account authentication  
const destSpotifyApi = createUserApiInstance();

// Login route for source account
router.get('/source/login', (req, res) => {
  // Pulisci la sessione precedente
  req.session.sourceTokens = null;
  req.session.sourceUser = null;
  
  const state = 'source-' + Math.random().toString(36).substring(7);
  req.session.authState = state; // Salva lo state per la verifica
  
  const authorizeURL = spotifyApi.createAuthorizeURL(SPOTIFY_SCOPES, state, {
    showDialog: true // Forza il popup di autorizzazione
  });
  res.redirect(authorizeURL);
});

// Callback route for source account
router.get('/source/callback', async (req, res) => {
  const { code, error, error_description, state } = req.query;
  
  // Log completo dei parametri di callback per debug
  console.log('Source callback received with params:', {
    code: code ? `${code.substring(0, 5)}...` : 'No code',
    error: error || 'None',
    error_description: error_description || 'None',
    state: state || 'None'
  });
  
  // Verifica dello state per sicurezza
  if (req.session.authState && state !== req.session.authState) {
    console.error('State mismatch in source callback');
    return res.redirect('/error?message=Invalid authentication state&debug=true');
  }
  
  // Log error information if present in the callback
  if (error) {
    console.error('Spotify auth error:', { error, error_description });
    return res.redirect(`/error?message=Spotify authentication error: ${encodeURIComponent(error_description || error)}&debug=true`);
  }
  
  console.log('Source API credentials:', {
    clientId: process.env.SPOTIFY_CLIENT_ID ? `${process.env.SPOTIFY_CLIENT_ID.substring(0, 5)}...` : 'Not set',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    clientSecretSet: process.env.SPOTIFY_CLIENT_SECRET ? 'Yes' : 'No'
  });
  
  // Verifica che il codice di autorizzazione sia presente
  if (!code) {
    console.error('No authorization code received from Spotify');
    return res.redirect('/error?message=Failed to authenticate source account: No authorization code received&debug=true');
  }
  
  try {
    console.log('Attempting source authorization code grant...');
    console.log('Using code:', code.substring(0, 5) + '...');
    
    // Usa l'istanza principale per l'autorizzazione
    const data = await spotifyApi.authorizationCodeGrant(code);
    console.log('Source authorization successful, received tokens');
    
    // Save tokens to session with timestamp
    req.session.sourceTokens = {
      accessToken: data.body.access_token,
      refreshToken: data.body.refresh_token,
      expiresIn: data.body.expires_in,
      timestamp: Date.now()
    };
    
    // Set tokens on the source API object
    sourceSpotifyApi.setAccessToken(data.body.access_token);
    sourceSpotifyApi.setRefreshToken(data.body.refresh_token);
    
    // Get user profile
    console.log('Fetching source user profile with access token:', data.body.access_token.substring(0, 10) + '...');
    const userProfile = await sourceSpotifyApi.getMe();
    req.session.sourceUser = {
      ...userProfile.body,
      accessToken: data.body.access_token // Mantieni il token anche qui per compatibilità
    };
    console.log('Source user authenticated:', userProfile.body.id);
    console.log('Source user scopes granted:', data.body.scope ? data.body.scope.split(' ') : 'No scope information');
    
    // Pulisci lo state
    delete req.session.authState;
    
    // Redirect to frontend or destination login
    if (req.session.destUser) {
      console.log('Both accounts authenticated, redirecting to preview');
      res.redirect('/preview');
    } else {
      console.log('Only source account authenticated, redirecting to destination page');
      res.redirect('/auth/destination');
    }
  } catch (error) {
    console.error('Error during source authentication:', error);
    
    let errorMessage = '';
    let errorDetails = {};
    
    // Estrai dettagli dell'errore in modo più robusto
    if (error.body && error.body.error_description) {
      errorMessage = error.body.error_description;
      errorDetails = error.body;
      console.error('Using error body description:', errorMessage);
    } else if (error.body && error.body.error) {
      errorMessage = error.body.error;
      errorDetails = error.body;
      console.error('Using error body error:', errorMessage);
    } else if (error.message) {
      errorMessage = error.message;
      console.error('Using error message:', errorMessage);
    } else if (error.statusCode) {
      errorMessage = `HTTP Error: ${error.statusCode}`;
      console.error('Using status code:', errorMessage);
    } else {
      errorMessage = String(error);
      console.error('Using error as string:', errorMessage);
    }
    
    console.error('Error details:', errorMessage);
    
    // Verifica se l'errore è relativo alle autorizzazioni
    if (errorMessage.includes('scope') || errorMessage.includes('permission') || 
        (errorDetails.error === 'invalid_scope')) {
      errorMessage = 'Autorizzazioni insufficienti. Verifica che l\'app Spotify abbia tutti gli scope necessari nel Developer Dashboard.';
    }
    
    // Gestione specifica per errore 403 Forbidden
    if (error.statusCode === 403) {
      errorMessage = 'Accesso negato (403 Forbidden). Verifica che l\'app Spotify sia configurata correttamente e che non sia in modalità sviluppo con accesso limitato. Potrebbe essere necessario aggiungere il tuo account come utente di test nel Developer Dashboard.';
    }
    
    res.redirect(`/error?message=Failed to authenticate source account: ${encodeURIComponent(errorMessage)}&debug=true`);
  }
});

// Login route for destination account
router.get('/destination/login', (req, res) => {
  // Pulisci la sessione precedente
  req.session.destTokens = null;
  req.session.destUser = null;
  
  const state = 'dest-' + Math.random().toString(36).substring(7);
  req.session.authState = state; // Salva lo state per la verifica
  
  const authorizeURL = spotifyApi.createAuthorizeURL(SPOTIFY_SCOPES, state, {
    showDialog: true // Forza il popup di autorizzazione
  });
  res.redirect(authorizeURL);
});

// Callback route for destination account
router.get('/destination/callback', async (req, res) => {
  const { code, error, error_description, state } = req.query;
  
  // Log completo dei parametri di callback per debug
  console.log('Destination callback received with params:', {
    code: code ? `${code.substring(0, 5)}...` : 'No code',
    error: error || 'None',
    error_description: error_description || 'None',
    state: state || 'None'
  });
  
  // Verifica dello state per sicurezza
  if (req.session.authState && state !== req.session.authState) {
    console.error('State mismatch in destination callback');
    return res.redirect('/error?message=Invalid authentication state&debug=true');
  }
  
  // Log error information if present in the callback
  if (error) {
    console.error('Spotify auth error:', { error, error_description });
    return res.redirect(`/error?message=Spotify authentication error: ${encodeURIComponent(error_description || error)}&debug=true`);
  }
  
  console.log('Destination API credentials:', {
    clientId: process.env.SPOTIFY_CLIENT_ID ? `${process.env.SPOTIFY_CLIENT_ID.substring(0, 5)}...` : 'Not set',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    clientSecretSet: process.env.SPOTIFY_CLIENT_SECRET ? 'Yes' : 'No'
  });
  
  // Verifica che il codice di autorizzazione sia presente
  if (!code) {
    console.error('No authorization code received from Spotify');
    return res.redirect('/error?message=Failed to authenticate destination account: No authorization code received');
  }
  
  try {
    console.log('Attempting destination authorization code grant...');
    console.log('Using code:', code.substring(0, 5) + '...');
    
    // Usa l'istanza principale per l'autorizzazione
    const data = await spotifyApi.authorizationCodeGrant(code);
    console.log('Destination authorization successful, received tokens');
    
    // Save tokens to session with timestamp
    req.session.destTokens = {
      accessToken: data.body.access_token,
      refreshToken: data.body.refresh_token,
      expiresIn: data.body.expires_in,
      timestamp: Date.now()
    };
    
    // Set tokens on the destination API object
    destSpotifyApi.setAccessToken(data.body.access_token);
    destSpotifyApi.setRefreshToken(data.body.refresh_token);
    
    // Get user profile
    console.log('Fetching destination user profile...');
    const userProfile = await destSpotifyApi.getMe();
    req.session.destUser = {
      ...userProfile.body,
      accessToken: data.body.access_token // Mantieni il token anche qui per compatibilità
    };
    console.log('Destination user authenticated:', userProfile.body.id);
    console.log('Destination user scopes granted:', data.body.scope ? data.body.scope.split(' ') : 'No scope information');
    
    // Pulisci lo state
    delete req.session.authState;
    
    // Redirect to frontend or preview page
    if (req.session.sourceUser) {
      console.log('Both accounts authenticated, redirecting to preview');
      res.redirect('/preview');
    } else {
      console.log('Only destination account authenticated, redirecting to source login');
      res.redirect('/api/auth/source/login');
    }
  } catch (error) {
    console.error('Error during destination authentication:', error);
    
    let errorMessage = '';
    let errorDetails = {};
    
    // Estrai dettagli dell'errore in modo più robusto
    if (error.body && error.body.error_description) {
      errorMessage = error.body.error_description;
      errorDetails = error.body;
      console.error('Using error body description:', errorMessage);
    } else if (error.body && error.body.error) {
      errorMessage = error.body.error;
      errorDetails = error.body;
      console.error('Using error body error:', errorMessage);
    } else if (error.message) {
      errorMessage = error.message;
      console.error('Using error message:', errorMessage);
    } else if (error.statusCode) {
      errorMessage = `HTTP Error: ${error.statusCode}`;
      console.error('Using status code:', errorMessage);
    } else {
      errorMessage = String(error);
      console.error('Using error as string:', errorMessage);
    }
    
    console.error('Error details:', errorMessage);
    
    // Verifica se l'errore è relativo alle autorizzazioni
    if (errorMessage.includes('scope') || errorMessage.includes('permission') || 
        (errorDetails.error === 'invalid_scope')) {
      errorMessage = 'Autorizzazioni insufficienti. Verifica che l\'app Spotify abbia tutti gli scope necessari nel Developer Dashboard.';
    }
    
    // Gestione specifica per errore 403 Forbidden
    if (error.statusCode === 403) {
      errorMessage = 'Accesso negato (403 Forbidden). Verifica che l\'app Spotify sia configurata correttamente e che non sia in modalità sviluppo con accesso limitato. Potrebbe essere necessario aggiungere il tuo account come utente di test nel Developer Dashboard.';
    }
    
    res.redirect(`/error?message=Failed to authenticate destination account: ${encodeURIComponent(errorMessage)}&debug=true`);
  }
});

// Check authentication status
router.get('/status', (req, res) => {
  res.json({
    sourceAuthenticated: !!req.session.sourceUser,
    destAuthenticated: !!req.session.destUser,
    sourceUser: req.session.sourceUser || null,
    destUser: req.session.destUser || null
  });
});

// Handle access requests
router.post('/request-access', (req, res) => {
  const { email, reason } = req.body;
  
  if (!email || !reason) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and reason are required' 
    });
  }
  
  // Log the request (in production, you could save to database or send email)
  console.log('New access request:', {
    email,
    reason,
    timestamp: new Date(),
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress
  });
  
  // In production, you could:
  // 1. Save to database
  // 2. Send email notification to admin
  // 3. Add to a queue for manual approval
  // 4. Use a service like Mailgun, SendGrid, or Nodemailer
  
  res.json({
    success: true,
    message: 'Access request received successfully'
  });
});

// Logout routes
// Logout from source account only
router.get('/logout/source', (req, res) => {
  req.session.sourceUser = null;
  req.session.sourceTokens = null;
  res.json({ success: true });
});

// Logout from destination account only
router.get('/logout/destination', (req, res) => {
  req.session.destUser = null;
  req.session.destTokens = null;
  res.json({ success: true });
});

// Logout from both accounts
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Refresh token middleware
const refreshSourceToken = async (req, res, next) => {
  console.log('Checking source token status...');
  
  if (!req.session.sourceTokens) {
    console.error('Source tokens not found in session');
    return res.status(401).json({ error: 'Source account not authenticated' });
  }
  
  const { expiresIn, refreshToken } = req.session.sourceTokens;
  const expirationTime = new Date(req.session.sourceTokens.timestamp + expiresIn * 1000);
  
  const now = new Date();
  if (now >= expirationTime) {
    console.log('Source token expired, refreshing...', {
      expirationTime: expirationTime.toISOString(),
      currentTime: now.toISOString(),
      tokenAge: Math.floor((now - req.session.sourceTokens.timestamp) / 1000) + 's'
    });
    try {
      sourceSpotifyApi.setRefreshToken(refreshToken);
      const data = await sourceSpotifyApi.refreshAccessToken();
      
      req.session.sourceTokens = {
        accessToken: data.body.access_token,
        refreshToken: refreshToken,
        expiresIn: data.body.expires_in,
        timestamp: Date.now()
      };
      
      sourceSpotifyApi.setAccessToken(data.body.access_token);
    } catch (error) {
      console.error('Error refreshing source token:', error);
      return res.status(401).json({ error: 'Failed to refresh source token' });
    }
  }
  
  next();
};

const refreshDestToken = async (req, res, next) => {
  console.log('Checking destination token status...');
  
  if (!req.session.destTokens) {
    console.error('Destination tokens not found in session');
    return res.status(401).json({ error: 'Destination account not authenticated' });
  }
  
  const { expiresIn, refreshToken } = req.session.destTokens;
  const expirationTime = new Date(req.session.destTokens.timestamp + expiresIn * 1000);
  
  const now = new Date();
  if (now >= expirationTime) {
    console.log('Destination token expired, refreshing...', {
      expirationTime: expirationTime.toISOString(),
      currentTime: now.toISOString(),
      tokenAge: Math.floor((now - req.session.destTokens.timestamp) / 1000) + 's'
    });
    try {
      destSpotifyApi.setRefreshToken(refreshToken);
      const data = await destSpotifyApi.refreshAccessToken();
      
      req.session.destTokens = {
        accessToken: data.body.access_token,
        refreshToken: refreshToken,
        expiresIn: data.body.expires_in,
        timestamp: Date.now()
      };
      
      destSpotifyApi.setAccessToken(data.body.access_token);
    } catch (error) {
      console.error('Error refreshing destination token:', error);
      return res.status(401).json({ error: 'Failed to refresh destination token' });
    }
  }
  
  next();
};

// Export router and middleware
module.exports = router;
module.exports.sourceSpotifyApi = sourceSpotifyApi;
module.exports.destSpotifyApi = destSpotifyApi;
module.exports.refreshSourceToken = refreshSourceToken;
module.exports.refreshDestToken = refreshDestToken;