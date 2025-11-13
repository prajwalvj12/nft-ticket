import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import contractAddress from '../EventTicketNFT-address.js';
import contractABI from '../EventTicketNFT-abi.json';
import { generateTicketQRCode } from '../utils/qrcode.js';
import { uploadMetadataToIPFS, createTicketMetadata, isPinataConfigured, getIPFSGatewayURL } from '../utils/ipfs.js';
import '../styles/Pages.css';

const CONTRACT_ADDRESS = contractAddress;
const CONTRACT_ABI = contractABI;

export default function BrowseEvents() {
  const { address, isConnected } = useAccount();
  
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingEvent, setPurchasingEvent] = useState(null);
  const [error, setError] = useState(null);
  const [testQRCode, setTestQRCode] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Test QR code generation
  const testQRGeneration = async () => {
    try {
      console.log('=== Testing QR Code Generation ===');
      const testData = {
        tokenId: 'E1',
        eventId: 1,
        owner: address || '0x1234567890123456789012345678901234567890'
      };

      console.log('Test data:', testData);
      const qrCode = await generateTicketQRCode(testData);
      console.log('✅ QR code generated successfully!');
      console.log('QR code length:', qrCode.length);

      setTestQRCode(qrCode);
      alert('✅ QR Code test successful!\n\nCheck the console (F12) for details.\nA test QR code will be displayed below the events.');
    } catch (error) {
      console.error('❌ QR code test failed:', error);
      alert(`❌ QR Code test failed!\n\nError: ${error.message}\n\nCheck console (F12) for details.`);
    }
  };

  // Fetch events from blockchain
  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📡 Fetching events from blockchain...');
      console.log('📄 Contract address:', CONTRACT_ADDRESS);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const eventsData = [];
      
      // Check events 1-50
      for (let eventId = 1; eventId <= 50; eventId++) {
        try {
          console.log(`🔍 Checking event ID ${eventId}...`);
          const eventDetails = await contract.getEventDetails(eventId);
          console.log(`Event ${eventId} details:`, eventDetails);
          console.log(`Event ${eventId} name:`, eventDetails.name);
          console.log(`Event ${eventId} name length:`, eventDetails.name?.length);
          
          if (eventDetails.name && eventDetails.name.length > 0) {
            console.log(`✅ Event ${eventId} has valid name, adding to list`);
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
          } else {
            console.log(`❌ Event ${eventId} has empty name, skipping`);
          }
        } catch (error) {
          console.log(`❌ Error fetching event ${eventId}:`, error.message);
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

      console.log('💰 Wallet balance check passed');

      // Get event details for metadata
      const event = events.find(e => e.id === eventId);

      // For QR code, we'll use event info since we don't know the token ID yet
      // The actual token ID will be assigned by the contract after minting
      let tokenURI = `https://api.eventtickets.app/ticket/${eventId}-${Date.now()}`; // Default fallback

      // Try IPFS integration (non-blocking)
      // Note: QR code will contain event info, not token ID (since we don't have it yet)
      try {
        // Check if IPFS is configured
        if (isPinataConfigured()) {
          console.log('📦 IPFS configured, attempting to generate QR code and upload metadata...');
          console.log('🎫 Event ID:', eventId);
          console.log('👤 Owner:', address);

          let qrCodeDataURL = '';

          // Generate QR code with event info (we'll update with token ID later if needed)
          try {
            console.log('🎨 Starting QR code generation...');
            // Use a simple QR format with just event ID and owner
            // This way it can still be used for verification
            const qrData = {
              tokenId: `E${eventId}`, // Use event ID prefix temporarily
              eventId: eventId,
              owner: address
            };
            console.log('QR Data:', qrData);

            const qrPromise = generateTicketQRCode(qrData);

            // Timeout after 10 seconds (increased from 5)
            qrCodeDataURL = await Promise.race([
              qrPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('QR generation timeout')), 10000))
            ]);

            console.log('✅ QR code generated successfully!');
            console.log('QR code length:', qrCodeDataURL?.length || 0);
            console.log('QR code preview (first 50 chars):', qrCodeDataURL?.substring(0, 50));

            if (!qrCodeDataURL || !qrCodeDataURL.startsWith('data:image')) {
              throw new Error('Invalid QR code format - not a data URL');
            }
          } catch (qrError) {
            console.error('❌ QR code generation failed:', qrError);
            console.error('Error details:', qrError.message);
            console.error('QR code will NOT be included in metadata');
          }

          // Create metadata
          console.log('📝 Creating metadata...');
          const metadata = createTicketMetadata({
            tokenId: `Event ${eventId} Ticket`, // Descriptive name instead of ID
            eventId: eventId,
            eventName: event?.name || 'Event',
            eventDate: event?.eventDate || 'TBA',
            seatNumber: event?.soldTickets + 1 || 1,
            price: price,
            owner: address,
            qrCodeDataURL: qrCodeDataURL
          });

          console.log('✅ Metadata created successfully!');
          console.log('Metadata name:', metadata.name);
          console.log('Metadata description:', metadata.description);
          console.log('Has QR image:', metadata.image ? 'YES' : 'NO');
          console.log('Image type:', metadata.image?.startsWith('data:image') ? 'Base64 QR Code' : 'Placeholder URL');
          console.log('Attributes count:', metadata.attributes?.length || 0);

          // Check if we have a valid QR code in metadata
          if (!qrCodeDataURL || !metadata.image?.startsWith('data:image')) {
            console.warn('⚠️ WARNING: Metadata does not contain QR code!');
            console.warn('Proceeding with placeholder image instead');
          }

          // Upload to IPFS (with timeout)
          try {
            console.log('📤 Uploading metadata to IPFS via Pinata...');
            const uploadPromise = uploadMetadataToIPFS(metadata);

            // Timeout after 20 seconds (increased from 10)
            const ipfsHash = await Promise.race([
              uploadPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('IPFS upload timeout after 20s')), 20000))
            ]);

            tokenURI = `ipfs://${ipfsHash}`;
            console.log('✅ Metadata uploaded to IPFS successfully!');
            console.log('IPFS Hash:', ipfsHash);
            console.log('Token URI:', tokenURI);
            console.log('🌐 View at:', getIPFSGatewayURL(ipfsHash));

            alert(`✅ Metadata uploaded to IPFS!\n\nIPFS Hash: ${ipfsHash}\n\nQR Code: ${qrCodeDataURL ? 'Included ✅' : 'Not included ❌'}\n\nContinuing with transaction...`);
          } catch (ipfsError) {
            console.error('❌ IPFS upload failed!');
            console.error('Error:', ipfsError.message);
            console.error('Using fallback URI instead');
            alert(`⚠️ IPFS Upload Failed!\n\nError: ${ipfsError.message}\n\nWill use fallback URI (no QR code)\n\nContinuing with transaction...`);
            // tokenURI already set to fallback
          }
        } else {
          console.log('ℹ️ IPFS not configured, using simple token URI');
          console.log('❌ QR code will NOT be saved to blockchain');
          alert('⚠️ IPFS not configured!\n\nTicket will be created without QR code in metadata.\n\nPlease configure VITE_PINATA_JWT in .env file.');
        }
      } catch (overallError) {
        console.error('⚠️ IPFS integration error, using fallback URI:', overallError.message);
        // tokenURI already set to fallback
      }

      console.log('🔗 Token URI:', tokenURI);

      // Execute transaction with optimized settings
      const txParams = {
        value: ethers.parseEther(price.toString())
      };

      console.log('⚡ Transaction parameters:', txParams);

      const tx = await contract.mintTicket(eventId, tokenURI, txParams);

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

        const successMessage = isPinataConfigured()
          ? `🎉 Ticket purchased successfully!\n\n🎫 Token ID: ${tokenId}\n📄 Transaction: ${tx.hash}\n📦 Metadata stored on IPFS with QR code\n\n✅ Your NFT ticket has been created\n📱 Check your MetaMask wallet (NFTs section)\n\n📷 Scan the QR code for instant verification!\nThe scanner will automatically find your ticket.\n\n⏱️ It may take a few minutes to appear in your wallet.`
          : `🎉 Ticket purchased successfully!\n\n🎫 Token ID: ${tokenId}\n📄 Transaction: ${tx.hash}\n\n✅ Your NFT ticket has been created\n📱 Check your MetaMask wallet (NFTs section)\n\n📝 Save Token ID: ${tokenId}\n\n⏱️ It may take a few minutes to appear in your wallet.`;

        alert(successMessage);

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

      {/* QR Test Tool */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#818cf8', fontSize: '16px', marginBottom: '10px' }}>🔧 Debug Tool: Test QR Code Generation</h3>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '10px' }}>
          Click below to test if QR code generation is working properly. Check console (F12) for detailed logs.
        </p>
        <button
          onClick={testQRGeneration}
          style={{
            background: '#6366f1',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          🧪 Test QR Generation
        </button>

        {testQRCode && (
          <div style={{ marginTop: '15px' }}>
            <p style={{ color: '#22c55e', fontSize: '13px', marginBottom: '10px' }}>
              ✅ Test QR Code Generated Successfully!
            </p>
            <div style={{
              background: 'white',
              padding: '15px',
              borderRadius: '8px',
              display: 'inline-block'
            }}>
              <img src={testQRCode} alt="Test QR Code" style={{ width: '200px', height: '200px' }} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '10px' }}>
              If you can see this QR code, generation is working! The issue might be with IPFS upload.
            </p>
          </div>
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
