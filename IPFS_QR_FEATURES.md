# IPFS and QR Code Features

This document explains the newly implemented IPFS integration and QR code functionality for the NFT Ticketing system.

## Features Overview

### 1. IPFS Integration (Decentralized Metadata Storage)

**What is it?**
- IPFS (InterPlanetary File System) is a decentralized storage network
- Ticket metadata is stored permanently on IPFS instead of centralized servers
- Provides censorship resistance and data permanence

**How it works:**
1. When a ticket is minted, metadata is automatically uploaded to IPFS via Pinata
2. The IPFS hash (CID) is stored in the NFT as the tokenURI
3. Anyone can retrieve the metadata using the IPFS hash

**Setup:**
1. Create a free account at [Pinata Cloud](https://app.pinata.cloud/)
2. Get your API credentials (JWT token recommended)
3. Add credentials to `nft-frontend/.env`:
   ```bash
   VITE_PINATA_JWT=your_jwt_token_here
   ```

**Benefits:**
- ✅ Decentralized - no single point of failure
- ✅ Permanent - data cannot be deleted
- ✅ Verifiable - anyone can access and verify metadata
- ✅ Censorship-resistant

### 2. QR Code Generation

**What is it?**
- Each ticket gets a unique QR code containing ticket information
- QR code is embedded in the NFT metadata
- Can be scanned for instant verification

**How it works:**
1. During minting, a QR code is automatically generated
2. QR code contains: Token ID, Event ID, Owner address, Timestamp
3. QR code image is included in the NFT metadata
4. Users can display their QR code for venue entry

**QR Code Data Format:**
```json
{
  "tokenId": 123,
  "eventId": 1,
  "owner": "0x...",
  "timestamp": 1234567890,
  "verifyUrl": "https://securetickets.app/verify/123"
}
```

### 3. QR Code Scanning

**What is it?**
- Built-in camera-based QR code scanner
- Instant ticket verification at venue entrances
- Works on mobile and desktop browsers

**How to use:**
1. Go to the "Verify Tickets" page
2. Click "📷 Scan QR Code" button
3. Point camera at ticket QR code
4. Ticket is automatically verified

**Requirements:**
- Camera access permission
- HTTPS connection (required by browsers for camera access)
- Compatible browser (Chrome, Firefox, Safari, Edge)

## Technical Implementation

### Files Added/Modified

**New Utility Files:**
- `nft-frontend/src/utils/ipfs.js` - IPFS upload and metadata creation
- `nft-frontend/src/utils/qrcode.js` - QR code generation and parsing

**Modified Pages:**
- `nft-frontend/src/pages/BrowseEvents.jsx` - Integrated IPFS + QR for ticket minting
- `nft-frontend/src/pages/VerifyTickets.jsx` - Added QR scanning capability

**NPM Packages Added:**
- `qrcode` - QR code generation
- `html5-qrcode` - QR code scanning
- `axios` - HTTP requests for Pinata API

### Key Functions

**IPFS Functions:**
```javascript
// Upload metadata to IPFS
await uploadMetadataToIPFS(metadata);

// Create ticket metadata
createTicketMetadata(ticketData);

// Get IPFS gateway URL
getIPFSGatewayURL(ipfsHash);

// Check if Pinata is configured
isPinataConfigured();
```

**QR Code Functions:**
```javascript
// Generate QR code for ticket
await generateTicketQRCode(ticketData);

// Generate simple QR code
await generateSimpleQRCode(tokenId);

// Parse scanned QR data
parseQRCodeData(qrDataString);
```

## Usage Guide

### For Event Organizers

1. **Create Event:**
   - Events are created the same way as before
   - No additional setup needed

2. **IPFS Setup (Optional but Recommended):**
   - Get Pinata credentials
   - Add to `.env` file
   - Restart frontend application

### For Ticket Buyers

1. **Purchase Ticket:**
   - Purchase works automatically with IPFS
   - If IPFS is configured, metadata is stored on IPFS
   - If not configured, fallback to centralized storage

2. **View Your Ticket:**
   - Check MetaMask wallet (NFTs section)
   - NFT image will show the QR code
   - Metadata stored on IPFS is permanent

### For Venue Staff

1. **Verify Tickets:**
   - Go to "Verify Tickets" page
   - Click "Scan QR Code"
   - Allow camera access
   - Point at ticket QR code
   - Ticket is instantly verified

2. **Manual Verification:**
   - Enter Token ID manually
   - Click "Verify Ticket"
   - View ticket details and status

## Fallback Behavior

The system gracefully handles cases where IPFS is not configured:

- **No IPFS credentials?** ✅ Uses centralized URL instead
- **QR generation fails?** ✅ Continues without QR code
- **IPFS upload fails?** ✅ Falls back to centralized storage
- **Camera not available?** ✅ Manual Token ID entry works

## Security Considerations

### IPFS Storage
- ✅ Metadata is immutable once uploaded
- ✅ No personal information stored on-chain
- ✅ QR codes can be displayed safely

### QR Codes
- ✅ QR codes are not transferable
- ✅ Contain verification timestamp
- ✅ Can only be used by ticket owner
- ⚠️ Do not share QR code publicly (someone could verify your ticket)

### Camera Scanning
- ✅ Camera access is local only
- ✅ No data sent to external servers
- ✅ Scanning happens in browser

## Testing

### Test IPFS Integration

1. Set up Pinata credentials
2. Purchase a ticket
3. Check console logs for IPFS hash
4. Visit: `https://gateway.pinata.cloud/ipfs/{hash}`
5. Verify metadata is accessible

### Test QR Scanning

1. Purchase a ticket with IPFS enabled
2. View NFT in MetaMask (QR code should be visible)
3. Open "Verify Tickets" page
4. Click "Scan QR Code"
5. Point camera at the QR code
6. Verify automatic verification works

## Troubleshooting

### IPFS Upload Fails
- Check Pinata credentials are correct
- Ensure API key has upload permissions
- Check internet connectivity
- View browser console for error details

### QR Scanning Not Working
- Ensure HTTPS is being used
- Check camera permissions in browser
- Try a different browser
- Ensure good lighting for camera
- Check if QR code is clear and visible

### Camera Access Denied
- Go to browser settings
- Allow camera access for the website
- Refresh the page
- Try the "Scan QR Code" button again

## Cost Considerations

### IPFS Storage (Pinata)
- **Free Tier:** 1 GB storage, 100 MB bandwidth/month
- **Sufficient for:** ~10,000 tickets with QR codes
- **Upgrade if needed:** Paid plans available

### Transaction Costs
- No additional gas fees for using IPFS
- Metadata upload happens off-chain
- Only minting transaction costs gas

## Future Enhancements

Potential improvements:
- [ ] Batch minting with IPFS
- [ ] Encrypted metadata for VIP tickets
- [ ] NFC tag integration alongside QR codes
- [ ] Mobile app for easier scanning
- [ ] Offline QR verification
- [ ] QR code customization (colors, logos)

## Support

For issues or questions:
- Check browser console for error messages
- Verify all environment variables are set
- Ensure latest version of all dependencies
- Test with Pinata API directly if upload fails
