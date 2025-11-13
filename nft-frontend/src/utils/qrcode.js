import QRCode from 'qrcode';

/**
 * Generate QR code for a ticket
 * @param {Object} ticketData - The ticket information
 * @returns {Promise<string>} - Data URL of the QR code image
 */
export async function generateTicketQRCode(ticketData) {
  try {
    console.log('[QR Generator] Starting QR code generation...');
    console.log('[QR Generator] Input data:', ticketData);

    const { tokenId, eventId, owner } = ticketData;

    if (!tokenId || !eventId || !owner) {
      throw new Error(`Missing required fields: tokenId=${tokenId}, eventId=${eventId}, owner=${owner}`);
    }

    // Create a verification URL or data string
    const qrData = JSON.stringify({
      tokenId,
      eventId,
      owner,
      timestamp: Date.now(),
      verifyUrl: `https://securetickets.app/verify/${tokenId}`
    });

    console.log('[QR Generator] QR data string:', qrData);
    console.log('[QR Generator] QR data length:', qrData.length);

    // Generate QR code as data URL
    console.log('[QR Generator] Calling QRCode.toDataURL...');
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 400
    });

    console.log('[QR Generator] ✅ QR code generated successfully!');
    console.log('[QR Generator] Data URL length:', qrCodeDataURL.length);
    console.log('[QR Generator] Data URL preview:', qrCodeDataURL.substring(0, 50));

    if (!qrCodeDataURL.startsWith('data:image/png;base64,')) {
      throw new Error('QR code generation returned invalid format');
    }

    return qrCodeDataURL;
  } catch (error) {
    console.error('[QR Generator] ❌ Error generating QR code:', error);
    console.error('[QR Generator] Error stack:', error.stack);
    throw new Error('Failed to generate QR code: ' + error.message);
  }
}

/**
 * Generate QR code canvas element
 * @param {Object} ticketData - The ticket information
 * @param {HTMLCanvasElement} canvas - Canvas element to render to
 * @returns {Promise<void>}
 */
export async function generateQRCodeToCanvas(ticketData, canvas) {
  try {
    const { tokenId, eventId, owner } = ticketData;

    const qrData = JSON.stringify({
      tokenId,
      eventId,
      owner,
      timestamp: Date.now(),
      verifyUrl: `https://securetickets.app/verify/${tokenId}`
    });

    await QRCode.toCanvas(canvas, qrData, {
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 400
    });
  } catch (error) {
    console.error('Error generating QR code to canvas:', error);
    throw error;
  }
}

/**
 * Parse QR code data
 * @param {string} qrDataString - The scanned QR code data
 * @returns {Object} - Parsed ticket information
 */
export function parseQRCodeData(qrDataString) {
  try {
    const data = JSON.parse(qrDataString);
    return {
      tokenId: data.tokenId,
      eventId: data.eventId,
      owner: data.owner,
      timestamp: data.timestamp,
      verifyUrl: data.verifyUrl
    };
  } catch (error) {
    console.error('Error parsing QR code data:', error);
    throw new Error('Invalid QR code format');
  }
}

/**
 * Generate a simple verification QR code with just the token ID
 * @param {number} tokenId - The token ID
 * @returns {Promise<string>} - Data URL of the QR code image
 */
export async function generateSimpleQRCode(tokenId) {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(tokenId.toString(), {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating simple QR code:', error);
    throw error;
  }
}
