import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import contractABI from '../EventTicketNFT-abi.json';
import contractAddress from '../EventTicketNFT-address.js';
import '../styles/Pages.css';

const Admin = () => {
  const { address, isConnected } = useAccount();
  const [isOwner, setIsOwner] = useState(false);
  const [formData, setFormData] = useState({
    marketplaceAddress: '',
    markupPercentage: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkOwner = async () => {
      if (isConnected) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const owner = await contract.owner();
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
      }
    };
    checkOwner();
  }, [isConnected, address]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSetMarketplace = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.setMarketplace(
        formData.marketplaceAddress,
        formData.markupPercentage
      );
      await tx.wait();
      alert('Marketplace settings updated successfully!');
    } catch (error) {
      console.error('Error setting marketplace:', error);
      alert('Failed to update marketplace settings.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Admin Panel</h1>
        </div>
        <p>Please connect your wallet to access the admin panel.</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Admin Panel</h1>
        </div>
        <p>You are not authorized to view this page.</p>
        <Link to="/home">Go back to Home</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/home" className="back-btn">← Back to Home</Link>
        <h1>Admin Panel</h1>
        <p>Configure the smart contract settings.</p>
      </div>

      <div className="form-container">
        <form onSubmit={handleSetMarketplace} className="mint-form">
          <h2>Marketplace Settings</h2>
          <div className="form-group">
            <label>Official Marketplace Address</label>
            <input
              type="text"
              name="marketplaceAddress"
              value={formData.marketplaceAddress}
              onChange={handleInputChange}
              placeholder="0x..."
              required
            />
          </div>
          <div className="form-group">
            <label>Max Resale Markup (%)</label>
            <input
              type="number"
              name="markupPercentage"
              value={formData.markupPercentage}
              onChange={handleInputChange}
              placeholder="e.g., 20"
              required
            />
          </div>
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Set Marketplace'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Admin;
