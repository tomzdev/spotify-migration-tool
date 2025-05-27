import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Button, CircularProgress, List, ListItem, ListItemText, Alert, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const Migration = ({ authStatus }) => {
  const navigate = useNavigate();
  const [migrationStarted, setMigrationStarted] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('in_progress');
  const [migrationLog, setMigrationLog] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrationData, setMigrationData] = useState(null);

  useEffect(() => {
    try {
      // Recupera le selezioni da localStorage
      const selectedPlaylists = JSON.parse(localStorage.getItem('selectedPlaylists') || '[]');
      const selectedSavedTracks = JSON.parse(localStorage.getItem('selectedSavedTracks') || 'false');
      const selectedSavedTrackIds = JSON.parse(localStorage.getItem('selectedSavedTrackIds') || '[]');
      const selectedFollowedArtists = JSON.parse(localStorage.getItem('selectedFollowedArtists') || 'false');
      const selectedFollowedArtistIds = JSON.parse(localStorage.getItem('selectedFollowedArtistIds') || '[]');
      
      // Verifica se almeno una delle selezioni contiene elementi
      const hasData = 
        selectedPlaylists.length > 0 || 
        (selectedSavedTracks && selectedSavedTrackIds.length > 0) || 
        (selectedFollowedArtists && selectedFollowedArtistIds.length > 0);
      
      if (!hasData) {
        navigate('/preview');
        return;
      }
      
      // Crea l'oggetto migrationData
      const migrationData = {
        playlists: selectedPlaylists,
        savedTracks: selectedSavedTracks,
        savedTrackIds: selectedSavedTrackIds,
        followedArtists: selectedFollowedArtists,
        followedArtistIds: selectedFollowedArtistIds
      };
      
      setMigrationData(migrationData);
      setLoading(false);
    } catch (error) {
      console.error('Error parsing migration data:', error);
      toast.error('Error loading migration data');
      navigate('/preview');
    }
  }, [navigate]);

  const startMigration = async () => {
    try {
      setMigrationStarted(true);
      setLoading(true);
      
      // Invia la richiesta di migrazione con le opzioni di default
      const response = await axios.post('/api/migration/migrate', {
        ...migrationData,
        followNonUserPlaylists: true, // Opzione di default
        transferImages: true // Opzione di default
      });
      
      // Aggiorna lo stato con i risultati
      setMigrationStatus(response.data.success ? 'completed' : 'failed');
      setMigrationLog(response.data.log || []);
      setErrors(response.data.errors || []);
      
      // Pulisci il localStorage
      localStorage.removeItem('selectedPlaylists');
      localStorage.removeItem('selectedSavedTracks');
      localStorage.removeItem('selectedSavedTrackIds');
      localStorage.removeItem('selectedFollowedArtists');
      localStorage.removeItem('selectedFollowedArtistIds');
      
    } catch (error) {
      console.error('Error during migration:', error);
      setMigrationStatus('failed');
      setErrors([error.message]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {migrationStarted ? 'Migrazione in corso...' : 'Caricamento dati...'}
        </Typography>
      </Container>
    );
  }

  // Pagina di riepilogo prima della migrazione
  if (!migrationStarted) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Riepilogo Migrazione
        </Typography>
        
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Elementi da migrare
          </Typography>
          
          <Typography variant="body1" paragraph>
            Stai per migrare i seguenti elementi da {authStatus.sourceUser?.display_name} a {authStatus.destUser?.display_name}:
          </Typography>
          
          <List sx={{ width: '100%', maxWidth: 360, mx: 'auto', bgcolor: 'background.paper' }}>
            {migrationData?.playlists.length > 0 && (
              <ListItem>
                <ListItemText 
                  primary={`${migrationData.playlists.length} Playlist`} 
                />
              </ListItem>
            )}
            
            {migrationData?.savedTracks && migrationData.savedTrackIds.length > 0 && (
              <ListItem>
                <ListItemText primary={`${migrationData.savedTrackIds.length} Brani Preferiti`} />
              </ListItem>
            )}
            
            {migrationData?.followedArtists && migrationData.followedArtistIds.length > 0 && (
              <ListItem>
                <ListItemText primary={`${migrationData.followedArtistIds.length} Artisti Seguiti`} />
              </ListItem>
            )}
          </List>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
            <Button 
              variant="contained" 
              color="primary"
              size="large"
              onClick={startMigration}
            >
              Avvia Migrazione
            </Button>
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => navigate('/preview')}
            >
              Torna alla selezione
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  // Pagina di risultati della migrazione
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {migrationStatus === 'completed' ? 'Migrazione Completata' : 'Errore nella Migrazione'}
      </Typography>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Log della Migrazione
        </Typography>
        <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
          {migrationLog.map((log, index) => (
            <Typography key={index} variant="body2" sx={{ mb: 1 }}>
              {log}
            </Typography>
          ))}
        </Paper>
      </Box>
      
      {errors.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" color="error" gutterBottom>
            Errori
          </Typography>
          <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto', bgcolor: 'error.light' }}>
            {errors.map((error, index) => (
              <Typography key={index} variant="body2" color="error.contrastText">
                {error}
              </Typography>
            ))}
          </Paper>
        </Box>
      )}
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate('/preview')}
        >
          Torna all'Anteprima
        </Button>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={() => navigate('/')}
        >
          Torna alla Home
        </Button>
      </Box>
    </Container>
  );
};

export default Migration;