import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import AOS from 'aos'
import 'aos/dist/aos.css'
import './index.css'
import App from './App.tsx'
import AuthCallback from './pages/AuthCallback.tsx'
import Home from './pages/Home.tsx'
import AdminPanel from './pages/AdminPanel.tsx'
import BiddingInterface from './pages/BiddingInterface.tsx'
import CreateAuction from './pages/CreateAuction.tsx'
import ManageAuctions from './pages/ManageAuctions.tsx'
import AuctionDetail from './pages/AuctionDetail.tsx'
import UserManagement from './pages/UserManagement.tsx'
import AuctionListing from './pages/AuctionListing.tsx'
import Profile from './pages/Profile.tsx'
import LiveMonitoring from './pages/LiveMonitoring.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

AOS.init({
  duration: 1000,
  once: false,
  offset: 100,
  mirror: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/create-auction" element={<CreateAuction />} />
          <Route path="/admin/manage-auctions" element={<ManageAuctions />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/live-monitoring" element={<LiveMonitoring />} />
          <Route path="/admin/auction-listing/:id" element={<AuctionListing />} />
          <Route path="/bidding" element={<BiddingInterface />} />
          <Route path="/auctions/:id" element={<AuctionDetail />} />
        </Routes>
      </AuthProvider>
    </Router>
  </StrictMode>,
)
