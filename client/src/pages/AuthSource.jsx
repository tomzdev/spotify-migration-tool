import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Button, CircularProgress, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthSource = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if we're returning from Spotify auth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
      setError('Authentication failed: ' + error);
      return;
    }
    
    if (code) {
      // We're returning from Spotify with an auth code
      setLoading(true);
      
      // The actual auth is handled by the backend
      // We just need to redirect to the right page after auth completes
      axios.get('/api/auth/status')
        .then(response => {
          setLoading(false);
          
          if (response.data.sourceAuthenticated) {
            if (response.data.destAuthenticated) {
              navigate('/preview');
            } else {
              // Reindirizzamento alla pagina dell'account destinatario con un messaggio chiaro
              navigate('/auth/destination');
            }
          } else {
            setError('Authentication failed. Please try again.');
          }
        })
        .catch(err => {
          console.error('Error checking auth status:', err);
          setLoading(false);
          setError('Error checking authentication status');
        });
    }
  }, [navigate]);

  const handleAuth = () => {
    setLoading(true);
    // Redirect to backend auth route
    window.location.href = '/api/auth/source/login';
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Authenticating with Spotify...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Connect Source Account
        </Typography>
        
        <Typography variant="body1" paragraph align="center">
          First, let's connect your source Spotify account - the one you want to migrate data FROM.
        </Typography>
        
        {error && (
          <Box sx={{ my: 2, p: 2, bgcolor: 'error.main', color: 'white', borderRadius: 1 }}>
            <Typography>{error}</Typography>
          </Box>
        )}
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={handleAuth}
            sx={{ px: 4, py: 1.5 }}
          >
            Connect to Spotify
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AuthSource;