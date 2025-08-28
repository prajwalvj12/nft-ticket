import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import '../styles/Pages.css';

const CONTRACT_ADDRESS = "0x19128bD3C0c9152E2ef74be4472A7A29A15836Ef";

const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "_eventId", "type": "uint256"}],
    "name": "getEventDetails",
    "outputs": [{
      "components": [
        {"internalType": "uint256", "name": "eventId", "type": "uint256"},
        {"internalType": "string", "name": "name", "type": "string"},
        {"internalType": "uint256", "name": "price", "type": "uint256"},
        {"internalType": "uint256", "name": "maxTickets", "type": "uint256"},
        {"internalType": "uint256", "name": "soldTickets", "type": "uint256"},
        {"internalType": "uint256", "name": "eventDate", "type": "uint256"},
        {"internalType": "bool", "name": "isActive", "type": "bool"},
        {"internalType": "address", "name": "organizer", "type": "address"}
      ],
      "internalType": "struct EventTicketNFT.Event",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_eventId", "type": "uint256"},
      {"internalType": "string", "name": "_tokenURI", "type": "string"}
    ],
    "name": "mintTicket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

export default function BrowseEvents() {
  const { address, isConnected } = useAccount();
  
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingEvent, setPurchasingEvent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch events from blockchain
  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📡 Fetching events from blockchain...');
      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const eventsData = [];
      
      // Check events 1-50
      for (let eventId = 1; eventId <= 50; eventId++) {
        try {
          const eventDetails = await contract.getEventDetails(eventId);
          
          if (eventDetails.name && eventDetails.name.length > 0) {
            eventsData.push({
              id: eventId,
              name: eventDetails.name,
              price: ethers.formatEther(eventDetails.price),
              maxTickets: Number(eventDetails.maxTickets),
              soldTickets: Number(eventDetails.soldTickets),
              eventDate: new Date(Number(eventDetails.eventDate) * 1000).toLocaleString(),
              isActive: eventDetails.isActive,
              organizer: eventDetails.organizer
            });
            console.log(`✅ Found event: ${eventDetails.name}`);
          }
        } catch (error) {
          // Event doesn't exist, continue
          continue;
        }
      }
      
      console.log(`📊 Total events found: ${eventsData.length}`);
      setEvents(eventsData);
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      setError('Failed to fetch events. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Purchase ticket function with comprehensive error handling
  const purchaseTicket = async (eventId, price) => {
    // Validation checks
    if (!window.ethereum) {
      alert('❌ MetaMask not detected.\n\nPlease install MetaMask to purchase tickets.');
      return;
    }

    if (!isConnected || !address) {
      alert('❌ Wallet not connected.\n\nPlease connect your wallet first.');
      return;
    }

    setPurchasingEvent(eventId);
    setError(null);
    
    try {
      console.log(`🎫 Starting purchase for Event ${eventId}, Price: ${price} MATIC`);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Check wallet balance
      const balance = await provider.getBalance(address);
      const balanceInMatic = ethers.formatEther(balance);
      
      if (parseFloat(balanceInMatic) < (parseFloat(price) + 0.01)) {
        alert(`❌ Insufficient MATIC balance.\n\nYou need: ${price} MATIC + gas fees\nYou have: ${parseFloat(balanceInMatic).toFixed(4)} MATIC\n\nGet test MATIC from Polygon faucet.`);
        return;
      }

      // Simple tokenURI (no complex metadata)
      const simpleTokenURI = `https://api.eventtickets.app/ticket/${eventId}-${Date.now()}`;
      
      console.log('💰 Wallet balance check passed');
      console.log('🔗 Token URI:', simpleTokenURI);

      // Execute transaction with optimized settings
      const txParams = {
        value: ethers.parseEther(price.toString())
       };

      console.log('⚡ Transaction parameters:', txParams);

      const tx = await contract.mintTicket(eventId, simpleTokenURI, txParams);

      console.log('📄 Transaction sent:', tx.hash);
      
      // Show transaction sent confirmation
      alert(`✅ Transaction sent successfully!\n\nHash: ${tx.hash}\n\nWaiting for blockchain confirmation...`);

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log('✅ Transaction confirmed:', receipt);
        
        // Extract token ID from transaction logs
        let tokenId = 'Unknown';
        try {
          const transferEvent = receipt.logs.find(log => 
            log.topics[0] === ethers.id("Transfer(address,address,uint256)")
          );
          if (transferEvent) {
            tokenId = parseInt(transferEvent.topics[3], 16);
          }
        } catch (e) {
          console.log('Could not extract token ID from logs');
        }
        
        alert(`🎉 Ticket purchased successfully!\n\n🎫 Token ID: ${tokenId}\n📄 Transaction: ${tx.hash}\n\n✅ Your NFT ticket has been created\n📱 Check your MetaMask wallet (NFTs section)\n\nNote: It may take a few minutes to appear in your wallet.`);
        
        // Refresh events to update sold tickets count
        fetchEvents();
      } else {
        throw new Error('Transaction failed on blockchain');
      }

    } catch (error) {
      console.error('❌ Purchase error:', error);
      
      let errorMessage = 'Unknown error occurred';
      
      // Parse different error types
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.code === 'INSUFFICIENT_FUNDS' || error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient MATIC balance for transaction and gas fees';
      } else if (error.code === -32603) {
        errorMessage = 'Network RPC error. Try switching MetaMask network or try again later.';
      } else if (error.message?.includes('gas')) {
        errorMessage = 'Gas estimation failed. The transaction would likely fail.';
      } else if (error.message?.includes('revert')) {
        // Parse common revert reasons
        if (error.message.includes('Event is not active')) {
          errorMessage = 'Event is not active for ticket sales';
        } else if (error.message.includes('Event is sold out')) {
          errorMessage = 'Event is sold out';
        } else if (error.message.includes('Already owns ticket')) {
          errorMessage = 'You already own a ticket for this event';
        } else if (error.message.includes('Event has already occurred')) {
          errorMessage = 'Event has already occurred';
        } else if (error.message.includes('Insufficient payment')) {
          errorMessage = 'Payment amount does not match ticket price';
        } else {
          errorMessage = 'Smart contract rejected the transaction';
        }
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message.length > 100 ? 
          error.message.substring(0, 100) + '...' : error.message;
      }
      
      alert(`❌ Purchase Failed\n\n${errorMessage}\n\n💡 Try:\n• Refreshing the page\n• Checking your MATIC balance\n• Switching MetaMask network\n• Contact support if issue persists`);
      
    } finally {
      setPurchasingEvent(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <Link to="/home" className="back-btn">← Back to Home</Link>
          <h1>🎪 Browse Events</h1>
        </div>
        <div className="loading-container" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          flexDirection: 'column'
        }}>
          <div className="spinner" style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '20px', color: '#666' }}>Loading events from blockchain...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <Link to="/home" className="back-btn">← Back to Home</Link>
          <h1>🎪 Browse Events</h1>
        </div>
        <div className="error-container" style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#dc2626' }}>❌ Error Loading Events</h3>
          <p style={{ color: '#7f1d1d' }}>{error}</p>
          <button 
            onClick={fetchEvents}
            style={{
              background: '#6366f1',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '15px'
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/home" className="back-btn">← Back to Home</Link>
        <h1>🎪 Browse Events</h1>
        <p>Discover and purchase event tickets as NFTs</p>
      </div>

      {/* Wallet Status */}
      <div style={{ 
        background: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
        border: isConnected ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        textAlign: 'center' 
      }}>
        <p>
          <strong>Wallet Status:</strong> {isConnected ? '✅ Connected' : '❌ Not Connected'}
          {isConnected && address && (
            <span> | {address.slice(0, 6)}...{address.slice(-4)}</span>
          )}
        </p>
        {!isConnected && (
          <p style={{ color: '#dc2626', fontSize: '14px', marginTop: '8px' }}>
            Connect your wallet to purchase tickets
          </p>
        )}
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="no-events" style={{
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px'
        }}>
          <h3>🎭 No Events Found</h3>
          <p>No events have been created yet.</p>
          <Link to="/mint-tickets" style={{
            background: '#6366f1',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            display: 'inline-block',
            marginTop: '15px'
          }}>
            ✨ Create First Event
          </Link>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <div key={event.id} className="event-card" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: '20px'
            }}>
              <div className="event-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <h3 style={{ margin: 0, color: 'white' }}>{event.name}</h3>
                <span className={`status ${event.isActive ? 'active' : 'inactive'}`} style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  background: event.isActive ? '#22c55e' : '#6b7280',
                  color: 'white'
                }}>
                  {event.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="event-details" style={{ marginBottom: '20px', color: '#e5e7eb' }}>
                <p><strong>🆔 Event ID:</strong> {event.id}</p>
                <p><strong>📅 Event Date:</strong> {event.eventDate}</p>
                <p><strong>💰 Price:</strong> {event.price} MATIC</p>
                <p><strong>🎫 Available:</strong> {event.maxTickets - event.soldTickets} / {event.maxTickets}</p>
                <p><strong>👤 Organizer:</strong> {event.organizer.slice(0, 6)}...{event.organizer.slice(-4)}</p>
              </div>

              {/* Purchase Button */}
              {event.isActive && (event.maxTickets - event.soldTickets) > 0 ? (
                <button
                  className="purchase-btn"
                  onClick={() => purchaseTicket(event.id, event.price)}
                  disabled={purchasingEvent === event.id || !isConnected}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: !isConnected 
                      ? '#6b7280' 
                      : purchasingEvent === event.id 
                        ? '#f59e0b' 
                        : '#22c55e',
                    color: 'white',
                    cursor: (!isConnected || purchasingEvent === event.id) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {purchasingEvent === event.id ? (
                    '🔄 Purchasing...'
                  ) : !isConnected ? (
                    '🔒 Connect Wallet First'
                  ) : (
                    '🎫 Purchase Ticket'
                  )}
                </button>
              ) : (
                <button 
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#6b7280',
                    color: 'white',
                    cursor: 'not-allowed',
                    fontSize: '14px'
                  }}
                >
                  {!event.isActive ? '❌ Event Inactive' : '🚫 Sold Out'}
                </button>
              )}

              {/* Organizer Badge */}
              {event.organizer.toLowerCase() === address?.toLowerCase() && (
                <div style={{ 
                  marginTop: '10px', 
                  fontSize: '12px', 
                  color: '#fbbf24',
                  textAlign: 'center',
                  background: 'rgba(251, 191, 36, 0.1)',
                  padding: '8px',
                  borderRadius: '4px'
                }}>
                  👑 You are the organizer of this event
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
