import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Chip, Menu, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { logout, logoutSource, logoutDestination } from '../services/authService';
import { toast } from 'react-toastify';

const Header = ({ authStatus }) => {
  const navigate = useNavigate();
  const { sourceAuthenticated, destAuthenticated, sourceUser, destUser } = authStatus;
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutSource = async () => {
    try {
      await logoutSource();
      window.location.href = '/';
    } catch (error) {
      toast.error('Error during source account logout');
      console.error('Source logout error:', error);
    }
    handleMenuClose();
  };

  const handleLogoutDestination = async () => {
    try {
      await logoutDestination();
      window.location.href = '/';
    } catch (error) {
      toast.error('Error during destination account logout');
      console.error('Destination logout error:', error);
    }
    handleMenuClose();
  };

  const handleLogoutBoth = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      toast.error('Error during logout');
      console.error('Logout error:', error);
    }
    handleMenuClose();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ flexGrow: 1, cursor: 'pointer' }} 
          onClick={() => navigate('/')}
        >
          Spotify Migration Tool
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {sourceAuthenticated && sourceUser && (
            <Chip
              avatar={<Avatar src={sourceUser.images?.[0]?.url} />}
              label={`Source: ${sourceUser.display_name}`}
              variant="outlined"
              sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
            />
          )}
          
          {destAuthenticated && destUser && (
            <Chip
              avatar={<Avatar src={destUser.images?.[0]?.url} />}
              label={`Destination: ${destUser.display_name}`}
              variant="outlined"
              sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
            />
          )}
          
          {(sourceAuthenticated || destAuthenticated) && (
            <>
              <Button 
                color="inherit" 
                onClick={handleMenuClick}
                aria-controls={open ? 'logout-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
              >
                Logout
              </Button>
              <Menu
                id="logout-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                MenuListProps={{
                  'aria-labelledby': 'logout-button',
                }}
              >
                {sourceAuthenticated && (
                  <MenuItem onClick={handleLogoutSource}>Logout Source Account</MenuItem>
                )}
                {destAuthenticated && (
                  <MenuItem onClick={handleLogoutDestination}>Logout Destination Account</MenuItem>
                )}
                {sourceAuthenticated && destAuthenticated && (
                  <MenuItem onClick={handleLogoutBoth}>Logout Both Accounts</MenuItem>
                )}
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;