import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccount, useSignMessage, useConnect } from 'wagmi';
import { SiweMessage } from 'siwe';
import '../styles/Auth.css';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { connect, connectors } = useConnect();

  const handleWalletLogin = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Step 1: Connect wallet if not connected
      if (!isConnected) {
        await connect({ connector: connectors[0] });
        return; // Wait for connection, then user clicks again
      }

      if (!address) {
        throw new Error('No wallet address found');
      }

      // Step 2: Get nonce from backend
      const nonceResponse = await fetch('http://localhost:5001/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });

      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce } = await nonceResponse.json();

      // Step 3: Create SIWE message
      const domain = 'localhost';

      const siweParams = {
        domain: domain,
        address: address,
        statement: 'Sign in to SecureTickets with your wallet',
        uri: window.location.origin,
        version: '1',
        chainId: chainId || 1,
        nonce: nonce,
        issuedAt: new Date().toISOString()
      };

      console.log('SIWE Params:', siweParams);

      const message = new SiweMessage(siweParams);

      const messageString = message.prepareMessage();
      console.log('SIWE Message to sign:', messageString);

      // Step 4: Sign message with wallet
      const signature = await signMessageAsync({ message: messageString });

      // Step 5: Verify signature with backend
      const verifyResponse = await fetch('http://localhost:5001/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageString,
          signature: signature
        })
      });

      if (!verifyResponse.ok) {
        throw new Error('Signature verification failed');
      }

      const { token, user } = await verifyResponse.json();

      // Step 6: Login with token
      login({ ...user, token });

      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in with your wallet to access SecureTickets</p>
        </div>

        <div className="auth-form">
          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '20px',
              backgroundColor: '#fee',
              color: '#c00',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            className="google-btn"
            onClick={handleWalletLogin}
            disabled={isLoading}
          >
            <span style={{ fontSize: '24px', marginRight: '8px' }}>🦊</span>
            {isLoading
              ? 'Signing in...'
              : isConnected
                ? `Sign Message (${address?.slice(0, 6)}...${address?.slice(-4)})`
                : 'Connect Wallet to Sign In'}
          </button>

          <div className="wallet-info" style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#666'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>
              How it works:
            </p>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Click "Connect Wallet" to connect your MetaMask</li>
              <li>Sign a message to prove wallet ownership</li>
              <li>You'll be logged in and stay connected</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
