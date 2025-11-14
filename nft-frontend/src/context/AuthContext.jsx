import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);
  const { address } = useAccount();

  useEffect(() => {
    // Check if user is already logged in (verify token with backend)
    const verifyToken = async () => {
      const savedToken = localStorage.getItem('authToken');

      if (savedToken) {
        try {
          const response = await fetch('http://localhost:5001/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setToken(savedToken);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
      }

      setIsLoading(false);
    };

    verifyToken();
  }, []);

  // Auto-detect wallet account switch
  useEffect(() => {
    console.log('🔍 Checking wallet change - Current address:', address);
    console.log('🔍 Logged in user:', user);

    if (user && address) {
      // Compare current connected wallet with logged-in user's wallet
      const currentWallet = address.toLowerCase();
      const loggedInWallet = user.walletAddress?.toLowerCase();

      console.log('🔍 Current wallet:', currentWallet);
      console.log('🔍 Logged in wallet:', loggedInWallet);

      if (loggedInWallet && currentWallet !== loggedInWallet) {
        console.log('⚠️ Wallet account changed - auto-logging out');

        // Clear auth state
        setUser(null);
        setToken(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        // Show alert and redirect
        alert('Wallet account changed! Please login with the new account.');
        window.location.href = '/';
      }
    }
  }, [address]);

  const login = (userData) => {
    setUser(userData);
    setToken(userData.token);
    localStorage.setItem('authToken', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true };
      } else {
        return { success: false, error: 'Failed to update profile' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    login,
    logout,
    updateProfile,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
