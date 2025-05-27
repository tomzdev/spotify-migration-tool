import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Grid, Button, Checkbox, List, ListItem, ListItemText, ListItemIcon, Divider, CircularProgress, FormControlLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import LogViewer from '../components/LogViewer';

const Preview = ({ authStatus }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    playlists: [],
    savedTracks: [],
    followedArtists: [],
    followedUsers: []
  });
  
  // Aggiungiamo stati per la paginazione
  const [pagination, setPagination] = useState({
    savedTracks: { page: 1, perPage: 50, total: 0 },
    followedArtists: { page: 1, perPage: 50, total: 0 }
  });
  
  const initialSelectionState = {
    playlists: [],
    savedTracks: false,
    savedTrackIds: [],
    followedArtists: false,
    followedArtistIds: [],
    followedUsers: false,
    playlistTracks: {},
    expandedTracks: false,
    expandedArtists: false
  };
  
  const [selected, setSelected] = useState(initialSelectionState);
  
  // Stato per tenere traccia delle playlist espanse
  const [expandedPlaylists, setExpandedPlaylists] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch playlists
        const playlistsRes = await axios.get('/api/migration/playlists');
        
        // Fetch saved tracks con paginazione
        const savedTracksRes = await axios.get('/api/migration/saved-tracks', {
          params: {
            page: pagination.savedTracks.page,
            perPage: pagination.savedTracks.perPage
          }
        });
        
        // Fetch followed artists con paginazione
        const followedArtistsRes = await axios.get('/api/migration/followed-artists', {
          params: {
            page: pagination.followedArtists.page,
            perPage: pagination.followedArtists.perPage
          }
        });
        
        setData(prev => ({
          playlists: playlistsRes.data.playlists || [],
          savedTracks: [...prev.savedTracks, ...(savedTracksRes.data.tracks || [])],
          followedArtists: [...prev.followedArtists, ...(followedArtistsRes.data.artists || [])],
          followedUsers: []
        }));

        // Aggiorna i totali per la paginazione
        setPagination(prev => ({
          savedTracks: { ...prev.savedTracks, total: savedTracksRes.data.total || 0 },
          followedArtists: { ...prev.followedArtists, total: followedArtistsRes.data.total || 0 }
        }));
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data from your Spotify account');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pagination.savedTracks.page, pagination.followedArtists.page]);

  // Rimuoviamo la gestione dei log poiché non più necessaria
  const addLog = (message, type = 'info') => {
    // Funzione mantenuta per compatibilità ma non fa nulla
    console.log(`[${type}] ${message}`);
  };

  const handlePlaylistToggle = (playlistId) => {
    const playlist = data.playlists.find(p => p.id === playlistId);
    setSelected(prev => {
      const newPlaylists = [...prev.playlists];
      
      if (newPlaylists.includes(playlistId)) {
        addLog(`Deselected playlist: ${playlist?.name || playlistId}`);
        return {
          ...prev,
          playlists: newPlaylists.filter(id => id !== playlistId)
        };
      } else {
        addLog(`Selected playlist: ${playlist?.name || playlistId}`);
        return {
          ...prev,
          playlists: [...newPlaylists, playlistId]
        };
      }
    });
  };
  
  // Funzione per gestire l'espansione di una playlist
  const handleExpandPlaylist = async (playlistId) => {
    // Inverti lo stato di espansione
    setExpandedPlaylists(prev => ({
      ...prev,
      [playlistId]: !prev[playlistId]
    }));
    
    // Se stiamo espandendo e non abbiamo ancora caricato le tracce
    if (!expandedPlaylists[playlistId]) {
      try {
        // Carica le tracce della playlist
        const response = await axios.get(`/api/migration/playlist-tracks/${playlistId}`);
        const tracks = response.data.tracks || [];
        
        // Aggiorna i dati delle playlist con le tracce
        setData(prev => ({
          ...prev,
          playlists: prev.playlists.map(p => 
            p.id === playlistId ? { ...p, loadedTracks: tracks } : p
          )
        }));
      } catch (error) {
        console.error(`Error loading tracks for playlist ${playlistId}:`, error);
        toast.error('Failed to load playlist tracks');
      }
    }
  };
  
  // Funzione per gestire la selezione/deselezione di una traccia
  const handleTrackToggle = (playlistId, trackId) => {
    setSelected(prev => {
      // Ottieni l'elenco corrente delle tracce deselezionate per questa playlist
      const playlistDeselectedTracks = prev.playlistTracks[playlistId] || [];
      
      // Verifica se la traccia è già deselezionata
      if (playlistDeselectedTracks.includes(trackId)) {
        // Rimuovi la traccia dall'elenco delle deselezionate
        const updatedTracks = playlistDeselectedTracks.filter(id => id !== trackId);
        addLog(`Reselected track in playlist`);
        return {
          ...prev,
          playlistTracks: {
            ...prev.playlistTracks,
            [playlistId]: updatedTracks
          }
        };
      } else {
        // Aggiungi la traccia all'elenco delle deselezionate
        addLog(`Deselected track in playlist`);
        return {
          ...prev,
          playlistTracks: {
            ...prev.playlistTracks,
            [playlistId]: [...playlistDeselectedTracks, trackId]
          }
        };
      }
    });
  };

  // Funzione per gestire la selezione/deselezione di un brano preferito
  const handleSavedTrackToggle = (trackId) => {
    setSelected(prev => {
      // Verifica se il brano è già selezionato
      if (prev.savedTrackIds.includes(trackId)) {
        // Rimuovi il brano dall'elenco dei selezionati
        addLog(`Deselected saved track`);
        return {
          ...prev,
          savedTrackIds: prev.savedTrackIds.filter(id => id !== trackId)
        };
      } else {
        // Aggiungi il brano all'elenco dei selezionati
        addLog(`Selected saved track`);
        return {
          ...prev,
          savedTrackIds: [...prev.savedTrackIds, trackId]
        };
      }
    });
  };

  // Funzione per gestire la selezione/deselezione di un artista seguito
  const handleFollowedArtistToggle = (artistId) => {
    setSelected(prev => {
      // Verifica se l'artista è già selezionato
      if (prev.followedArtistIds.includes(artistId)) {
        // Rimuovi l'artista dall'elenco dei selezionati
        addLog(`Deselected followed artist`);
        return {
          ...prev,
          followedArtistIds: prev.followedArtistIds.filter(id => id !== artistId)
        };
      } else {
        // Aggiungi l'artista all'elenco dei selezionati
        addLog(`Selected followed artist`);
        return {
          ...prev,
          followedArtistIds: [...prev.followedArtistIds, artistId]
        };
      }
    });
  };

  const handleToggleAll = (type) => {
    if (type === 'playlists') {
      setSelected(prev => {
        if (prev.playlists.length === data.playlists.length) {
          addLog('Deselected all playlists');
          return { ...prev, playlists: [] };
        } else {
          addLog(`Selected all playlists (${data.playlists.length} playlists)`);
          return { ...prev, playlists: data.playlists.map(playlist => playlist.id) };
        }
      });
    } else {
      setSelected(prev => {
        const newValue = !prev[type];
        const typeLabel = 
          type === 'savedTracks' ? 'Liked Songs' :
          type === 'followedArtists' ? 'Followed Artists' :
          'Followed Users';
        addLog(`${newValue ? 'Selected' : 'Deselected'} ${typeLabel}`);
        
        // Se stiamo selezionando tutti i brani preferiti o gli artisti seguiti,
        // aggiorniamo anche gli array di ID selezionati
        if (type === 'savedTracks') {
          return {
            ...prev,
            [type]: newValue,
            savedTrackIds: newValue ? data.savedTracks.map(item => item.track.id) : []
          };
        } else if (type === 'followedArtists') {
          return {
            ...prev,
            [type]: newValue,
            followedArtistIds: newValue ? data.followedArtists.map(artist => artist.id) : []
          };
        } else {
          return {
            ...prev,
            [type]: newValue
          };
        }
      });
    }
  };

  const handleProceed = () => {
    try {
      console.log("Stato selezioni prima del salvataggio:", {
        playlists: selected.playlists.length,
        savedTracks: selected.savedTracks,
        savedTrackIds: selected.savedTrackIds.length,
        followedArtists: selected.followedArtists,
        followedArtistIds: selected.followedArtistIds.length
      });

      // Salva le selezioni in localStorage
      localStorage.setItem('selectedPlaylists', JSON.stringify(selected.playlists));
      
      // Salva brani preferiti
      // Se l'intera card è selezionata oppure se ci sono brani individuali selezionati
      const migrateSelectedTracks = selected.savedTracks || selected.savedTrackIds.length > 0;
      localStorage.setItem('selectedSavedTracks', JSON.stringify(migrateSelectedTracks));
      
      if (migrateSelectedTracks) {
        // Se è selezionata l'intera card, salva tutti i brani
        if (selected.savedTracks && data.savedTracks && data.savedTracks.length > 0) {
          const trackIds = data.savedTracks.map(item => item.track.id);
          localStorage.setItem('selectedSavedTrackIds', JSON.stringify(trackIds));
          console.log(`Salvati ${trackIds.length} brani preferiti (selezione completa) per la migrazione`);
        } 
        // Altrimenti salva solo quelli selezionati individualmente
        else if (selected.savedTrackIds.length > 0) {
          localStorage.setItem('selectedSavedTrackIds', JSON.stringify(selected.savedTrackIds));
          console.log(`Salvati ${selected.savedTrackIds.length} brani preferiti (selezione individuale) per la migrazione`);
        } else {
          localStorage.setItem('selectedSavedTrackIds', JSON.stringify([]));
          console.log("Nessun brano preferito da migrare");
        }
      } else {
        localStorage.setItem('selectedSavedTrackIds', JSON.stringify([]));
      }
      
      // Salva artisti seguiti
      // Se l'intera card è selezionata oppure se ci sono artisti individuali selezionati
      const migrateSelectedArtists = selected.followedArtists || selected.followedArtistIds.length > 0;
      localStorage.setItem('selectedFollowedArtists', JSON.stringify(migrateSelectedArtists));
      
      if (migrateSelectedArtists) {
        // Se è selezionata l'intera card, salva tutti gli artisti
        if (selected.followedArtists && data.followedArtists && data.followedArtists.length > 0) {
          const artistIds = data.followedArtists.map(artist => artist.id);
          localStorage.setItem('selectedFollowedArtistIds', JSON.stringify(artistIds));
          console.log(`Salvati ${artistIds.length} artisti seguiti (selezione completa) per la migrazione`);
        } 
        // Altrimenti salva solo quelli selezionati individualmente
        else if (selected.followedArtistIds.length > 0) {
          localStorage.setItem('selectedFollowedArtistIds', JSON.stringify(selected.followedArtistIds));
          console.log(`Salvati ${selected.followedArtistIds.length} artisti seguiti (selezione individuale) per la migrazione`);
        } else {
          localStorage.setItem('selectedFollowedArtistIds', JSON.stringify([]));
          console.log("Nessun artista seguito da migrare");
        }
      } else {
        localStorage.setItem('selectedFollowedArtistIds', JSON.stringify([]));
      }
      
      navigate('/migration');
    } catch (error) {
      console.error('Error saving selection:', error);
      toast.error('Errore nel salvataggio delle selezioni');
    }
  };

  // Funzione per caricare più dati
  const loadMore = (type) => {
    setPagination(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        page: prev[type].page + 1
      }
    }));
  };

  // Funzione per verificare se ci sono più dati da caricare
  const hasMore = (type) => {
    return data[type].length < pagination[type].total;
  };

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading your Spotify data...
        </Typography>
      </Container>
    );
  }

  // Stile per le card selezionate
  const getCardStyle = (isSelected) => ({
    border: isSelected ? '2px solid #1DB954' : '2px solid transparent',
    borderRadius: '16px',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
    }
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Sezione log rimossa come richiesto */}
      <Typography variant="h4" component="h1" gutterBottom>
        Anteprima e selezione elementi da migrare
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1">
            Seleziona gli elementi che vuoi migrare da {authStatus.sourceUser?.display_name} a {authStatus.destUser?.display_name}.
          </Typography>
          
          <Button 
            variant="text" 
            color="primary"
            onClick={() => {
              // Verifica se tutti gli elementi sono già selezionati
              const allSelected = 
                selected.playlists.length === data.playlists.length && 
                selected.savedTracks && 
                selected.followedArtists;
              
              if (allSelected) {
                // Deseleziona tutto
                setSelected(prev => ({
                  ...prev,
                  playlists: [],
                  savedTracks: false,
                  savedTrackIds: [], // Assicurati che l'array degli ID dei brani sia vuoto
                  followedArtists: false,
                  followedArtistIds: [], // Assicurati che l'array degli ID degli artisti sia vuoto
                  followedUsers: false
                }));
                addLog('Deselezionati tutti gli elementi');
              } else {
                // Seleziona tutto
                setSelected(prev => ({
                  ...prev,
                  playlists: data.playlists.map(p => p.id),
                  savedTracks: true,
                  savedTrackIds: data.savedTracks.map(item => item.track.id), // Seleziona tutti i brani individualmente
                  followedArtists: true,
                  followedArtistIds: data.followedArtists.map(artist => artist.id) // Seleziona tutti gli artisti individualmente
                }));
                addLog('Selezionati tutti gli elementi disponibili');
              }
            }}
          >
            {selected.playlists.length === data.playlists.length && 
             selected.savedTracks && 
             selected.followedArtists
              ? 'Deseleziona Tutto' 
              : 'Seleziona Tutto'}
          </Button>
        </Box>
        
        <Box> {/* Box vuoto per mantenere lo spazio tra gli elementi */}
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Playlists */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper 
            elevation={3} 
            sx={{
              p: 3, 
              height: '100%',
              cursor: 'pointer',
              ...getCardStyle(selected.playlists.length > 0)
            }}
            onClick={() => handleToggleAll('playlists')}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Playlist ({data.playlists.length})</Typography>
              <Checkbox
                checked={selected.playlists.length === data.playlists.length && data.playlists.length > 0}
                indeterminate={selected.playlists.length > 0 && selected.playlists.length < data.playlists.length}
              />
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {data.playlists.map((playlist) => (
                <React.Fragment key={playlist.id}>
                  <ListItem dense>
                    <ListItemText 
                      primary={playlist.name} 
                      secondary={`${playlist.tracks.total} brani`} 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaylistToggle(playlist.id);
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Button 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpandPlaylist(playlist.id);
                        }}
                      >
                        {expandedPlaylists[playlist.id] ? 'Chiudi' : 'Espandi'}
                      </Button>
                      <Checkbox
                        edge="end"
                        checked={selected.playlists.includes(playlist.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaylistToggle(playlist.id);
                        }}
                      />
                    </Box>
                  </ListItem>
                  
                  {/* Menu espandibile con le tracce */}
                  {expandedPlaylists[playlist.id] && (
                    <Box sx={{ pl: 4, pr: 2, pb: 1 }}>
                      {playlist.loadedTracks ? (
                        playlist.loadedTracks.length > 0 ? (
                          <List dense disablePadding>
                            {playlist.loadedTracks.map((track) => (
                              <ListItem key={track.id} dense sx={{ py: 0.5 }}>
                                <ListItemText 
                                  primary={track.name} 
                                  secondary={track.artists.map(a => a.name).join(', ')}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                />
                                <Checkbox
                                  size="small"
                                  edge="end"
                                  checked={!selected.playlistTracks[playlist.id]?.includes(track.id)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTrackToggle(playlist.id, track.id);
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" sx={{ py: 1, textAlign: 'center' }}>
                            Nessuna traccia in questa playlist
                          </Typography>
                        )
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} />
                        </Box>
                      )}
                    </Box>
                  )}
                  <Divider />
                </React.Fragment>
              ))}
              {data.playlists.length === 0 && (
                <ListItem>
                  <ListItemText primary="Nessuna playlist trovata" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
        
        {/* Brani Preferiti */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper 
            elevation={3} 
            sx={{
              p: 3, 
              height: '100%',
              cursor: 'pointer',
              ...getCardStyle(selected.savedTracks)
            }}
            onClick={(e) => {
              // Evita che il click sull'intero Paper attivi toggleAll se espanso
              if (!selected.expandedTracks) {
                handleToggleAll('savedTracks');
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Brani Preferiti ({data.savedTracks.length})</Typography>
              <Checkbox
                checked={selected.savedTracks}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleAll('savedTracks');
                }}
              />
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Visualizzazione compatta quando non è espanso */}
            {!selected.expandedTracks ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1DB954' }}>
                  {data.savedTracks.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  brani da migrare
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  sx={{ mt: 2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(prev => ({ ...prev, expandedTracks: true }));
                  }}
                >
                  Mostra Brani
                </Button>
              </Box>
            ) : (
              <Box onClick={(e) => e.stopPropagation()}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Seleziona i brani da migrare
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(prev => ({ ...prev, expandedTracks: false }));
                    }}
                  >
                    Chiudi
                  </Button>
                </Box>
                
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {data.savedTracks.slice(0, pagination.savedTracks.page * pagination.savedTracks.perPage).map((item) => (
                    <ListItem key={item.track.id} dense>
                      <ListItemText 
                        primary={item.track.name} 
                        secondary={item.track.artists.map(a => a.name).join(', ')} 
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Checkbox
                        edge="end"
                        checked={selected.savedTrackIds.includes(item.track.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSavedTrackToggle(item.track.id);
                        }}
                      />
                    </ListItem>
                  ))}
                  {hasMore('savedTracks') && (
                    <Button
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        loadMore('savedTracks');
                      }}
                      disabled={loading}
                    >
                      {loading ? 'Caricamento...' : 'Carica altri brani'}
                    </Button>
                  )}
                </List>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Artisti Seguiti */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper 
            elevation={3} 
            sx={{
              p: 3, 
              height: '100%',
              cursor: 'pointer',
              ...getCardStyle(selected.followedArtists)
            }}
            onClick={(e) => {
              // Evita che il click sull'intero Paper attivi toggleAll se espanso
              if (!selected.expandedArtists) {
                handleToggleAll('followedArtists');
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Artisti Seguiti ({data.followedArtists.length})</Typography>
              <Checkbox
                checked={selected.followedArtists}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleAll('followedArtists');
                }}
              />
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Visualizzazione compatta quando non è espanso */}
            {!selected.expandedArtists ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1DB954' }}>
                  {data.followedArtists.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  artisti da migrare
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  sx={{ mt: 2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(prev => ({ ...prev, expandedArtists: true }));
                  }}
                >
                  Mostra Artisti
                </Button>
              </Box>
            ) : (
              <Box onClick={(e) => e.stopPropagation()}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Seleziona gli artisti da migrare
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(prev => ({ ...prev, expandedArtists: false }));
                    }}
                  >
                    Chiudi
                  </Button>
                </Box>
                
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {data.followedArtists.slice(0, pagination.followedArtists.page * pagination.followedArtists.perPage).map((artist) => (
                    <ListItem key={artist.id} dense>
                      <ListItemText 
                        primary={artist.name} 
                        secondary={artist.genres?.join(', ')} 
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Checkbox
                        edge="end"
                        checked={selected.followedArtistIds.includes(artist.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowedArtistToggle(artist.id);
                        }}
                      />
                    </ListItem>
                  ))}
                  {hasMore('followedArtists') && (
                    <Button
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        loadMore('followedArtists');
                      }}
                      disabled={loading}
                    >
                      {loading ? 'Caricamento...' : 'Carica altri artisti'}
                    </Button>
                  )}
                </List>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Amici Seguiti */}
        {data.followedUsers.length > 0 && (
          <Grid item xs={12} md={6} lg={4}>
            <Paper 
              elevation={3} 
              sx={{
                p: 3, 
                height: '100%',
                cursor: 'pointer',
                ...getCardStyle(selected.followedUsers)
              }}
              onClick={() => handleToggleAll('followedUsers')}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Amici Seguiti</Typography>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1DB954' }}>
                  {data.followedUsers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  amici da migrare
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={handleProceed}
          disabled={
            selected.playlists.length === 0 && 
            !selected.savedTracks && 
            selected.savedTrackIds.length === 0 && 
            !selected.followedArtists && 
            selected.followedArtistIds.length === 0 && 
            !selected.followedUsers
          }
        >
          Inizia Migrazione
        </Button>
      </Box>
    </Container>
  );
};

export default Preview;