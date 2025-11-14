import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from 'wagmi';
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from 'ethers';
import { Link, useNavigate } from 'react-router-dom';
import contractABI from '../EventTicketNFT-abi.json';
import contractAddress from '../EventTicketNFT-address.js';
import '../styles/Dashboard.css';

// Use the imported contract address
const CONTRACT_ADDRESS = contractAddress;
const MARKETPLACE_ADDRESS = '0x85B4a85c25BAa9a06146347c8C210379D3f410D5';

const MARKETPLACE_ABI = [
  "function listings(uint256) view returns (address seller, uint256 price, bool isActive)",
  "function getActiveListings() view returns (uint256[] memory)"
];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { address } = useAccount();
  const navigate = useNavigate();

  const [myTickets, setMyTickets] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('owned');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [stats, setStats] = useState({
    totalTickets: 0,
    totalSold: 0
  });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    console.log('Dashboard - Connected address:', address);
    console.log('Dashboard - Logged in user:', user);

    if (address) {
      console.log('Fetching tickets for address:', address);
      fetchUserTickets();
      // Only fetch listings if needed - disable for now due to checksum issue
      // fetchUserListings();
    } else {
      console.log('⚠️ No wallet connected');
      setIsLoading(false);
    }
  }, [address]);

  const fetchUserTickets = async () => {
    try {
      setIsLoading(true);
      console.log('🎫 Fetching tickets for wallet:', address);

      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      const ticketsData = [];

      // Search first 20 tokens to find user's tickets
      console.log('\n🔍 STARTING SEARCH...');
      console.log('📍 Contract Address:', CONTRACT_ADDRESS);
      console.log('🔗 RPC:', 'https://rpc-amoy.polygon.technology');
      console.log('👤 Your wallet address:', address);
      console.log('==========================================\n');

      for (let tokenId = 1; tokenId <= 20; tokenId++) {
        try {
          const owner = await contract.ownerOf(tokenId);

          const ownerLower = owner.toLowerCase();
          const addressLower = address.toLowerCase();
          const isMatch = ownerLower === addressLower;

          // Log ALL token ownerships with detailed comparison
          console.log(`\n--- Token #${tokenId} ---`);
          console.log(`Owner:    ${owner}`);
          console.log(`Owner LC: ${ownerLower}`);
          console.log(`Your:     ${address}`);
          console.log(`Your LC:  ${addressLower}`);
          console.log(`Match:    ${isMatch ? '✅ YES - THIS IS YOURS!' : '❌ NO'}`);

          if (isMatch) {
            console.log(`\n🎫🎫🎫 FOUND YOUR TICKET #${tokenId}! 🎫🎫🎫\n`);

            // Get ticket and event details
            const ticket = await contract.tickets(tokenId);
            const event = await contract.events(ticket.eventId);

            // Fetch metadata to get QR code
            let qrCode = null;
            try {
              const tokenURI = await contract.tokenURI(tokenId);
              console.log(`📄 Token ${tokenId} URI:`, tokenURI);

              // Convert IPFS URI to HTTP gateway URL
              let metadataURL = tokenURI;
              if (tokenURI.startsWith('ipfs://')) {
                metadataURL = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
              }

              console.log(`🌐 Fetching metadata from:`, metadataURL);
              const response = await fetch(metadataURL);
              const metadata = await response.json();
              qrCode = metadata.image;
              console.log(`✅ QR code fetched for token ${tokenId}`);
            } catch (err) {
              console.log(`⚠️ Could not fetch QR for token ${tokenId}:`, err.message);
            }

            ticketsData.push({
              tokenId: Number(tokenId),
              eventId: Number(ticket.eventId),
              eventName: event.name,
              eventDate: new Date(Number(event.eventDate) * 1000),
              isUsed: ticket.isUsed,
              qrCode: qrCode
            });
          }
        } catch (err) {
          // Token doesn't exist or error fetching
          console.log(`--- Token #${tokenId} ---`);
          console.log(`❌ Error: ${err.message || 'Token does not exist'}`);
          continue;
        }
      }

      console.log('\n==========================================');
      console.log('📊 SEARCH COMPLETE!');
      console.log(`✅ Total tickets found for ${address}: ${ticketsData.length}`);
      console.log('==========================================\n');

      console.log('✅ Found tickets:', ticketsData);
      setMyTickets(ticketsData);
      setStats(prev => ({ ...prev, totalTickets: ticketsData.length }));
    } catch (error) {
      console.error('❌ Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserListings = async () => {
    try {
      console.log('🏪 Fetching marketplace listings...');
      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');

      // Checksum the addresses before using
      const marketplaceAddr = ethers.getAddress(MARKETPLACE_ADDRESS);
      const contractAddr = ethers.getAddress(CONTRACT_ADDRESS);

      const marketplaceContract = new ethers.Contract(marketplaceAddr, MARKETPLACE_ABI, provider);
      const ticketContract = new ethers.Contract(contractAddr, contractABI, provider);

      const activeListings = await marketplaceContract.getActiveListings();
      console.log('Active listings:', activeListings);

      const userListings = [];

      for (const tokenId of activeListings) {
        try {
          const listing = await marketplaceContract.listings(tokenId);

          if (listing.seller.toLowerCase() === address.toLowerCase() && listing.isActive) {
            const ticket = await ticketContract.tickets(tokenId);
            const event = await ticketContract.events(ticket.eventId);

            userListings.push({
              tokenId: Number(tokenId),
              price: ethers.formatEther(listing.price),
              eventName: event.name,
              eventDate: new Date(Number(event.eventDate) * 1000)
            });
          }
        } catch (err) {
          console.log(`⚠️ Error fetching listing for token ${tokenId}:`, err.message);
        }
      }

      console.log('✅ Found listings:', userListings);
      setMyListings(userListings);
      setStats(prev => ({ ...prev, totalSold: userListings.length }));
    } catch (error) {
      console.error('❌ Error fetching listings:', error);
      // Don't fail completely if marketplace fetch fails
      setMyListings([]);
    }
  };

  const fetchTicketDetails = async (ticket) => {
    setIsLoadingDetails(true);
    setShowDetailsModal(true);
    try {
      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      console.log(`🔍 Fetching details for ticket ID: ${ticket.tokenId}`);

      // Get full ticket and event details
      const ticketData = await contract.tickets(ticket.tokenId);
      const eventData = await contract.events(ticketData.eventId);
      const owner = await contract.ownerOf(ticket.tokenId);

      const details = {
        tokenId: ticket.tokenId,
        eventId: Number(ticketData.eventId),
        eventName: eventData.name,
        eventDateTime: new Date(Number(eventData.eventDate) * 1000).toLocaleString(),
        venue: 'N/A', // Venue not stored in contract
        owner: owner,
        isUsed: ticketData.isUsed,
        isValid: !ticketData.isUsed && eventData.isActive,
        mintedAt: new Date(Number(ticketData.mintedAt) * 1000).toLocaleString(),
        qrCode: ticket.qrCode
      };

      console.log('✅ Ticket details fetched:', details);
      setTicketDetails(details);
    } catch (error) {
      console.error('❌ Error fetching ticket details:', error);
      alert('Failed to fetch ticket details');
      setShowDetailsModal(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setTicketDetails(null);
    setSelectedTicket(null);
  };

  const downloadQR = (qrCode, tokenId) => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `ticket-${tokenId}-qr.png`;
    link.click();
  };

  const maskAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <Link to="/">
            <span className="brand-icon">🎫</span>
            <span className="brand-name">SecureTickets</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-item active">
            <span className="nav-icon">📊</span>
            <span className="nav-label">Overview</span>
          </div>
          <Link to="/marketplace" className="nav-item">
            <span className="nav-icon">🏪</span>
            <span className="nav-label">Market</span>
          </Link>
          <Link to="/browse-events" className="nav-item">
            <span className="nav-icon">🎪</span>
            <span className="nav-label">Events</span>
          </Link>
          <Link to="/verify-tickets" className="nav-item">
            <span className="nav-icon">✅</span>
            <span className="nav-label">Verify</span>
          </Link>
          <Link to="/mint-tickets" className="nav-item">
            <span className="nav-icon">➕</span>
            <span className="nav-label">Create</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => navigate('/')} className="sidebar-home-btn">
            ← Back to Home
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Bar */}
        <header className="dashboard-header">
          <h1 className="page-title">Overview</h1>

          {/* Profile Section */}
          <div className="header-profile">
            <div
              className="profile-trigger"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="profile-avatar-small">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="profile-info-compact">
                <div className="profile-name">{user?.name || (address ? maskAddress(address) : 'User')}</div>
                <div className="profile-address">{address ? maskAddress(address) : 'Not connected'}</div>
              </div>
              <div className="profile-stats-compact">
                <div className="stat-compact">
                  <span className="stat-number-small">{stats.totalTickets}</span>
                  <span className="stat-label-small">Owned</span>
                </div>
                <div className="stat-compact">
                  <span className="stat-number-small">{stats.totalSold}</span>
                  <span className="stat-label-small">Listed</span>
                </div>
              </div>
            </div>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <Link to="/dashboard" className="dropdown-item">Profile</Link>
                <button onClick={logout} className="dropdown-item logout-item">
                  Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Activity Tabs */}
        <div className="activity-tabs">
          <button
            className={`tab ${activeTab === 'owned' ? 'active' : ''}`}
            onClick={() => setActiveTab('owned')}
          >
            Owned ({myTickets.length})
          </button>
          <button
            className={`tab ${activeTab === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveTab('listings')}
          >
            Listings ({myListings.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="dashboard-content">
          {activeTab === 'owned' && (
            <section className="section-owned">
              <div className="section-header">
                <h2 className="section-title">My Tickets</h2>
                {myTickets.length > 0 && (
                  <div className="section-actions">
                    <span className="results-count">{myTickets.length} tickets</span>
                  </div>
                )}
              </div>

              {!address ? (
                <div className="empty-state">
                  <div className="empty-icon">🦊</div>
                  <h3>Connect Your Wallet</h3>
                  <p>Please connect your MetaMask wallet to view your tickets</p>
                  <div style={{ marginTop: '20px' }}>
                    <ConnectButton />
                  </div>
                </div>
              ) : isLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading your tickets...</p>
                </div>
              ) : myTickets.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎫</div>
                  <h3>No tickets yet</h3>
                  <p>Start by browsing upcoming events</p>
                  <Link to="/browse-events" className="cta-btn">Browse Events</Link>
                </div>
              ) : (
                <div className="cards-scroll">
                  {myTickets.map((ticket) => (
                    <div key={ticket.tokenId} className="nft-card">
                      {ticket.qrCode && (
                        <div className="card-image">
                          <img src={ticket.qrCode} alt={ticket.eventName} />
                          <div className="card-badge">
                            <span className={`badge ${ticket.isUsed ? 'used' : 'active'}`}>
                              {ticket.isUsed ? 'Used' : 'Active'}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="card-content">
                        <h3 className="card-title">{ticket.eventName}</h3>
                        <div className="card-meta">
                          <span className="meta-item">#{ticket.tokenId}</span>
                          <span className="meta-divider">•</span>
                          <span className="meta-item">{ticket.eventDate.toLocaleDateString()}</span>
                        </div>

                        <div className="card-actions">
                          <button
                            onClick={() => fetchTicketDetails(ticket)}
                            className="card-btn primary"
                          >
                            View Details
                          </button>
                          {ticket.qrCode && (
                            <button
                              onClick={() => downloadQR(ticket.qrCode, ticket.tokenId)}
                              className="card-btn secondary"
                            >
                              Download QR
                            </button>
                          )}
                          {!ticket.isUsed && (
                            <Link
                              to={`/marketplace?listToken=${ticket.tokenId}`}
                              className="card-btn tertiary"
                            >
                              List for Sale
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'listings' && (
            <section className="section-listings">
              <div className="section-header">
                <h2 className="section-title">Marketplace Listings</h2>
                {myListings.length > 0 && (
                  <div className="section-actions">
                    <span className="results-count">{myListings.length} active</span>
                  </div>
                )}
              </div>

              {myListings.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏪</div>
                  <h3>No active listings</h3>
                  <p>List your tickets on the marketplace</p>
                </div>
              ) : (
                <div className="cards-scroll">
                  {myListings.map((listing) => (
                    <div key={listing.tokenId} className="nft-card">
                      <div className="card-content">
                        <h3 className="card-title">{listing.eventName}</h3>
                        <div className="card-price">{listing.price} POL</div>
                        <div className="card-meta">
                          <span className="meta-item">#{listing.tokenId}</span>
                          <span className="meta-divider">•</span>
                          <span className="meta-item">{listing.eventDate.toLocaleDateString()}</span>
                        </div>

                        <div className="card-actions">
                          <Link to="/marketplace" className="card-btn primary">
                            View in Market
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Ticket Details Modal */}
      {showDetailsModal && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetailsModal}>✕</button>

            {isLoadingDetails ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading ticket details...</p>
              </div>
            ) : ticketDetails ? (
              <>
                <div className="modal-header">
                  <h2 className="modal-title">
                    {ticketDetails.isValid ? '✅ Valid Ticket' : '❌ Invalid/Used Ticket'}
                  </h2>
                </div>

                {ticketDetails.qrCode && (
                  <div className="modal-qr">
                    <img src={ticketDetails.qrCode} alt="Ticket QR Code" />
                  </div>
                )}

                <div className="modal-details">
                  <div className="detail-row">
                    <span className="detail-label">Token ID:</span>
                    <span className="detail-value">#{ticketDetails.tokenId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Event:</span>
                    <span className="detail-value">{ticketDetails.eventName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Date & Time:</span>
                    <span className="detail-value">{ticketDetails.eventDateTime}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Venue:</span>
                    <span className="detail-value">{ticketDetails.venue}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Owner:</span>
                    <span className="detail-value">{maskAddress(ticketDetails.owner)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value status-badge ${ticketDetails.isUsed ? 'used' : 'unused'}`}>
                      {ticketDetails.isUsed ? 'Used' : 'Unused'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Minted:</span>
                    <span className="detail-value">{ticketDetails.mintedAt}</span>
                  </div>
                </div>

                {ticketDetails.qrCode && (
                  <button
                    onClick={() => downloadQR(ticketDetails.qrCode, ticketDetails.tokenId)}
                    className="modal-btn secondary"
                  >
                    Download QR Code
                  </button>
                )}
              </>
            ) : (
              <p>Failed to load ticket details</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
