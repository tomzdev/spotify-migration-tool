import React, { useState } from 'react';
import { Container, Typography, Box, Button, Paper, Grid, Card, CardContent, CardActions, Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Music, SwapHoriz, Security, Speed } from '@mui/icons-material';

const Home = ({ authStatus }) => {
  const navigate = useNavigate();
  const { sourceAuthenticated, destAuthenticated } = authStatus || { sourceAuthenticated: false, destAuthenticated: false };
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleRequestAccess = async () => {
    if (!email || !reason) {
      setSnackbarMessage('Please fill in all fields');
      setSnackbarOpen(true);
      return;
    }

    try {
      const response = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, reason }),
      });

      const data = await response.json();

      if (data.success) {
        setSnackbarMessage('Access request submitted! You will be contacted soon.');
        setSnackbarOpen(true);
        setRequestDialogOpen(false);
        setEmail('');
        setReason('');
      } else {
        setSnackbarMessage(data.error || 'Error submitting request. Please try again.');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error submitting access request:', error);
      setSnackbarMessage('Error submitting request. Please try again.');
      setSnackbarOpen(true);
    }
  };

  const features = [
    {
      icon: <Music />,
      title: 'Complete Migration',
      description: 'Transfer playlists, saved tracks, and followed artists between accounts'
    },
    {
      icon: <SwapHoriz />,
      title: 'Selective Transfer',
      description: 'Choose exactly what you want to migrate - individual playlists or tracks'
    },
    {
      icon: <Security />,
      title: 'Secure Authentication',
      description: 'Direct OAuth with Spotify - your credentials never touch our servers'
    },
    {
      icon: <Speed />,
      title: 'Preserves Order',
      description: 'Maintains the original order of your playlists and saved tracks'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Spotify Migration Tool
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph sx={{ maxWidth: 600, mx: 'auto' }}>
          Seamlessly transfer your music library between Spotify accounts
        </Typography>
        
        <Alert severity="info" sx={{ my: 4, maxWidth: 600, mx: 'auto' }}>
          <Typography variant="body2">
            <strong>Currently in Beta:</strong> This app is in development mode with limited access. 
            Request access below to try it out!
          </Typography>
        </Alert>

        <Alert severity="success" sx={{ my: 2, maxWidth: 800, mx: 'auto' }}>
          <Typography variant="body1" gutterBottom>
            <strong>💡 Bypass the 25-User Limit!</strong>
          </Typography>
          <Typography variant="body2">
            Want unlimited access? <strong>Self-host your own instance</strong> in 5 minutes! 
            No user limits, full privacy, completely free.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              color="primary" 
              href="https://github.com/tomzdev/spotify-migration-tool#-self-hosting-recommended"
              target="_blank"
              sx={{ mr: 2 }}
            >
              📖 Self-Hosting Guide
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              href="https://github.com/tomzdev/spotify-migration-tool/archive/main.zip"
              target="_blank"
            >
              ⬇️ Download & Host
            </Button>
          </Box>
        </Alert>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            size="large" 
            onClick={() => navigate('/auth/source')}
            sx={{ px: 4, py: 1.5 }}
          >
            Start Migration
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => setRequestDialogOpen(true)}
            sx={{ px: 4, py: 1.5 }}
          >
            Request Access
          </Button>
        </Box>
      </Box>

      <Grid container spacing={4} sx={{ mb: 8 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Paper elevation={2} sx={{ p: 4, height: '100%', textAlign: 'center' }}>
              <Box sx={{ color: 'primary.main', mb: 2 }}>
                {React.cloneElement(feature.icon, { fontSize: 'large' })}
              </Box>
              <Typography variant="h6" gutterBottom>
                {feature.title}
              </Typography>
              <Typography color="text.secondary">
                {feature.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={3} sx={{ p: 6, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom align="center">
          How It Works
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary" gutterBottom>
                1. Connect Accounts
              </Typography>
              <Typography color="text.secondary">
                Authenticate both your source and destination Spotify accounts
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary" gutterBottom>
                2. Select Data
              </Typography>
              <Typography color="text.secondary">
                Choose which playlists, tracks, and artists you want to transfer
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary" gutterBottom>
                3. Migrate
              </Typography>
              <Typography color="text.secondary">
                Sit back and watch as your music library is transferred safely
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Access to Spotify Migration Tool</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Since this app is currently in development mode, we need to manually add users to our Spotify app. 
            Fill out this form and we'll get back to you soon!
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            label="Your Spotify Email"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
            helperText="The email address associated with your Spotify account"
          />
          
          <TextField
            margin="dense"
            label="Why do you need access?"
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., I want to migrate my playlists to a new account..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRequestAccess} variant="contained">Submit Request</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default Home;