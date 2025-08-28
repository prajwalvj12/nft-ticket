import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import contractABI from '../EventTicketNFT-abi.json';
import contractAddress from '../EventTicketNFT-address.js';
import '../styles/Pages.css';

const VerifyTickets = () => {
  const { address, isConnected } = useAccount();
  
  const [tokenId, setTokenId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/home" className="back-btn">← Back to Home</Link>
        <h1>✅ Verify Tickets</h1>
        <p>Validate ticket authenticity and usage status</p>
      </div>

      <div className="verify-container">
        <form onSubmit={verifyTicket} className="verify-form">
          <div className="form-group">
            <label>Enter Token ID</label>
            <input
              type="number"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="e.g., 1"
              required
            />
          </div>
          
          <button
            type="submit"
            className="verify-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify Ticket'}
          </button>
        </form>

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
