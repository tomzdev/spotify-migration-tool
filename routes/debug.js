const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);

// Endpoint per recuperare i log di debug
router.get('/logs', async (req, res) => {
  try {
    // Leggi i file di log
    const errorLogPath = path.join(__dirname, '..', 'error.log');
    const combinedLogPath = path.join(__dirname, '..', 'combined.log');
    
    // Leggi gli ultimi 50 log
    const errorLogContent = await readFileAsync(errorLogPath, 'utf8');
    const combinedLogContent = await readFileAsync(combinedLogPath, 'utf8');
    
    // Converti i log in formato JSON
    const errorLogs = errorLogContent
      .split('\n')
      .filter(line => line.trim())
      .slice(-50)
      .map(line => {
        try {
          const logObj = JSON.parse(line);
          return {
            timestamp: new Date(logObj.timestamp),
            message: logObj.message,
            type: 'error'
          };
        } catch (e) {
          return {
            timestamp: new Date(),
            message: line,
            type: 'error'
          };
        }
      });
    
    const combinedLogs = combinedLogContent
      .split('\n')
      .filter(line => line.trim())
      .slice(-50)
      .map(line => {
        try {
          const logObj = JSON.parse(line);
          return {
            timestamp: new Date(logObj.timestamp),
            message: logObj.message,
            type: logObj.level === 'error' ? 'error' : 'info'
          };
        } catch (e) {
          return {
            timestamp: new Date(),
            message: line,
            type: 'info'
          };
        }
      });
    
    // Combina i log e ordina per timestamp (più recenti prima)
    const allLogs = [...errorLogs, ...combinedLogs]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);
    
    res.json({ logs: allLogs });
  } catch (error) {
    console.error('Error retrieving logs:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve logs',
      logs: [
        { timestamp: new Date(), message: 'Errore nel recupero dei log dal server', type: 'error' },
        { timestamp: new Date(), message: error.message, type: 'error' }
      ]
    });
  }
});

// Endpoint per recuperare informazioni di debug sull'autenticazione
router.get('/auth-info', (req, res) => {
  try {
    // Recupera informazioni sulle variabili d'ambiente (senza esporre i secret)
    const envInfo = {
      SOURCE_CLIENT_ID: process.env.SOURCE_CLIENT_ID ? `${process.env.SOURCE_CLIENT_ID.substring(0, 5)}...` : 'Not set',
      SOURCE_REDIRECT_URI: process.env.SOURCE_REDIRECT_URI || 'Not set',
      SOURCE_CLIENT_SECRET_SET: process.env.SOURCE_CLIENT_SECRET ? 'Yes' : 'No',
      DEST_CLIENT_ID: process.env.DEST_CLIENT_ID ? `${process.env.DEST_CLIENT_ID.substring(0, 5)}...` : 'Not set',
      DEST_REDIRECT_URI: process.env.DEST_REDIRECT_URI || 'Not set',
      DEST_CLIENT_SECRET_SET: process.env.DEST_CLIENT_SECRET ? 'Yes' : 'No',
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '5000'
    };
    
    // Recupera informazioni sulla sessione (se disponibile)
    const sessionInfo = req.session ? {
      sourceUserSet: !!req.session.sourceUser,
      destUserSet: !!req.session.destUser,
      sourceTokensSet: !!req.session.sourceTokens,
      destTokensSet: !!req.session.destTokens
    } : { error: 'Session not available' };
    
    res.json({
      env: envInfo,
      session: sessionInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving auth info:', error);
    res.status(500).json({ error: 'Failed to retrieve auth info' });
  }
});

// Esporta il router
module.exports = router;