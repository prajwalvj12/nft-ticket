# NFT Ticket Authentication Backend

Wallet-based authentication system using Sign-In with Ethereum (SIWE).

## Features

- Wallet signature authentication (no passwords needed)
- JWT token-based sessions
- MongoDB for user storage
- Automatic nonce generation and verification
- 7-day session tokens

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (running locally or use MongoDB Atlas)

## Setup

### 1. Install MongoDB

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows/Linux:**
Download from [MongoDB Downloads](https://www.mongodb.com/try/download/community)

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Environment Variables

The `.env` file is already created with defaults:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nft-tickets
JWT_SECRET=nft-ticket-secret-key-change-in-production-12345
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**⚠️ IMPORTANT:** Change `JWT_SECRET` before production!

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### POST `/api/auth/nonce`
Get a nonce for wallet signing.

**Request:**
```json
{
  "walletAddress": "0x1234..."
}
```

**Response:**
```json
{
  "nonce": "123456"
}
```

### POST `/api/auth/verify`
Verify signature and get JWT token.

**Request:**
```json
{
  "message": "SIWE message string",
  "signature": "0xabc..."
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "walletAddress": "0x1234...",
    "name": "User",
    "email": ""
  }
}
```

### GET `/api/auth/me`
Get current user (requires JWT token).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "walletAddress": "0x1234...",
    "name": "User",
    "email": "",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT `/api/auth/profile`
Update user profile (requires JWT token).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

## Authentication Flow

1. User connects wallet on frontend
2. Frontend requests nonce from `/api/auth/nonce`
3. Frontend creates SIWE message with nonce
4. User signs message with wallet
5. Frontend sends message + signature to `/api/auth/verify`
6. Backend verifies signature and issues JWT token
7. Frontend stores token and uses it for authenticated requests

## Database Schema

**User Collection:**
```javascript
{
  walletAddress: String (unique, lowercase),
  name: String,
  email: String,
  nonce: String (for signature verification),
  createdAt: Date,
  lastLogin: Date
}
```

## Security Notes

- Nonces are regenerated after each successful login
- JWT tokens expire after 7 days
- Wallet addresses are stored in lowercase
- CORS is configured for frontend URL only
- Never expose JWT_SECRET in production

## Troubleshooting

**MongoDB Connection Error:**
- Make sure MongoDB is running: `brew services list` (macOS)
- Check connection string in `.env`

**CORS Errors:**
- Verify `FRONTEND_URL` matches your frontend dev server

**Token Verification Fails:**
- Check if JWT_SECRET is consistent
- Ensure token is sent in Authorization header
