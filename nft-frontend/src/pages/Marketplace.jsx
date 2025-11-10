import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import contractABI from '../EventTicketNFT-abi.json';
import contractAddress from '../EventTicketNFT-address.js';
import marketplaceABI from '../TicketMarketplace-abi.json';
import MARKETPLACE_ADDRESS from '../TicketMarketplace-address.js';
import '../styles/Pages.css';

const Marketplace = () => {
  const { address, isConnected } = useAccount();
  const [myTickets, setMyTickets] = useState([]);
  const [listedTickets, setListedTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listingPrice, setListingPrice] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [maxMarkup, setMaxMarkup] = useState(0);
  const [officialMarketplace, setOfficialMarketplace] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    if (isConnected) {
      fetchMarketplaceConfig();
      fetchMyTickets();
      fetchListedTickets();
    }
  }, [isConnected, address]);

  const fetchMarketplaceConfig = async () => {
    try {
      console.log('🔧 Fetching marketplace configuration...');
      console.log('📄 Contract address:', contractAddress);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      const marketplace = await contract.officialMarketplace();
      const markup = await contract.maxResaleMarkupPercent();

      console.log('🏪 Marketplace address from contract:', marketplace);
      console.log('📊 Max markup percent:', markup.toString());
      console.log('📊 Max markup as number:', Number(markup));

      setOfficialMarketplace(marketplace);
      setMaxMarkup(Number(markup));
      setConfigLoaded(true);

      console.log('✅ Marketplace config loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching marketplace config:', error);
      setConfigLoaded(false);
    }
  };

  const fetchMyTickets = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Fetching tickets for address:', address);
      console.log('📄 Contract address:', contractAddress);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      const tickets = [];
      
      // Debug: Check first few tokens manually
      console.log('🔍 Debug: Checking first 5 tokens manually...');
      for (let i = 1; i <= 5; i++) {
        try {
          const owner = await contract.ownerOf(i);
          console.log(`Token ${i} exists, owner: ${owner}`);
        } catch (error) {
          console.log(`Token ${i} does not exist`);
        }
      }
      
      // Get current block number
      const currentBlock = await provider.getBlockNumber();
      console.log('Current block:', currentBlock);
      
      // Query events from last 100000 blocks (adjust based on when contract was deployed)
      const fromBlock = Math.max(0, currentBlock - 100000);
      console.log(`📡 Querying Transfer events from block ${fromBlock} to ${currentBlock}...`);
      
      try {
        const transferFilter = contract.filters.Transfer(null, address);
        const events = await contract.queryFilter(transferFilter, fromBlock, 'latest');
        
        console.log(`Found ${events.length} transfer events to this address`);
        
        // Get unique token IDs from events
        const tokenIds = [...new Set(events.map(event => Number(event.args.tokenId)))];
        console.log('Token IDs from events:', tokenIds);
        
        // Check each token to see if user still owns it
        for (const tokenId of tokenIds) {
          try {
            const owner = await contract.ownerOf(tokenId);
            console.log(`Token ${tokenId} current owner:`, owner);
            
            if (owner.toLowerCase() === address.toLowerCase()) {
              console.log(`✅ User still owns token ${tokenId}`);
              
              try {
                const ticketDetails = await contract.tickets(tokenId);
                console.log('Ticket details:', ticketDetails);
                
                // Try to get original price, fallback to event price if not available
                let originalPrice;
                try {
                  originalPrice = await contract.originalTicketPrice(tokenId);
                } catch (priceError) {
                  console.warn('originalTicketPrice not available, using event price');
                  const eventDetails = await contract.events(ticketDetails.eventId);
                  originalPrice = eventDetails.price;
                }
                
                const eventDetails = await contract.events(ticketDetails.eventId);
                console.log('Event details:', eventDetails);
                
                tickets.push({
                  tokenId,
                  eventId: Number(ticketDetails.eventId),
                  eventName: eventDetails.name,
                  seatNumber: Number(ticketDetails.seatNumber),
                  isUsed: ticketDetails.isUsed,
                  originalPrice: ethers.formatEther(originalPrice),
                });
              } catch (detailError) {
                console.error(`Error fetching details for token ${tokenId}:`, detailError);
              }
            }
          } catch (error) {
            console.log(`Error checking token ${tokenId}:`, error.message);
            continue;
          }
        }
      } catch (eventError) {
        console.warn('⚠️ Event query failed, falling back to manual check:', eventError.message);
        // Fallback: check first 100 tokens manually
        for (let tokenId = 1; tokenId <= 100; tokenId++) {
          try {
            const owner = await contract.ownerOf(tokenId);
            if (owner.toLowerCase() === address.toLowerCase()) {
              const ticketDetails = await contract.tickets(tokenId);
              const originalPrice = await contract.originalTicketPrice(tokenId);
              const eventDetails = await contract.events(ticketDetails.eventId);
              
              tickets.push({
                tokenId,
                eventId: Number(ticketDetails.eventId),
                eventName: eventDetails.name,
                seatNumber: Number(ticketDetails.seatNumber),
                isUsed: ticketDetails.isUsed,
                originalPrice: ethers.formatEther(originalPrice),
              });
            }
          } catch (error) {
            continue;
          }
        }
      }
      
      console.log(`📊 Total tickets found: ${tickets.length}`, tickets);
      setMyTickets(tickets);
    } catch (error) {
      console.error('❌ Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchListedTickets = async () => {
    console.log('🏪 START fetchListedTickets called');
    console.log('   MARKETPLACE_ADDRESS:', MARKETPLACE_ADDRESS);
    console.log('   address:', address);
    console.log('   marketplaceABI:', marketplaceABI ? 'loaded' : 'MISSING');

    try {
      if (!MARKETPLACE_ADDRESS) {
        console.error('❌ No marketplace address!');
        return;
      }

      console.log('🏪 Fetching listed tickets from marketplace...');
      console.log('   Marketplace address:', MARKETPLACE_ADDRESS);
      console.log('   Your address:', address);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceABI.abi, provider);
      const nftContract = new ethers.Contract(contractAddress, contractABI, provider);

      const listings = [];

      console.log('   Checking tokens 1-50 for active listings...');

      // Instead of querying events (which may timeout), check token IDs directly
      for (let tokenId = 1; tokenId <= 50; tokenId++) {
        try {
          const listing = await marketplace.getListing(tokenId);

          // Debug token 2 specifically
          if (tokenId === 2) {
            console.log(`   🔍 DEBUG Token 2 (the listed one):`);
            console.log(`      listing object:`, listing);
            console.log(`      listing.seller:`, listing.seller);
            console.log(`      listing.price:`, listing.price.toString());
            console.log(`      listing.active:`, listing.active);
            console.log(`      typeof listing.active:`, typeof listing.active);
          }

          // Only log if there's an active listing
          if (listing.active) {
            console.log(`   Token ${tokenId}:`);
            console.log(`      Seller: ${listing.seller}`);
            console.log(`      Price: ${ethers.formatEther(listing.price)} MATIC`);
            console.log(`      Active: ${listing.active}`);
            console.log(`      Is my listing: ${listing.seller.toLowerCase() === address?.toLowerCase()}`);

            if (listing.seller.toLowerCase() !== address?.toLowerCase()) {
              console.log(`      ✅ Adding to available tickets`);

              // Get ticket details
              const ticketDetails = await nftContract.tickets(tokenId);
              const originalPrice = await nftContract.originalTicketPrice(tokenId);
              const eventDetails = await nftContract.events(ticketDetails.eventId);

              listings.push({
                tokenId: Number(tokenId),
                seller: listing.seller,
                price: ethers.formatEther(listing.price),
                eventName: eventDetails.name,
                eventId: Number(ticketDetails.eventId),
                seatNumber: Number(ticketDetails.seatNumber),
                originalPrice: ethers.formatEther(originalPrice)
              });
            } else {
              console.log(`      ❌ Skipping: own listing`);
            }
          }
        } catch (error) {
          // Silently continue if listing doesn't exist
          continue;
        }
      }

      console.log(`📊 Active listings found: ${listings.length}`, listings);
      setListedTickets(listings);
    } catch (error) {
      console.error('❌ Error fetching listed tickets:', error);
    }
  };

  const buyTicket = async (listing) => {
    try {
      console.log('🛒 Buying ticket:', listing);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceABI.abi, signer);

      const priceInWei = ethers.parseEther(listing.price);

      console.log('💰 Purchasing with value:', priceInWei.toString());

      const tx = await marketplace.buyTicket(listing.tokenId, { value: priceInWei });

      alert(`🛒 Purchase transaction sent!\n\nHash: ${tx.hash}\n\nWaiting for confirmation...`);

      await tx.wait();

      alert(`🎉 Ticket Purchased Successfully!\n\nToken ID: ${listing.tokenId}\nEvent: ${listing.eventName}\nPrice: ${listing.price} MATIC\n\nThe NFT ticket has been transferred to your wallet!`);

      // Refresh both lists
      fetchMyTickets();
      fetchListedTickets();
    } catch (error) {
      console.error('❌ Error buying ticket:', error);
      let errorMessage = 'Unknown error occurred';

      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message?.includes('Insufficient payment')) {
        errorMessage = 'Insufficient MATIC for purchase';
      } else if (error.message) {
        errorMessage = error.message.length > 200 ?
          error.message.substring(0, 200) + '...' : error.message;
      }

      alert(`❌ Failed to purchase ticket\n\n${errorMessage}`);
    }
  };

  const calculateMaxResalePrice = (originalPrice) => {
    const original = parseFloat(originalPrice);
    const maxPrice = original + (original * maxMarkup / 100);
    console.log('💰 Calculating max resale price:');
    console.log('   Original price:', original);
    console.log('   Max markup %:', maxMarkup);
    console.log('   Calculated max price:', maxPrice);
    console.log('   Config loaded:', configLoaded);
    // Use more decimal places to avoid rounding issues
    return maxPrice.toFixed(6);
  };

  const handleListTicket = (ticket) => {
    if (!configLoaded) {
      alert('⏳ Loading marketplace configuration...\n\nPlease wait a moment and try again.');
      return;
    }
    console.log('🎫 Opening listing modal with maxMarkup:', maxMarkup);
    console.log('   Config loaded:', configLoaded);
    setSelectedTicket(ticket);
    setListingPrice('');
  };

  const confirmListing = async () => {
    if (!selectedTicket || !listingPrice) {
      alert('Please enter a listing price');
      return;
    }

    const price = parseFloat(listingPrice);
    const maxPriceStr = calculateMaxResalePrice(selectedTicket.originalPrice);
    const maxPrice = parseFloat(maxPriceStr);

    console.log('💵 Validating listing price:');
    console.log('   Entered price:', price);
    console.log('   Max allowed price:', maxPrice);
    console.log('   Max markup %:', maxMarkup);

    if (price > maxPrice) {
      alert(`❌ Price Too High\n\nYour price: ${price} MATIC\nMaximum allowed: ${maxPriceStr} MATIC\n\nThe contract only allows ${maxMarkup}% markup on the original price of ${selectedTicket.originalPrice} MATIC.\n\nPlease enter ${maxPriceStr} MATIC or less.`);
      return;
    }

    try {
      console.log('🎫 Creating marketplace listing...');
      console.log('   Token ID:', selectedTicket.tokenId);
      console.log('   Price:', price, 'MATIC');
      console.log('   Marketplace:', marketplaceAddress);
      console.log('   NFT Contract:', contractAddress);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      console.log('🌐 Network:', network.name, '(chainId:', network.chainId.toString() + ')');

      // Verify we're on the right network
      if (network.chainId !== 80002n) {
        alert('❌ Wrong Network\n\nPlease switch to Polygon Amoy Testnet (Chain ID: 80002) in MetaMask.');
        return;
      }

      // First, approve marketplace to transfer the NFT
      const nftContract = new ethers.Contract(contractAddress, contractABI, signer);
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceABI.abi, signer);

      // Verify ownership
      console.log('🔍 Verifying ticket ownership...');
      const owner = await nftContract.ownerOf(selectedTicket.tokenId);
      console.log('   Token owner:', owner);
      console.log('   Your address:', address);

      if (owner.toLowerCase() !== address.toLowerCase()) {
        alert('❌ You do not own this ticket!\n\nToken owner: ' + owner);
        return;
      }

      console.log('🔐 Checking approval...');
      const approved = await nftContract.getApproved(selectedTicket.tokenId);
      const isApprovedForAll = await nftContract.isApprovedForAll(address, MARKETPLACE_ADDRESS);

      console.log('   Currently approved:', approved);
      console.log('   Approved for all:', isApprovedForAll);

      if (approved !== MARKETPLACE_ADDRESS && !isApprovedForAll) {
        console.log('📝 Approving marketplace...');
        try {
          const approveTx = await nftContract.approve(MARKETPLACE_ADDRESS, selectedTicket.tokenId);
          alert(`🔐 Approval transaction sent!\n\nHash: ${approveTx.hash}\n\nWaiting for confirmation...`);
          await approveTx.wait();
          console.log('✅ Marketplace approved');
        } catch (approvalError) {
          console.error('Approval error details:', approvalError);
          throw new Error('Failed to approve marketplace: ' + approvalError.message);
        }
      } else {
        console.log('✅ Already approved');
      }

      // List the ticket
      const priceInWei = ethers.parseEther(price.toString());
      console.log('📝 Listing ticket with price:', priceInWei.toString());

      // Try to estimate gas first to catch revert errors
      try {
        console.log('⛽ Estimating gas for listing...');
        const gasEstimate = await marketplace.listTicket.estimateGas(
          selectedTicket.tokenId,
          priceInWei
        );
        console.log('   Gas estimate:', gasEstimate.toString());
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError);

        // Try to get the revert reason
        let revertReason = 'Unknown reason';
        if (gasError.message) {
          revertReason = gasError.message;
        }

        throw new Error('Transaction would fail: ' + revertReason);
      }

      const listTx = await marketplace.listTicket(selectedTicket.tokenId, priceInWei);
      alert(`📝 Listing transaction sent!\n\nHash: ${listTx.hash}\n\nWaiting for confirmation...`);

      await listTx.wait();

      alert(`🎉 Ticket Listed Successfully!\n\nToken ID: ${selectedTicket.tokenId}\nPrice: ${price} MATIC\n\nYour ticket is now available for purchase in the marketplace!`);

      setSelectedTicket(null);
      setListingPrice('');

      // Refresh tickets
      fetchMyTickets();
    } catch (error) {
      console.error('❌ Error listing ticket:', error);
      let errorMessage = 'Unknown error occurred';

      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message) {
        errorMessage = error.message.length > 200 ?
          error.message.substring(0, 200) + '...' : error.message;
      }

      alert(`❌ Failed to list ticket\n\n${errorMessage}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="page-container">
        <div className="page-header">
          <Link to="/home" className="back-btn">← Back to Home</Link>
          <h1>🏪 Ticket Marketplace</h1>
        </div>
        <p>Please connect your wallet to access the marketplace.</p>
      </div>
    );
  }

  if (officialMarketplace === ethers.ZeroAddress || officialMarketplace === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="page-container">
        <div className="page-header">
          <Link to="/home" className="back-btn">← Back to Home</Link>
          <h1>🏪 Ticket Marketplace</h1>
        </div>
        <div style={{
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3>⚠️ Marketplace Not Configured</h3>
          <p>The contract owner needs to configure the marketplace settings first.</p>
          <p>Please contact the administrator or visit the <Link to="/admin" style={{color: '#fbbf24'}}>Admin Panel</Link> if you are the owner.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/home" className="back-btn">← Back to Home</Link>
        <h1>🏪 Ticket Marketplace</h1>
        <p>Buy and sell event tickets with resale protection</p>
      </div>

      {/* Marketplace Info */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>📋 Marketplace Rules</h3>
        <p><strong>Maximum Markup:</strong> {maxMarkup}%</p>
        <p><strong>Official Marketplace:</strong> {MARKETPLACE_ADDRESS.slice(0, 10)}...{MARKETPLACE_ADDRESS.slice(-8)}</p>
        <p style={{fontSize: '14px', color: '#9ca3af', marginTop: '10px'}}>
          All resales must go through the official marketplace and cannot exceed the maximum markup percentage.
        </p>
      </div>

      {/* My Tickets Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2>🎫 My Tickets</h2>
        {isLoading ? (
          <p>Loading your tickets...</p>
        ) : myTickets.length === 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p>You don't own any tickets yet.</p>
            <Link to="/browse-events" style={{
              color: '#6366f1',
              textDecoration: 'underline'
            }}>Browse Events</Link>
          </div>
        ) : (
          <div className="events-grid">
            {myTickets.map((ticket) => (
              <div key={ticket.tokenId} style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3>{ticket.eventName}</h3>
                <p><strong>Token ID:</strong> #{ticket.tokenId}</p>
                <p><strong>Seat:</strong> {ticket.seatNumber}</p>
                <p><strong>Original Price:</strong> {ticket.originalPrice} MATIC</p>
                <p><strong>Max Resale Price:</strong> {calculateMaxResalePrice(ticket.originalPrice)} MATIC</p>
                <p><strong>Status:</strong> {ticket.isUsed ? '❌ Used' : '✅ Valid'}</p>
                
                {!ticket.isUsed && (
                  <button
                    onClick={() => handleListTicket(ticket)}
                    disabled={!configLoaded}
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginTop: '10px',
                      background: configLoaded ? '#6366f1' : '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: configLoaded ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold',
                      opacity: configLoaded ? 1 : 0.6
                    }}
                  >
                    {configLoaded ? '📝 List for Resale' : '⏳ Loading...'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Tickets for Purchase */}
      <div style={{ marginBottom: '40px' }}>
        <h2>🛒 Available Tickets</h2>
        {listedTickets.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
            No tickets currently listed for sale
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {listedTickets.map((listing) => (
              <div key={listing.tokenId} style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                padding: '20px',
                borderRadius: '8px'
              }}>
                <h3 style={{ marginTop: 0 }}>{listing.eventName}</h3>
                <p><strong>Token ID:</strong> #{listing.tokenId}</p>
                <p><strong>Seat:</strong> {listing.seatNumber}</p>
                <p><strong>Original Price:</strong> {listing.originalPrice} MATIC</p>
                <p><strong>Listing Price:</strong> {listing.price} MATIC</p>
                <p><strong>Seller:</strong> {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>

                <button
                  onClick={() => buyTicket(listing)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginTop: '10px',
                    background: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🛒 Buy for {listing.price} MATIC
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listing Modal */}
      {selectedTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1f2937',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2>List Ticket for Resale</h2>
            <p><strong>Event:</strong> {selectedTicket.eventName}</p>
            <p><strong>Token ID:</strong> #{selectedTicket.tokenId}</p>
            <p><strong>Original Price:</strong> {selectedTicket.originalPrice} MATIC</p>
            <p><strong>Maximum Allowed Price:</strong> {calculateMaxResalePrice(selectedTicket.originalPrice)} MATIC</p>
            
            <div style={{ marginTop: '20px' }}>
              <label>Listing Price (MATIC)</label>
              <input
                type="number"
                step="0.001"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder="Enter price"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  background: '#111827',
                  color: 'white'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={confirmListing}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Confirm Listing
              </button>
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setListingPrice('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
