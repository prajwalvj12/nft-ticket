import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { AuthProvider } from './context/AuthContext';

import LandingPage from "./components/LandingPage";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import MintTickets from "./pages/MintTickets";
import BrowseEvents from "./pages/BrowseEvents";
import VerifyTickets from "./pages/VerifyTickets";
import Admin from "./pages/Admin";
import Marketplace from "./pages/Marketplace";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";
import "./styles/Auth.css";
import "./styles/Pages.css";
import "./styles/Dashboard.css";

const config = getDefaultConfig({
  appName: "SecureTickets",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [polygonAmoy],
  ssr: false,
});

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/home" element={<Home />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/mint-tickets" element={<ProtectedRoute><MintTickets /></ProtectedRoute>} />
                <Route path="/browse-events" element={<ProtectedRoute><BrowseEvents /></ProtectedRoute>} />
                <Route path="/verify-tickets" element={<ProtectedRoute><VerifyTickets /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
              </Routes>
            </Router>
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
