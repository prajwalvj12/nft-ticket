import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import contractAddress from '../EventTicketNFT-address.js';
import '../styles/Pages.css';

const CONTRACT_ADDRESS = contractAddress;

// Correct ABI matching your contract
const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "_name", "type": "string"},
      {"internalType": "uint256", "name": "_price", "type": "uint256"},
      {"internalType": "uint256", "name": "_maxTickets", "type": "uint256"},
      {"internalType": "uint256", "name": "_eventDate", "type": "uint256"}
    ],
    "name": "createEvent",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const MintTickets = () => {
  const { address, isConnected } = useAccount();
  
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    eventTime: '',
    ticketPrice: '0.01',
    maxTickets: '100'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const createEvent = async (e) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      alert('Please connect your wallet first.');
      return;
    }

    setIsLoading(true);
    try {
      // Validation
      if (!formData.eventName.trim() || formData.eventName.length < 3) {
        throw new Error('Event name must be at least 3 characters');
      }

      if (!formData.eventDate || !formData.eventTime) {
        throw new Error('Please select event date and time');
      }

      const price = parseFloat(formData.ticketPrice);
      const maxTickets = parseInt(formData.maxTickets);

      if (isNaN(price) || price <= 0) {
        throw new Error('Please enter a valid ticket price');
      }

      if (isNaN(maxTickets) || maxTickets <= 0 || maxTickets > 10000) {
        throw new Error('Max tickets must be between 1 and 10,000');
      }

      // Convert date and time to Unix timestamp
      const eventDateTime = new Date(`${formData.eventDate}T${formData.eventTime}`);
      const eventTimestamp = Math.floor(eventDateTime.getTime() / 1000);
      
      // Check if event is in the future (contract requirement)
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (eventTimestamp <= currentTimestamp) {
        throw new Error('Event date must be in the future');
      }

      console.log('Creating event with:', {
        name: formData.eventName.trim(),
        price: price,
        maxTickets: maxTickets,
        eventDate: eventTimestamp,
        eventDateTime: eventDateTime.toString()
      });

      // Convert price from MATIC to Wei
      const priceInWei = ethers.parseEther(price.toString());

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Gas estimation with correct parameters
      console.log('Estimating gas...');
      const gasEstimate = await contract.createEvent.estimateGas(
        formData.eventName.trim(),  // string _name
        priceInWei,                 // uint256 _price
        maxTickets,                 // uint256 _maxTickets  
        eventTimestamp              // uint256 _eventDate
      );
      console.log('Gas estimate successful:', gasEstimate.toString());

      // Send transaction with correct parameters
      const tx = await contract.createEvent(
        formData.eventName.trim(),  // string _name
        priceInWei,                 // uint256 _price
        maxTickets,                 // uint256 _maxTickets
        eventTimestamp,             // uint256 _eventDate
        { gasLimit: gasEstimate + BigInt(50000) } // Add buffer to gas estimate
      );

      console.log('Transaction sent:', tx.hash);
      alert(`Transaction sent! Hash: ${tx.hash}\nWaiting for confirmation...`);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      alert('Event created successfully! 🎉');
      
      // Reset form
      setFormData({
        eventName: '',
        eventDate: '',
        eventTime: '',
        ticketPrice: '0.01',
        maxTickets: '100'
      });
    } catch (error) {
      console.error('Error:', error);
      
      let errorMessage = 'Unknown error occurred';
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message.includes('Event date must be in the future')) {
        errorMessage = 'Event date must be in the future';
      } else if (error.message.includes('Max tickets must be greater than 0')) {
        errorMessage = 'Max tickets must be greater than 0';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert('Error creating event: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/home" className="back-btn">← Back to Home</Link>
        <h1>🎫 Create Event & Mint Tickets</h1>
        <p>Create your event and set up NFT ticket minting</p>
      </div>

      {!isConnected ? (
        <div className="connect-wallet-prompt">
          <h3>Wallet Not Connected</h3>
          <p>Please connect your wallet on the Home page first</p>
          <Link to="/home" className="primary-btn">Go to Home & Connect Wallet</Link>
        </div>
      ) : (
        <div className="form-container">
          <div className="wallet-status">
            <p>✅ Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
            <p>📄 Contract: {CONTRACT_ADDRESS?.slice(0, 6)}...{CONTRACT_ADDRESS?.slice(-4)}</p>
          </div>
          
          <form onSubmit={createEvent} className="mint-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Event Name * (min 3 chars)</label>
                <input
                  type="text"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleInputChange}
                  placeholder="e.g., Rock Concert 2025"
                  minLength="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Date *</label>
                <input
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Time *</label>
                <input
                  type="time"
                  name="eventTime"
                  value={formData.eventTime}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Ticket Price (MATIC) *</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  name="ticketPrice"
                  value={formData.ticketPrice}
                  onChange={handleInputChange}
                  placeholder="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Max Tickets *</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  name="maxTickets"
                  value={formData.maxTickets}
                  onChange={handleInputChange}
                  placeholder="100"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Event...' : 'Create Event'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default MintTickets;
