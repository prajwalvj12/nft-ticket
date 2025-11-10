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
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const verifyTicket = async (e) => {
    e.preventDefault();
    if (!tokenId) {
      alert('Please enter a token ID');
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      // Get ticket details
      const ticket = await contract.tickets(tokenId);
      const event = await contract.events(ticket.eventId);
      const owner = await contract.ownerOf(tokenId);

      setVerificationResult({
        tokenId: tokenId,
        eventId: ticket.eventId.toString(),
        eventName: event.name,
        eventDateTime: event.dateTime,
        venue: event.venue,
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
      verifyTicket({ preventDefault: () => {} });
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
      console.log(`🔍 Searching for ticket: Event ${eventId}, Owner ${ownerAddress}`);

      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      // Search through recent token IDs (last 100 tokens)
      // In production, you'd want to emit events and use event logs
      for (let tokenId = 1; tokenId <= 100; tokenId++) {
        try {
          const owner = await contract.ownerOf(tokenId);

          if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
            const ticket = await contract.tickets(tokenId);

            if (Number(ticket.eventId) === Number(eventId)) {
              console.log(`✅ Found ticket! Token ID: ${tokenId}`);
              return tokenId;
            }
          }
        } catch (err) {
          // Token doesn't exist or error, continue searching
          continue;
        }
      }

      console.log('❌ Ticket not found');
      return null;
    } catch (error) {
      console.error('Error searching for ticket:', error);
      return null;
    }
  };

  // Handle successful QR scan
  const onScanSuccess = async (decodedText, decodedResult) => {
    console.log('QR Code scanned:', decodedText);

    // Stop scanner
    await stopQRScanner();
    setIsLoading(true);

    try {
      // Try to parse as JSON (our custom format)
      const qrData = parseQRCodeData(decodedText);

      // Check if tokenId starts with 'E' (event-based QR code)
      if (qrData.tokenId.toString().startsWith('E')) {
        console.log('Event-based QR code detected, searching for token...');

        // Show searching message
        alert('🔍 Searching for your ticket...\n\nThis may take a few seconds.');

        // Find the actual token ID using event ID and owner
        const foundTokenId = await findTokenByEventAndOwner(qrData.eventId, qrData.owner);

        if (foundTokenId) {
          setTokenId(foundTokenId.toString());

          // Auto-verify the ticket
          setTimeout(() => {
            verifyTicket({ preventDefault: () => {} });
          }, 500);
        } else {
          alert(`❌ Ticket not found!\n\nEvent ID: ${qrData.eventId}\nOwner: ${qrData.owner.slice(0, 10)}...\n\nPossible reasons:\n• Ticket hasn't been minted yet\n• Wrong wallet connected\n• Ticket was transferred to another address`);
          setIsLoading(false);
        }
        return;
      }

      // If tokenId is a number, use it directly
      setTokenId(qrData.tokenId.toString());

      // Auto-verify the ticket
      setTimeout(() => {
        verifyTicket({ preventDefault: () => {} });
      }, 500);

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
        setTokenId(numericMatch[0]);
        setTimeout(() => {
          verifyTicket({ preventDefault: () => {} });
        }, 500);
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
          <strong>🦁 For Brave Browser:</strong>
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
