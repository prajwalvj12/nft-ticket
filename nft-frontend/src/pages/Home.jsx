import React from 'react';
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Welcome to SecureTickets, {user?.name || 'User'}!</h1>
        <p>Connect your wallet and start exploring events</p>
      </div>
      
      <div className="wallet-section">
        <ConnectButton />
      </div>
      
      <div className="features-section">
        <h2>What would you like to do?</h2>
        <div className="feature-cards">
          <Link to="/mint-tickets" className="feature-card">
            <h3>🎫 Mint Tickets</h3>
            <p>Create NFT tickets for your events</p>
          </Link>
          <Link to="/browse-events" className="feature-card">
            <h3>🎪 Browse Events</h3>
            <p>Discover and purchase event tickets</p>
          </Link>
          <Link to="/verify-tickets" className="feature-card">
            <h3>✅ Verify Tickets</h3>
            <p>Validate ticket authenticity</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
