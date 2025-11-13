import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import contractABI from '../EventTicketNFT-abi.json';
import contractAddress from '../EventTicketNFT-address.js';
import { parseQRCodeData } from '../utils/qrcode.js';
import '../styles/Pages.css';

const VerifyTickets = () => {
  const { address, isConnected } = useAccount();

  const [tokenId, setTokenId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [userTokens, setUserTokens] = useState([]);
  const [showMetadata, setShowMetadata] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Fetch and display metadata for a token
  const viewTokenMetadata = async (tokenId) => {
    setIsLoading(true);
    try {
      console.log(`📄 Fetching metadata for token ${tokenId}...`);
      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      // Get tokenURI
      const tokenURI = await contract.tokenURI(tokenId);
      console.log('TokenURI:', tokenURI);

      // Fetch metadata from URI
      let metadata = null;
      let metadataURL = tokenURI;

      if (tokenURI.startsWith('ipfs://')) {
        metadataURL = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      }

      console.log('Fetching metadata from:', metadataURL);

      try {
        const response = await fetch(metadataURL);
        metadata = await response.json();
        console.log('✅ Metadata fetched:', metadata);

        // Check if image is base64 data URL or IPFS
        if (metadata.image) {
          console.log('Image type:', metadata.image.startsWith('data:') ? 'Base64 Data URL' : 'IPFS/URL');
          console.log('Image preview (first 100 chars):', metadata.image.substring(0, 100));
        }

        setShowMetadata({
          tokenId,
          tokenURI,
          metadataURL,
          metadata,
          hasQRCode: metadata.image && metadata.image.startsWith('data:image')
        });

      } catch (fetchError) {
        console.error('❌ Failed to fetch metadata:', fetchError);
        setShowMetadata({
          tokenId,
          tokenURI,
          metadataURL,
          error: 'Failed to fetch metadata from URL',
          errorDetails: fetchError.message
        });
      }

    } catch (error) {
      console.error('Error fetching token metadata:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Find all tokens owned by the current wallet
  const findMyTokens = async () => {
    if (!isConnected || !address) {
      alert('❌ Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setUserTokens([]);

    try {
      console.log('🔍 Searching for tokens owned by:', address);
      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      const foundTokens = [];

      // Search through tokens 1-100 (optimized for speed)
      // If you have more tickets, increase this number
      let consecutiveNotFound = 0;
      const maxConsecutiveNotFound = 10; // Stop after 10 consecutive non-existent tokens

      for (let tokenId = 1; tokenId <= 100; tokenId++) {
        try {
          const owner = await contract.ownerOf(tokenId);
          consecutiveNotFound = 0; // Reset counter when we find a token

          if (owner.toLowerCase() === address.toLowerCase()) {
            // Get ticket details
            const ticket = await contract.tickets(tokenId);
            const event = await contract.events(ticket.eventId);

            foundTokens.push({
              tokenId,
              eventId: ticket.eventId.toString(),
              eventName: event.name,
              isUsed: ticket.isUsed
            });

            console.log(`✅ Found token ${tokenId} for event: ${event.name}`);
          }
        } catch (err) {
          // Token doesn't exist or error
          consecutiveNotFound++;

          // If we've hit 10 consecutive non-existent tokens, likely no more tokens exist
          if (consecutiveNotFound >= maxConsecutiveNotFound) {
            console.log(`⏹️ Stopping search after ${tokenId} tokens (${maxConsecutiveNotFound} consecutive not found)`);
            break;
          }
          continue;
        }
      }

      console.log(`📊 Total tokens found: ${foundTokens.length}`);
      setUserTokens(foundTokens);

      if (foundTokens.length === 0) {
        alert('❌ No tickets found for your wallet\n\nMake sure you:\n• Are connected with the correct wallet\n• Have purchased tickets\n• Tickets have been minted on blockchain');
      } else {
        alert(`✅ Found ${foundTokens.length} ticket(s)!\n\nCheck the list below to see your tokens.`);
      }
    } catch (error) {
      console.error('Error finding tokens:', error);
      alert('Error searching for tokens: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to verify a specific token ID
  const verifyTokenById = async (id) => {
    if (!id) {
      alert('Please enter a token ID');
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      console.log(`🔍 Verifying ticket ID: ${id}`);

      // Get ticket details
      const ticket = await contract.tickets(id);
      const event = await contract.events(ticket.eventId);
      const owner = await contract.ownerOf(id);

      console.log('✅ Ticket verified successfully!');

      setVerificationResult({
        tokenId: id,
        eventId: ticket.eventId.toString(),
        eventName: event.name,
        eventDateTime: new Date(Number(event.eventDate) * 1000).toLocaleString(),
        venue: 'N/A', // Venue not stored in contract
        owner: owner,
        isUsed: ticket.isUsed,
        isValid: !ticket.isUsed && event.isActive,
        mintedAt: new Date(Number(ticket.mintedAt) * 1000).toLocaleString()
      });
    } catch (error) {
      console.error('Error verifying ticket:', error);
      setVerificationResult({
        error: 'Ticket not found or invalid token ID'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTicket = async (e) => {
    e.preventDefault();
    if (!tokenId) {
      alert('Please enter a token ID');
      return;
    }

    await verifyTokenById(tokenId);
  };

  const markTicketAsUsed = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.useTicket(tokenId);
      await tx.wait();

      alert('Ticket marked as used successfully!');
      // Re-verify to update status
      await verifyTokenById(tokenId);
    } catch (error) {
      console.error('Error marking ticket as used:', error);
      alert('Error marking ticket as used: ' + error.message);
    }
  };

  // Start QR code scanning
  const startQRScanner = async () => {
    try {
      setScanError('');
      setIsScanning(true);

      // First, explicitly request camera permission (helps with Brave)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Camera permission granted');
      } catch (permErr) {
        console.error('Camera permission denied:', permErr);
        throw new Error('Camera access denied. Please allow camera access in your browser settings.');
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        // Additional config for better Brave compatibility
        disableFlip: false,
        videoConstraints: {
          facingMode: "environment",
          advanced: [{ zoom: 1.0 }]
        }
      };

      // Try with different camera configurations
      try {
        // Try with specific camera constraints first (works better in Brave)
        await html5QrCode.start(
          {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          config,
          onScanSuccess,
          onScanError
        );
      } catch (startErr) {
        console.warn('Failed with environment camera, trying any camera:', startErr);
        // Fallback: try with any available camera
        await html5QrCode.start(
          { facingMode: "user" }, // Front camera fallback
          config,
          onScanSuccess,
          onScanError
        );
      }
    } catch (err) {
      console.error('Failed to start scanner:', err);

      let errorMsg = 'Failed to start camera. ';

      if (err.message?.includes('denied')) {
        errorMsg += 'Camera access was denied. Please click the shield icon (🦁) in the address bar and allow camera access.';
      } else if (err.message?.includes('NotFoundError')) {
        errorMsg += 'No camera found. Please ensure your device has a camera.';
      } else if (err.message?.includes('NotAllowedError')) {
        errorMsg += 'Camera permission denied. For Brave: Click the shield icon → Allow camera.';
      } else if (err.message?.includes('NotReadableError')) {
        errorMsg += 'Camera is already in use by another application. Please close other apps using the camera.';
      } else {
        errorMsg += err.message || 'Please ensure camera permissions are granted.';
      }

      setScanError(errorMsg);
      setIsScanning(false);
    }
  };

  // Stop QR code scanning
  const stopQRScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  // Find token ID by event ID and owner address
  const findTokenByEventAndOwner = async (eventId, ownerAddress) => {
    try {
      console.log(`🔍 Searching for ticket...`);
      console.log(`Event ID: ${eventId}`);
      console.log(`Original Owner Address: ${ownerAddress}`);

      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      // Search through recent token IDs (optimized search)
      // In production, you'd want to emit events and use event logs
      let checkedTokens = 0;
      let matchedOwner = 0;
      let consecutiveNotFound = 0;
      const maxConsecutiveNotFound = 10;
      let ticketsForThisEvent = []; // Store all tickets for this event

      for (let tokenId = 1; tokenId <= 100; tokenId++) {
        try {
          const ticket = await contract.tickets(tokenId);
          checkedTokens++;
          consecutiveNotFound = 0; // Reset counter

          // Check if this ticket is for the event we're looking for
          if (Number(ticket.eventId) === Number(eventId)) {
            const owner = await contract.ownerOf(tokenId);
            console.log(`Token ${tokenId}: Event ${ticket.eventId}, Owner = ${owner.slice(0, 10)}...`);

            ticketsForThisEvent.push({ tokenId, owner });

            // Check if owner matches (original owner from QR code)
            if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
              console.log(`✅ PERFECT MATCH! Token ID: ${tokenId} (owner matches)`);
              return tokenId;
            }
          }
        } catch (err) {
          // Token doesn't exist or error, continue searching
          consecutiveNotFound++;

          if (consecutiveNotFound >= maxConsecutiveNotFound) {
            console.log(`⏹️ Stopping search at token ${tokenId} (${maxConsecutiveNotFound} consecutive not found)`);
            break;
          }

          if (!err.message?.includes('ERC721: invalid token ID')) {
            console.log(`Token ${tokenId}: Error - ${err.message}`);
          }
          continue;
        }
      }

      // If we didn't find a match with the original owner, but found tickets for this event
      if (ticketsForThisEvent.length > 0) {
        console.log(`⚠️ Ticket was transferred! Found ${ticketsForThisEvent.length} ticket(s) for Event ${eventId}`);
        console.log(`Original owner in QR: ${ownerAddress.slice(0, 10)}...`);

        // Return the first ticket found for this event
        const foundTicket = ticketsForThisEvent[0];
        console.log(`✅ Using Token ID: ${foundTicket.tokenId}, Current Owner: ${foundTicket.owner.slice(0, 10)}...`);
        console.log(`⚠️ Note: This ticket was transferred from the original owner`);

        return foundTicket.tokenId;
      }

      console.log(`❌ No tickets found for Event ID ${eventId}`);
      console.log(`Checked ${checkedTokens} tokens`);
      return null;
    } catch (error) {
      console.error('❌ Error searching for ticket:', error);
      return null;
    }
  };

  // Handle successful QR scan
  const onScanSuccess = async (decodedText, decodedResult) => {
    console.log('========== QR CODE SCANNED ==========');
    console.log('Raw QR data:', decodedText);

    // Stop scanner
    await stopQRScanner();
    setIsLoading(true);

    try {
      // Try to parse as JSON (our custom format)
      const qrData = parseQRCodeData(decodedText);

      console.log('Parsed QR data:', qrData);
      console.log('Token ID from QR:', qrData.tokenId);
      console.log('Event ID from QR:', qrData.eventId);
      console.log('Owner from QR:', qrData.owner);

      // Check if tokenId starts with 'E' (event-based QR code)
      if (qrData.tokenId.toString().startsWith('E')) {
        console.log('✅ Event-based QR code detected!');
        console.log('Starting search for token...');

        // Show searching message
        alert('🔍 Searching for your ticket...\n\nThis may take a few seconds.');

        // Find the actual token ID using event ID and owner
        const foundTokenId = await findTokenByEventAndOwner(qrData.eventId, qrData.owner);

        if (foundTokenId) {
          console.log(`SUCCESS! Found token ID: ${foundTokenId}`);
          setTokenId(foundTokenId.toString());

          // Auto-verify the ticket directly
          await verifyTokenById(foundTokenId);
        } else {
          console.log('FAILED: Ticket not found');
          console.log('💡 Troubleshooting:');
          console.log('1. Make sure the ticket was successfully minted on blockchain');
          console.log('2. Check if the wallet address in QR matches the current owner');
          console.log('3. Token IDs might be higher than 500 - try increasing search range');
          console.log('4. Use the "Find My Tickets" button to see all your tokens');

          alert(`❌ Ticket not found!\n\nEvent ID: ${qrData.eventId}\nOwner: ${qrData.owner.slice(0, 10)}...\n\nCheck console (F12) for details.\n\nPossible reasons:\n• Ticket hasn't been minted yet\n• Wrong wallet connected\n• Ticket was transferred to another address\n• Token ID is higher than 500 (use Find My Tickets button)\n\n💡 Try using the "Find My Tickets" button below!`);
          setIsLoading(false);
        }
        return;
      }

      // If tokenId is a number, use it directly
      const directTokenId = qrData.tokenId.toString();
      setTokenId(directTokenId);

      // Auto-verify the ticket directly
      await verifyTokenById(directTokenId);

    } catch (parseError) {
      // If parsing fails, check if it's a simple token ID number
      console.log('Parsing QR data failed, checking format:', decodedText);

      // Check if it starts with 'E' (event format)
      if (decodedText.toString().startsWith('E')) {
        alert(`⚠️ Could not parse QR code data.\n\nPlease enter your Token ID manually.`);
        setIsLoading(false);
        return;
      }

      // Try to extract just numbers
      const numericMatch = decodedText.match(/\d+/);
      if (numericMatch) {
        const extractedId = numericMatch[0];
        setTokenId(extractedId);
        await verifyTokenById(extractedId);
      } else {
        alert(`⚠️ Could not parse QR code.\n\nPlease enter Token ID manually.`);
        setIsLoading(false);
      }
    }
  };

  // Handle scan errors
  const onScanError = (errorMessage) => {
    // Ignore continuous scan errors (they're normal)
    if (!errorMessage.includes('NotFoundException')) {
      console.warn('QR scan error:', errorMessage);
    }
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(err => console.error('Cleanup error:', err));
      }
    };
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/home" className="back-btn">← Back to Home</Link>
        <h1>✅ Verify Tickets</h1>
        <p>Validate ticket authenticity and usage status</p>
      </div>

      <div className="verify-container">
        {/* QR Scanner Info Card */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#818cf8'
        }}>
          <strong>📷 How QR Code Scanning Works:</strong>
          <p style={{ marginTop: '10px', fontSize: '14px', lineHeight: '1.6' }}>
            Scan the QR code from your NFT ticket in MetaMask. The system will automatically
            search for your ticket using the event and owner information, then verify it instantly!
          </p>
          <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid rgba(99, 102, 241, 0.2)' }} />
          <strong>📱 How to View Your QR Code in MetaMask:</strong>
          <ol style={{ marginTop: '10px', marginLeft: '20px', fontSize: '13px', lineHeight: '1.5' }}>
            <li>Open <strong>MetaMask mobile app</strong> (QR codes display better on mobile)</li>
            <li>Go to <strong>NFTs</strong> tab</li>
            <li>Select your <strong>Event Ticket NFT</strong></li>
            <li>The QR code should appear as the NFT image</li>
            <li>Use this page to <strong>scan that QR code</strong> for verification</li>
          </ol>
          <p style={{ marginTop: '10px', fontSize: '13px', color: '#94a3b8' }}>
            💡 <strong>Can't see QR?</strong> Use "Find My Tickets" button below to view and download your QR code!
          </p>
          <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid rgba(99, 102, 241, 0.2)' }} />
          <strong>🦁 For Brave Browser Camera:</strong>
          <ol style={{ marginTop: '10px', marginLeft: '20px', fontSize: '13px', lineHeight: '1.5' }}>
            <li>Click the <strong>shield icon (🦁)</strong> in the address bar</li>
            <li>Make sure <strong>Camera</strong> permission is ON</li>
            <li>Click <strong>"Reset permission"</strong> if needed</li>
            <li>Refresh page and try again</li>
          </ol>
        </div>

        <form onSubmit={verifyTicket} className="verify-form">
          <div className="form-group">
            <label>Enter Token ID or Scan QR Code</label>
            <input
              type="number"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="e.g., 1"
              required
              disabled={isScanning}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button
              type="submit"
              className="verify-btn"
              disabled={isLoading || isScanning}
              style={{
                background: isLoading || isScanning ? '#6b7280' : '#22c55e',
                cursor: isLoading || isScanning ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Verifying...' : 'Verify Ticket'}
            </button>

            <button
              type="button"
              onClick={isScanning ? stopQRScanner : startQRScanner}
              className="scan-btn"
              disabled={isLoading}
              style={{
                background: isScanning ? '#ef4444' : '#6366f1',
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {isScanning ? '📷 Stop Scanning' : '📷 Scan QR Code'}
            </button>
          </div>
        </form>

        {/* QR Scanner Container */}
        {isScanning && (
          <div style={{
            marginTop: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div id="qr-reader" style={{ width: '100%' }}></div>
            <p style={{ marginTop: '15px', color: '#94a3b8' }}>
              Point your camera at the QR code on the ticket
            </p>
          </div>
        )}

        {/* Scan Error */}
        {scanError && (
          <div style={{
            marginTop: '15px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '15px',
            borderRadius: '6px',
            color: '#ef4444'
          }}>
            {scanError}
          </div>
        )}

        {/* Debug Tool - Find My Tickets */}
        {isConnected && (
          <div style={{
            marginTop: '20px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: '20px',
            borderRadius: '8px'
          }}>
            <h3 style={{ color: '#818cf8', marginBottom: '10px' }}>🔍 Debug Tool</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '15px' }}>
              Can't scan QR code? Click below to find all your tickets and their Token IDs.
            </p>
            <button
              onClick={findMyTokens}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                background: isLoading ? '#6b7280' : '#6366f1',
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {isLoading ? '🔄 Searching...' : '🔍 Find My Tickets'}
            </button>

            {/* Display found tokens */}
            {userTokens.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4 style={{ color: '#818cf8', marginBottom: '10px' }}>Your Tickets:</h4>
                {userTokens.map((token) => (
                  <div
                    key={token.tokenId}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '15px',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{ color: 'white', fontWeight: 'bold' }}>
                        🎫 Token ID: {token.tokenId}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                        Event: {token.eventName} (Event ID: {token.eventId})
                      </p>
                      <p style={{ color: token.isUsed ? '#ef4444' : '#22c55e', fontSize: '12px' }}>
                        Status: {token.isUsed ? 'Used ❌' : 'Valid ✅'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setTokenId(token.tokenId.toString());
                          verifyTokenById(token.tokenId);
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#22c55e',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => viewTokenMetadata(token.tokenId)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#6366f1',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        View QR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metadata Viewer */}
        {showMetadata && (
          <div style={{
            marginTop: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '20px',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: 'white', margin: 0 }}>📄 NFT Metadata - Token #{showMetadata.tokenId}</h3>
              <button
                onClick={() => setShowMetadata(null)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Close
              </button>
            </div>

            {showMetadata.error ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '15px',
                borderRadius: '6px',
                color: '#ef4444'
              }}>
                <p><strong>❌ Error:</strong> {showMetadata.error}</p>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>{showMetadata.errorDetails}</p>
                <p style={{ fontSize: '13px', marginTop: '8px', wordBreak: 'break-all' }}>
                  <strong>Token URI:</strong> {showMetadata.tokenURI}
                </p>
              </div>
            ) : (
              <div>
                {/* Token URI Info */}
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '5px' }}>
                    <strong>Token URI:</strong>
                  </p>
                  <p style={{
                    color: '#e5e7eb',
                    fontSize: '12px',
                    wordBreak: 'break-all',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '8px',
                    borderRadius: '4px'
                  }}>
                    {showMetadata.tokenURI}
                  </p>
                </div>

                {/* Metadata JSON */}
                {showMetadata.metadata && (
                  <>
                    <div style={{ marginBottom: '15px' }}>
                      <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '5px' }}>
                        <strong>Name:</strong> {showMetadata.metadata.name}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '5px' }}>
                        <strong>Description:</strong> {showMetadata.metadata.description}
                      </p>
                    </div>

                    {/* QR Code Image */}
                    {showMetadata.metadata.image && (
                      <div style={{ marginBottom: '15px' }}>
                        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '10px' }}>
                          <strong>🎫 QR Code / Ticket Image:</strong>
                        </p>
                        <div style={{
                          background: 'white',
                          padding: '15px',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          {showMetadata.hasQRCode ? (
                            <>
                              <img
                                src={showMetadata.metadata.image}
                                alt="QR Code"
                                style={{
                                  maxWidth: '100%',
                                  height: 'auto',
                                  maxHeight: '400px',
                                  borderRadius: '4px'
                                }}
                              />
                              <p style={{ color: '#22c55e', fontSize: '12px', marginTop: '10px' }}>
                                ✅ QR Code is embedded in the NFT metadata!
                              </p>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = showMetadata.metadata.image;
                                  link.download = `ticket-${showMetadata.tokenId}-qr.png`;
                                  link.click();
                                }}
                                style={{
                                  marginTop: '10px',
                                  padding: '10px 20px',
                                  background: '#22c55e',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: 'bold'
                                }}
                              >
                                📥 Download QR Code
                              </button>
                            </>
                          ) : (
                            <>
                              <img
                                src={showMetadata.metadata.image}
                                alt="Ticket"
                                style={{
                                  maxWidth: '100%',
                                  height: 'auto',
                                  maxHeight: '400px',
                                  borderRadius: '4px'
                                }}
                              />
                              <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '10px' }}>
                                ⚠️ This NFT has an image but it's not a QR code (Base64 data URL).
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Attributes */}
                    {showMetadata.metadata.attributes && showMetadata.metadata.attributes.length > 0 && (
                      <div>
                        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '10px' }}>
                          <strong>Attributes:</strong>
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                          {showMetadata.metadata.attributes.map((attr, idx) => (
                            <div key={idx} style={{
                              background: 'rgba(99, 102, 241, 0.1)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              padding: '10px',
                              borderRadius: '6px'
                            }}>
                              <p style={{ color: '#818cf8', fontSize: '11px', marginBottom: '4px' }}>
                                {attr.trait_type}
                              </p>
                              <p style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>
                                {attr.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {verificationResult && (
          <div className="verification-result">
            {verificationResult.error ? (
              <div className="error-result">
                <h3>❌ Verification Failed</h3>
                <p>{verificationResult.error}</p>
              </div>
            ) : (
              <div className={`success-result ${verificationResult.isValid ? 'valid' : 'invalid'}`}>
                <h3>
                  {verificationResult.isValid ? '✅ Valid Ticket' : '❌ Invalid/Used Ticket'}
                </h3>
                
                <div className="ticket-details">
                  <div className="detail-row">
                    <span>Token ID:</span>
                    <span>#{verificationResult.tokenId}</span>
                  </div>
                  <div className="detail-row">
                    <span>Event:</span>
                    <span>{verificationResult.eventName}</span>
                  </div>
                  <div className="detail-row">
                    <span>Date & Time:</span>
                    <span>{verificationResult.eventDateTime}</span>
                  </div>
                  <div className="detail-row">
                    <span>Venue:</span>
                    <span>{verificationResult.venue}</span>
                  </div>
                  <div className="detail-row">
                    <span>Owner:</span>
                    <span>{verificationResult.owner.slice(0, 6)}...{verificationResult.owner.slice(-4)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Status:</span>
                    <span className={verificationResult.isUsed ? 'used' : 'unused'}>
                      {verificationResult.isUsed ? 'Used' : 'Unused'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Minted:</span>
                    <span>{verificationResult.mintedAt}</span>
                  </div>
                </div>

                {verificationResult.isValid && isConnected && (
                  <button
                    onClick={markTicketAsUsed}
                    className="use-ticket-btn"
                  >
                    Mark as Used
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyTickets;
