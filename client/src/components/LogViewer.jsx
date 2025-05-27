import React, { useState } from 'react';
import { Box, Typography, Paper, Button, Chip, IconButton, Tooltip, Badge } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import SuccessIcon from '@mui/icons-material/CheckCircle';

const LogViewer = ({ logs = [], title = "Operation Logs", maxHeight = '200px', showControls = true }) => {
  const [filter, setFilter] = useState('all');
  
  // Filtra i log in base al tipo selezionato
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.type === filter);
  
  // Funzione per esportare i log come file di testo
  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Funzione per ottenere l'icona in base al tipo di log
  const getLogIcon = (type) => {
    switch(type) {
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'warning':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'success':
        return <SuccessIcon fontSize="small" color="success" />;
      case 'info':
      default:
        return <InfoIcon fontSize="small" color="info" />;
    }
  };
  
  return (
    <Paper elevation={2} sx={{ mt: 2, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          {title} {logs.length > 0 && `(${filteredLogs.length})`}
        </Typography>
        
        {showControls && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label="All" 
              variant={filter === 'all' ? 'filled' : 'outlined'}
              onClick={() => setFilter('all')}
              size="small"
            />
            <Chip 
              label="Info" 
              color="info" 
              variant={filter === 'info' ? 'filled' : 'outlined'}
              onClick={() => setFilter('info')}
              size="small"
            />
            <Chip 
              label="Error" 
              color="error" 
              variant={filter === 'error' ? 'filled' : 'outlined'}
              onClick={() => setFilter('error')}
              size="small"
            />
            <Chip 
              label="Warning" 
              color="warning" 
              variant={filter === 'warning' ? 'filled' : 'outlined'}
              onClick={() => setFilter('warning')}
              size="small"
            />
            <Chip 
              label="Success" 
              color="success" 
              variant={filter === 'success' ? 'filled' : 'outlined'}
              onClick={() => setFilter('success')}
              size="small"
            />
            <Tooltip title="Esporta log">
              <IconButton size="small" onClick={exportLogs}>
                <SaveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
      
      <Box sx={{ maxHeight, overflowY: 'auto', mt: 1 }}>
        {filteredLogs.length > 0 ? (
          <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {filteredLogs.map((log, index) => (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  mb: 0.5,
                  p: 0.5,
                  borderRadius: 1,
                  bgcolor: log.type === 'error' ? 'error.main' : 
                           log.type === 'warning' ? 'warning.main' : 
                           log.type === 'success' ? 'success.main' : 
                           'transparent',
                  color: log.type === 'error' || log.type === 'warning' || log.type === 'success' ? 'white' : 'inherit',
                  opacity: 0.9
                }}
              >
                <Box sx={{ mr: 1, mt: 0.3 }}>{getLogIcon(log.type)}</Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </Typography>
                  <Typography variant="body2">
                    {log.message}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
            Nessun log da visualizzare
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default LogViewer;