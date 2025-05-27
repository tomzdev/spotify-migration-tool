import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip
} from '@mui/material';
import { CheckCircle, Schedule, Person } from '@mui/icons-material';

const PreRegistration = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(''); // 'pending', 'approved', 'error'
  const [message, setMessage] = useState('');
  const [estimatedWait, setEstimatedWait] = useState('');

  const handleSubmitEmail = async () => {
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    try {
      const response = await fetch('/api/auth/pre-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('pending');
        setMessage('Email submitted successfully! You will receive access within 24-48 hours.');
        setEstimatedWait(data.estimatedWait || '24-48 hours');
      } else {
        setStatus('error');
        setMessage(data.error || 'Error submitting email. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  const checkAccessStatus = async () => {
    try {
      const response = await fetch(`/api/auth/check-access?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (data.hasAccess) {
        setStatus('approved');
        setMessage('Great! You now have access. You can start using the migration tool.');
      } else {
        setStatus('pending');
        setMessage('Your access is still being processed. Please wait a bit longer.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Error checking access status.');
    }
  };

  const steps = [
    {
      label: 'Submit your Spotify email',
      description: 'We need to add you to our Spotify app whitelist',
      completed: status === 'pending' || status === 'approved'
    },
    {
      label: 'Wait for approval (24-48h)',
      description: 'We manually add you to the Spotify app',
      completed: status === 'approved'
    },
    {
      label: 'Start migrating!',
      description: 'You can now use the full migration tool',
      completed: status === 'approved'
    }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 6, borderRadius: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Get Access to Spotify Migration Tool
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Due to Spotify's limitations, we need to manually add users. The process is quick and free!
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            <strong>Why is this needed?</strong> Spotify limits apps in development mode to 25 users. 
            We need to manually add your Spotify email to our app's whitelist before you can use the service.
          </Typography>
        </Alert>

        <Stepper orientation="vertical" sx={{ mb: 4 }}>
          {steps.map((step, index) => (
            <Step key={index} active={true} completed={step.completed}>
              <StepLabel 
                icon={step.completed ? <CheckCircle color="primary" /> : <Schedule />}
              >
                <Typography variant="h6">{step.label}</Typography>
              </StepLabel>
              <StepContent>
                <Typography color="text.secondary">{step.description}</Typography>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {status !== 'approved' && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Enter your Spotify email address:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'start' }}>
              <TextField
                fullWidth
                type="email"
                label="Spotify Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText="Use the same email associated with your Spotify account"
                variant="outlined"
              />
              <Button 
                variant="contained" 
                onClick={handleSubmitEmail}
                disabled={!email}
                sx={{ minWidth: 120, height: 56 }}
              >
                Submit
              </Button>
            </Box>
          </Box>
        )}

        {status && (
          <Alert 
            severity={status === 'error' ? 'error' : status === 'approved' ? 'success' : 'warning'}
            sx={{ mb: 3 }}
          >
            {message}
            {estimatedWait && (
              <Box sx={{ mt: 1 }}>
                <Chip 
                  icon={<Schedule />} 
                  label={`Estimated wait: ${estimatedWait}`} 
                  size="small" 
                  variant="outlined" 
                />
              </Box>
            )}
          </Alert>
        )}

        {status === 'pending' && (
          <Box sx={{ textAlign: 'center' }}>
            <Button variant="outlined" onClick={checkAccessStatus}>
              Check if I have access now
            </Button>
          </Box>
        )}

        {status === 'approved' && (
          <Box sx={{ textAlign: 'center' }}>
            <Button 
              variant="contained" 
              size="large"
              href="/auth/source"
              sx={{ px: 4, py: 1.5 }}
            >
              🎉 Start Migration Now!
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 6, p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            ⚡ Want instant access? Self-host your own instance!
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Skip the waiting time by hosting your own version. Takes 5 minutes and works for unlimited users.
          </Typography>
          <Button 
            variant="outlined" 
            href="https://github.com/tomzdev/spotify-migration-tool#-self-hosting-recommended"
            target="_blank"
          >
            📖 Self-Hosting Guide
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PreRegistration; 