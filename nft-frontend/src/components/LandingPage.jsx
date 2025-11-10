import React from "react";
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">🎫</div>
          SecureTickets
        </div>
        
        <nav className="nav">
          <a href="#about" className="nav-link">About</a>
          <a href="#services" className="nav-link">Services</a>
          <a href="#why-us" className="nav-link">Why Us</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </nav>
        
        <div className="auth-buttons">
          {user ? (
            <div className="user-menu">
              <span className="user-name">Hello, {user.name}</span>
              <Link to="/home" className="home-btn">Dashboard</Link>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          ) : (
            <>
              <Link to="/login" className="login-btn">Login</Link>
              <Link to="/signup" className="signup-btn">Sign Up</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="hero-section">
        <div className="hero-badge">
          The Future of Event Ticketing
        </div>
        
        <h1 className="hero-title">
          Secure Tickets. Zero Black Market. True Ownership.
        </h1>
        
        <p className="hero-subtitle">
          Buy and sell event tickets safely — non-transferable outside our 
          platform, verified with blockchain technology, ensuring authentic 
          attendance and fair pricing.
        </p>
        
        <div className="hero-buttons">
          <Link to="/home" className="primary-btn">
            Book Your Shows
          </Link>
          <Link to="/marketplace" className="secondary-btn">
            Marketplace
          </Link>
          <Link to="/home" className="gradient-btn">
            Host Your Event
          </Link>
        </div>
        
        {/* Stats Section */}
        <div className="stats-section">
          <div className="stat-item">
            <div className="stat-number">100%</div>
            <div className="stat-label">Verified Users</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">0%</div>
            <div className="stat-label">Black Market Sales</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Customer Support</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
