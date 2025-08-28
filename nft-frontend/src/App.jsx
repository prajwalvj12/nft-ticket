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
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import MintTickets from "./pages/MintTickets";
import BrowseEvents from "./pages/BrowseEvents";
import VerifyTickets from "./pages/VerifyTickets";
import "./App.css";
import "./styles/Auth.css";
import "./styles/Pages.css";

const config = getDefaultConfig({
  appName: "SecureTickets",
  projectId: "e3b38f2f396e5fccc8caf599813ab14a",
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
                <Route path="/signup" element={<Signup />} />
                <Route path="/home" element={<Home />} />
                <Route path="/mint-tickets" element={<MintTickets />} />
                <Route path="/browse-events" element={<BrowseEvents />} />
                <Route path="/verify-tickets" element={<VerifyTickets />} />
              </Routes>
            </Router>
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
