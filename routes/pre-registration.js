const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// File per memorizzare le richieste di accesso
const PENDING_USERS_FILE = path.join(__dirname, '../data/pending-users.json');
const APPROVED_USERS_FILE = path.join(__dirname, '../data/approved-users.json');

// Assicurati che la cartella data esista
const ensureDataDir = async () => {
  const dataDir = path.join(__dirname, '../data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// Carica lista utenti da file
const loadUsers = async (filePath) => {
  try {
    await ensureDataDir();
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Salva lista utenti su file
const saveUsers = async (filePath, users) => {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(users, null, 2));
};

// Calcola tempo di attesa stimato
const calculateEstimatedWait = async () => {
  const pendingUsers = await loadUsers(PENDING_USERS_FILE);
  const queuePosition = pendingUsers.length;
  
  // Assumendo che processiamo 10-20 utenti al giorno
  const processingRate = 15; // utenti per giorno
  const daysToWait = Math.ceil(queuePosition / processingRate);
  
  if (daysToWait <= 0) return '2-4 hours';
  if (daysToWait === 1) return '24 hours';
  if (daysToWait <= 2) return '1-2 days';
  if (daysToWait <= 7) return `${daysToWait} days`;
  return '1-2 weeks';
};

// Submit pre-registration request
router.post('/pre-register', async (req, res) => {
  try {
    const { email, reason } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid email address is required' 
      });
    }

    // Controlla se l'utente è già approvato
    const approvedUsers = await loadUsers(APPROVED_USERS_FILE);
    if (approvedUsers.some(user => user.email.toLowerCase() === email.toLowerCase())) {
      return res.json({
        success: true,
        message: 'You already have access! You can start using the service.',
        status: 'approved'
      });
    }

    // Controlla se l'utente è già in lista d'attesa
    const pendingUsers = await loadUsers(PENDING_USERS_FILE);
    const existingUser = pendingUsers.find(user => 
      user.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      const estimatedWait = await calculateEstimatedWait();
      return res.json({
        success: true,
        message: 'You are already in the waiting list.',
        estimatedWait,
        submittedAt: existingUser.submittedAt
      });
    }

    // Aggiungi nuovo utente alla lista d'attesa
    const newUser = {
      email: email.toLowerCase(),
      reason: reason || '',
      submittedAt: new Date().toISOString(),
      status: 'pending',
      ipAddress: req.ip || req.connection.remoteAddress
    };

    pendingUsers.push(newUser);
    await saveUsers(PENDING_USERS_FILE, pendingUsers);

    const estimatedWait = await calculateEstimatedWait();

    // Log per amministratore
    console.log(`New pre-registration: ${email} (Queue position: ${pendingUsers.length})`);

    res.json({
      success: true,
      message: 'Successfully added to waiting list!',
      estimatedWait,
      queuePosition: pendingUsers.length
    });

  } catch (error) {
    console.error('Error in pre-registration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error. Please try again.' 
    });
  }
});

// Check if user has access
router.get('/check-access', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Controlla se l'utente è approvato
    const approvedUsers = await loadUsers(APPROVED_USERS_FILE);
    const hasAccess = approvedUsers.some(user => 
      user.email.toLowerCase() === email.toLowerCase()
    );

    if (hasAccess) {
      return res.json({
        success: true,
        hasAccess: true,
        message: 'You have access! You can start using the service.'
      });
    }

    // Controlla se è in lista d'attesa
    const pendingUsers = await loadUsers(PENDING_USERS_FILE);
    const pendingUser = pendingUsers.find(user => 
      user.email.toLowerCase() === email.toLowerCase()
    );

    if (pendingUser) {
      const estimatedWait = await calculateEstimatedWait();
      return res.json({
        success: true,
        hasAccess: false,
        status: 'pending',
        estimatedWait,
        submittedAt: pendingUser.submittedAt
      });
    }

    // Utente non trovato
    res.json({
      success: true,
      hasAccess: false,
      status: 'not_registered',
      message: 'Please submit your email first.'
    });

  } catch (error) {
    console.error('Error checking access:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error. Please try again.' 
    });
  }
});

// Admin route: Get all pending users
router.get('/admin/pending', async (req, res) => {
  try {
    // Semplice autenticazione admin (in produzione usa JWT o session)
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pendingUsers = await loadUsers(PENDING_USERS_FILE);
    const approvedUsers = await loadUsers(APPROVED_USERS_FILE);

    res.json({
      pending: pendingUsers,
      approved: approvedUsers.length,
      totalRequests: pendingUsers.length + approvedUsers.length
    });

  } catch (error) {
    console.error('Error getting pending users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin route: Approve user
router.post('/admin/approve', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email } = req.body;
    
    // Rimuovi da pending
    const pendingUsers = await loadUsers(PENDING_USERS_FILE);
    const userIndex = pendingUsers.findIndex(user => 
      user.email.toLowerCase() === email.toLowerCase()
    );

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found in pending list' });
    }

    const user = pendingUsers[userIndex];
    pendingUsers.splice(userIndex, 1);
    await saveUsers(PENDING_USERS_FILE, pendingUsers);

    // Aggiungi ad approved
    const approvedUsers = await loadUsers(APPROVED_USERS_FILE);
    approvedUsers.push({
      ...user,
      approvedAt: new Date().toISOString(),
      status: 'approved'
    });
    await saveUsers(APPROVED_USERS_FILE, approvedUsers);

    console.log(`User approved: ${email}`);

    res.json({
      success: true,
      message: `User ${email} approved successfully`
    });

  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin route: Get statistics
router.get('/admin/stats', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pendingUsers = await loadUsers(PENDING_USERS_FILE);
    const approvedUsers = await loadUsers(APPROVED_USERS_FILE);

    // Statistiche temporali
    const today = new Date();
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentRequests = pendingUsers.filter(user => 
      new Date(user.submittedAt) > last7Days
    ).length;

    const recentApprovals = approvedUsers.filter(user => 
      user.approvedAt && new Date(user.approvedAt) > last7Days
    ).length;

    res.json({
      totalPending: pendingUsers.length,
      totalApproved: approvedUsers.length,
      recentRequests: recentRequests,
      recentApprovals: recentApprovals,
      estimatedWait: await calculateEstimatedWait(),
      pendingQueue: pendingUsers.slice(0, 10) // Prime 10 richieste
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 