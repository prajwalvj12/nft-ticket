const { SiweMessage } = require('siwe');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate nonce for wallet signing
exports.getNonce = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Find or create user
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!user) {
      // Create new user with random alphanumeric nonce
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let nonce = '';
      for (let i = 0; i < 16; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        nonce: nonce
      });
      await user.save();
    } else {
      // Generate new nonce for existing user
      user.generateNonce();
      await user.save();
    }

    res.json({ nonce: user.nonce });
  } catch (error) {
    console.error('Get nonce error:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
};

// Verify signature and issue JWT
exports.verify = async (req, res) => {
  try {
    const { message, signature } = req.body;

    if (!message || !signature) {
      return res.status(400).json({ error: 'Message and signature are required' });
    }

    // Parse and validate SIWE message
    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.verify({ signature });

    if (!fields.success) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Find user and verify nonce
    const user = await User.findOne({
      walletAddress: siweMessage.address.toLowerCase()
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.nonce !== siweMessage.nonce) {
      return res.status(401).json({ error: 'Invalid nonce' });
    }

    // Update last login and generate new nonce
    user.lastLogin = new Date();
    user.generateNonce();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name || 'User',
        email: user.email
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Failed to verify signature' });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-nonce');

    res.json({
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name || 'User',
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
