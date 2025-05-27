import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Home from './pages/Home';
import AuthSource from './pages/AuthSource';
import AuthDestination from './pages/AuthDestination';
import Preview from './pages/Preview';
import Migration from './pages/Migration';
import Error from './pages/Error';

// Components
import Header from './components/Header';
import Footer from './components/Footer';

// Services
import { getAuthStatus } from './services/authService';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1DB954', // Spotify green
    },
    secondary: {
      main: '#191414', // Spotify black
    },
    background: {
      default: '#121212',
      paper: '#181818',
    },
  },
  typography: {
    fontFamily: '"Circular", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 30,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 20px',
        },
      },
    },
  },
});

function App() {
  const [authStatus, setAuthStatus] = useState({
    sourceAuthenticated: false,
    destAuthenticated: false,
    sourceUser: null,
    destUser: null,
    loading: true,
  });

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const status = await getAuthStatus();
        setAuthStatus({
          ...status,
          loading: false,
        });
      } catch (error) {
        console.error('Error checking auth status:', error);
        setAuthStatus(prev => ({ ...prev, loading: false }));
      }
    };

    checkAuthStatus();
  }, []);

  // Protected route component
  const ProtectedRoute = ({ children, requiredAuth, redirectTo }) => {
    if (authStatus.loading) {
      return <div>Loading...</div>;
    }

    if (!requiredAuth()) {
      return <Navigate to={redirectTo} replace />;
    }

    return children;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app-container">
        <Header authStatus={authStatus} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home authStatus={authStatus} />} />
            
            <Route path="/auth/source" element={<AuthSource />} />
            <Route path="/auth/destination" element={<AuthDestination />} />
            
            <Route 
              path="/preview" 
              element={
                <ProtectedRoute 
                  requiredAuth={() => authStatus.sourceAuthenticated && authStatus.destAuthenticated}
                  redirectTo="/"
                >
                  <Preview authStatus={authStatus} />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/migration" 
              element={
                <ProtectedRoute 
                  requiredAuth={() => authStatus.sourceAuthenticated && authStatus.destAuthenticated}
                  redirectTo="/"
                >
                  <Migration authStatus={authStatus} />
                </ProtectedRoute>
              } 
            />
            
            <Route path="/error" element={<Error />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <ToastContainer position="bottom-right" theme="dark" />
    </ThemeProvider>
  );
}

export default App;