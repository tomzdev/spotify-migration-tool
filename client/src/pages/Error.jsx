import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Paper, Accordion, AccordionSummary, AccordionDetails, Alert, Link, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const Error = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [errorMessage, setErrorMessage] = useState(queryParams.get('message') || 'An unexpected error occurred');
  const [detailedError, setDetailedError] = useState(null);
  const [serverLogs, setServerLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const isDebugMode = queryParams.get('debug') === 'true';
  
  useEffect(() => {
    // Prova a estrarre un JSON dall'errore se presente
    try {
      // Cerca un possibile JSON nell'errore
      const jsonMatch = errorMessage.match(/\{.*\}/s);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const jsonObj = JSON.parse(jsonStr);
        setDetailedError(jsonObj);
      }
    } catch (e) {
      console.log('Non è stato possibile estrarre JSON dall\'errore:', e);
    }
    
    // Se siamo in modalità debug, carica automaticamente i log
    if (isDebugMode) {
      fetchServerLogs();
    }
  }, [errorMessage, isDebugMode]);
  
  // Funzione per recuperare i log dal server
  const fetchServerLogs = async () => {
    try {
      setLoadingLogs(true);
      // Chiamata all'endpoint API per recuperare i log di debug
      const response = await axios.get('/api/debug/logs');
      if (response.data && response.data.logs) {
        setServerLogs(response.data.logs);
      } else {
        // Fallback in caso di risposta vuota
        setServerLogs([
          { timestamp: new Date(), message: 'Tentativo di autenticazione fallito', type: 'error' },
          { timestamp: new Date(), message: 'Verifica le credenziali nel file .env', type: 'info' },
          { timestamp: new Date(), message: 'Controlla che i redirect URI siano configurati correttamente nel Spotify Developer Dashboard', type: 'info' }
        ]);
      }
    } catch (error) {
      console.error('Errore nel recupero dei log:', error);
      toast.error('Impossibile recuperare i log dal server');
      // Fallback in caso di errore
      setServerLogs([
        { timestamp: new Date(), message: 'Errore nel recupero dei log dal server', type: 'error' },
        { timestamp: new Date(), message: error.message || 'Errore sconosciuto', type: 'error' },
        { timestamp: new Date(), message: 'Suggerimento: Verifica che il server sia in esecuzione', type: 'info' }
      ]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Verifica se l'errore è relativo alle autorizzazioni Spotify
  const isAuthScopeError = errorMessage.toLowerCase().includes('scope') || 
                           errorMessage.toLowerCase().includes('permission') || 
                           errorMessage.toLowerCase().includes('autorizzazioni');
  
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" color="error">
          Error
        </Typography>
        
        <Box sx={{ my: 4, p: 3, bgcolor: 'error.main', color: 'white', borderRadius: 1 }}>
          <Typography variant="body1">{errorMessage}</Typography>
        </Box>
        
        {isAuthScopeError && (
          <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Suggerimento:</strong> Questo errore potrebbe essere causato da autorizzazioni insufficienti nelle tue app Spotify.
            </Typography>
            <Typography variant="body2">
              Verifica che entrambe le app nel Spotify Developer Dashboard abbiano tutti gli scope necessari e che i Redirect URI siano configurati correttamente.
              Consulta il <Link href="/" onClick={(e) => {e.preventDefault(); navigate('/');}} color="primary">README</Link> per maggiori informazioni.
            </Typography>
          </Alert>
        )}
        
        <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Suggerimenti per risolvere il problema:</strong>
          </Typography>
          <Typography variant="body2" component="div">
            <ol>
              <li>Verifica che le credenziali nel file .env siano corrette</li>
              <li>Controlla che i Redirect URI nel Spotify Developer Dashboard corrispondano esattamente a quelli nel file .env</li>
              <li>Assicurati che l'app Spotify abbia tutti gli scope necessari</li>
              <li>Prova a cancellare i cookie del browser e riavviare l'applicazione</li>
              <li>Verifica che il server sia in esecuzione sulla porta corretta (5000)</li>
            </ol>
          </Typography>
        </Alert>
        
        {detailedError && (
          <Accordion sx={{ mt: 2, mb: 4 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Dettagli tecnici dell'errore</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, overflow: 'auto' }}>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(detailedError, null, 2)}
                </pre>
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
        
        {/* Debug Logs Section */}
        {isDebugMode && (
          <Box sx={{ mt: 3 }}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BugReportIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography>Debug Information</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  {loadingLogs ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress size={30} />
                    </Box>
                  ) : serverLogs.length > 0 ? (
                    <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {serverLogs.map((log, index) => (
                        <Typography key={index} variant="body2" color={log.type === 'error' ? 'error' : 'textPrimary'} sx={{ mb: 1 }}>
                          [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                        </Typography>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <Button 
                        variant="outlined" 
                        color="info" 
                        startIcon={<InfoIcon />}
                        onClick={fetchServerLogs}
                      >
                        Load Debug Logs
                      </Button>
                    </Box>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
        
        <Box sx={{ mt: 4, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
          
          {!isDebugMode && (
            <Button 
              variant="outlined" 
              color="info" 
              size="large"
              onClick={() => navigate(`/error?message=${encodeURIComponent(errorMessage)}&debug=true`)}
            >
              Show Debug Info
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Error;