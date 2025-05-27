import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  People,
  PendingActions,
  CheckCircle,
  Schedule,
  Refresh,
  ContentCopy
} from '@mui/icons-material';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [adminKey, setAdminKey] = useState(localStorage.getItem('adminKey') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approvalDialog, setApprovalDialog] = useState({ open: false, user: null });

  useEffect(() => {
    if (adminKey) {
      loadData();
    }
  }, [adminKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carica statistiche
      const statsResponse = await fetch('/api/auth/admin/stats', {
        headers: { 'x-admin-key': adminKey }
      });
      
      if (statsResponse.status === 401) {
        setError('Invalid admin key');
        return;
      }
      
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Carica utenti in attesa
      const pendingResponse = await fetch('/api/auth/admin/pending', {
        headers: { 'x-admin-key': adminKey }
      });
      const pendingData = await pendingResponse.json();
      setPendingUsers(pendingData.pending || []);
      
      setError('');
    } catch (error) {
      setError('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminKeySubmit = () => {
    localStorage.setItem('adminKey', adminKey);
    loadData();
  };

  const approveUser = async (email) => {
    try {
      const response = await fetch('/api/auth/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (data.success) {
        // Rimuovi utente dalla lista pending
        setPendingUsers(prev => prev.filter(user => user.email !== email));
        // Aggiorna statistiche
        loadData();
        setApprovalDialog({ open: false, user: null });
      } else {
        setError(data.error || 'Error approving user');
      }
    } catch (error) {
      setError('Error approving user: ' + error.message);
    }
  };

  const copyEmailsToClipboard = () => {
    const emails = pendingUsers.slice(0, 25).map(user => user.email).join('\n');
    navigator.clipboard.writeText(emails);
    alert('First 25 emails copied to clipboard!');
  };

  if (!adminKey || error === 'Invalid admin key') {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Admin Access
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Admin Key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            margin="normal"
          />
          <Button
            fullWidth
            variant="contained"
            onClick={handleAdminKeySubmit}
            sx={{ mt: 2 }}
          >
            Access Dashboard
          </Button>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1">
          Admin Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PendingActions color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{stats.totalPending}</Typography>
                    <Typography color="text.secondary">Pending Users</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{stats.totalApproved}</Typography>
                    <Typography color="text.secondary">Approved Users</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <People color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{stats.recentRequests}</Typography>
                    <Typography color="text.secondary">This Week</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Schedule color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">{stats.estimatedWait}</Typography>
                    <Typography color="text.secondary">Est. Wait Time</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Pending Users ({pendingUsers.length})
          </Typography>
          {pendingUsers.length > 0 && (
            <Tooltip title="Copy first 25 emails for Spotify app">
              <Button
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={copyEmailsToClipboard}
                size="small"
              >
                Copy Emails (25)
              </Button>
            </Tooltip>
          )}
        </Box>

        {pendingUsers.length === 0 ? (
          <Alert severity="info">
            No pending users at the moment.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.map((user, index) => (
                  <TableRow key={user.email}>
                    <TableCell>
                      <Box>
                        {user.email}
                        {index < 25 && (
                          <Chip 
                            size="small" 
                            label={`#${index + 1}`} 
                            color="primary" 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(user.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.reason || 'No reason provided'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label="Pending" 
                        color="warning" 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => setApprovalDialog({ open: true, user })}
                      >
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Instructions:</strong>
        </Typography>
        <Typography variant="body2">
          1. Copy the first 25 emails using the "Copy Emails" button
        </Typography>
        <Typography variant="body2">
          2. Go to Spotify Developer Dashboard and add these emails to your app
        </Typography>
        <Typography variant="body2">
          3. Come back and approve the users one by one
        </Typography>
      </Alert>

      {/* Approval Confirmation Dialog */}
      <Dialog
        open={approvalDialog.open}
        onClose={() => setApprovalDialog({ open: false, user: null })}
      >
        <DialogTitle>Approve User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve access for{' '}
            <strong>{approvalDialog.user?.email}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Make sure you have already added this email to your Spotify app in the Developer Dashboard.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog({ open: false, user: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => approveUser(approvalDialog.user?.email)}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Container>
  );
};

export default AdminDashboard; 