import axios from 'axios';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

/**
 * Upload JSON metadata to IPFS via Pinata
 * @param {Object} metadata - The metadata object to upload
 * @returns {Promise<string>} - The IPFS hash (CID)
 */
export async function uploadMetadataToIPFS(metadata) {
  try {
    // Use JWT if available, otherwise fall back to API key/secret
    const headers = PINATA_JWT
      ? {
          'Authorization': `Bearer ${PINATA_JWT}`,
          'Content-Type': 'application/json'
        }
      : {
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY,
          'Content-Type': 'application/json'
        };

    const data = JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `ticket-${metadata.tokenId || Date.now()}.json`
      }
    });

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      data,
      { headers }
    );

    console.log('✅ Metadata uploaded to IPFS:', response.data);
    return response.data.IpfsHash;
  } catch (error) {
    console.error('❌ Error uploading to IPFS:', error);
    throw new Error('Failed to upload metadata to IPFS: ' + error.message);
  }
}

/**
 * Upload an image to IPFS via Pinata
 * @param {File|Blob} file - The image file to upload
 * @returns {Promise<string>} - The IPFS hash (CID)
 */
export async function uploadImageToIPFS(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name || `image-${Date.now()}`
    });
    formData.append('pinataMetadata', metadata);

    const headers = PINATA_JWT
      ? {
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      : {
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        };

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers,
        maxBodyLength: 'Infinity'
      }
    );

    console.log('✅ Image uploaded to IPFS:', response.data);
    return response.data.IpfsHash;
  } catch (error) {
    console.error('❌ Error uploading image to IPFS:', error);
    throw new Error('Failed to upload image to IPFS: ' + error.message);
  }
}

/**
 * Get the gateway URL for an IPFS hash
 * @param {string} ipfsHash - The IPFS hash (CID)
 * @returns {string} - The full gateway URL
 */
export function getIPFSGatewayURL(ipfsHash) {
  // Use Pinata's gateway for faster loading
  return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
}

/**
 * Create ticket metadata with QR code
 * @param {Object} ticketData - The ticket data
 * @returns {Object} - Complete metadata object
 */
export function createTicketMetadata(ticketData) {
  const {
    tokenId,
    eventId,
    eventName,
    eventDate,
    seatNumber,
    price,
    owner,
    qrCodeDataURL
  } = ticketData;

  return {
    name: `Event Ticket #${tokenId}`,
    description: `NFT Ticket for ${eventName}`,
    image: qrCodeDataURL || "https://via.placeholder.com/400x300/6366f1/ffffff?text=TICKET",
    external_url: `https://securetickets.app/ticket/${tokenId}`,
    attributes: [
      {
        trait_type: "Token ID",
        value: tokenId
      },
      {
        trait_type: "Event ID",
        value: eventId
      },
      {
        trait_type: "Event Name",
        value: eventName
      },
      {
        trait_type: "Event Date",
        value: eventDate
      },
      {
        trait_type: "Seat Number",
        value: seatNumber
      },
      {
        trait_type: "Price",
        value: `${price} MATIC`
      },
      {
        trait_type: "Ticket Type",
        value: "General Admission"
      }
    ]
  };
}

/**
 * Check if Pinata credentials are configured
 * @returns {boolean} - True if credentials are available
 */
export function isPinataConfigured() {
  return !!(PINATA_JWT || (PINATA_API_KEY && PINATA_SECRET_KEY));
}
