import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { getPlaceholderImage } from '../utils/placeholder'
import ChatbotModal from '../components/ChatbotModal'
import { initSocket, joinAuction, leaveAuction, onBidPlaced, offBidPlaced } from '../lib/socket'
import { getApiUrl } from '../lib/api'

interface Auction {
  id: number
  title: string
  description: string
  starting_bid: number
  current_bid: number
  category: string
  duration_hours: number
  image_url: string
  created_at: string
  expires_at: string
  bids: number
  status: string
  seller_email: string
}

interface TopBid {
  id: number
  bid_amount: number
  created_at: string
  bidder_email: string
}

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [topBids, setTopBids] = useState<TopBid[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bidAmount, setBidAmount] = useState('')
  const [bidding, setBidding] = useState(false)
  const [bidError, setBidError] = useState('')
  const [bidSuccess, setBidSuccess] = useState('')
  const [chatbotOpen, setChatbotOpen] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [newBidAlert, setNewBidAlert] = useState<{bidder: string, amount: number} | null>(null)
  const [sniperShieldAlert, setSniperShieldAlert] = useState<{seconds: number} | null>(null)
  const [creditBalance, setCreditBalance] = useState(0)
  const [requestingAccess, setRequestingAccess] = useState(false)
  const [hasRequestedAccess, setHasRequestedAccess] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    fetchAuction()
    checkBiddingStatus()
    
    // Fetch auction-specific credit balance
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('jwt_token')
        if (!token || !id) return
        const response = await fetch(getApiUrl(`/api/auction-credits/auction/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setCreditBalance(parseFloat(data.remaining_credits || 0))
        }
      } catch (err) {
        console.error('Error fetching auction credit balance:', err)
      }
    }
    fetchBalance()
    
    // Initialize WebSocket and join auction room
    initSocket()
    if (id) {
      joinAuction(parseInt(id))
    }

    // Listen for bid updates
    const handleBidPlaced = (data: any) => {
      if (data.auctionId === parseInt(id!)) {
        setAuction((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            current_bid: data.bidAmount,
            bids: prev.bids + 1,
            expires_at: data.expiresAt, // Update expiry time if extended
          }
        })
        // Refresh top bids
        fetchTopBids()
        // Show alert notification
        setNewBidAlert({
          bidder: data.bidderEmail.split('@')[0],
          amount: data.bidAmount
        })
        // Auto dismiss after 5 seconds
        setTimeout(() => setNewBidAlert(null), 5000)
        
        // Show Sniper-Shield alert if time was extended
        if (data.timeExtended) {
          setSniperShieldAlert({ seconds: data.extensionSeconds })
          setTimeout(() => setSniperShieldAlert(null), 7000)
        }
      }
    }

    onBidPlaced(handleBidPlaced)

    return () => {
      if (id) {
        leaveAuction(parseInt(id))
      }
      offBidPlaced(handleBidPlaced)
    }
  }, [id])

  // Update time remaining every second
  useEffect(() => {
    if (!auction) return

    const updateTimer = () => {
      setTimeRemaining(getTimeRemaining(auction.expires_at))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [auction])

  const fetchAuction = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(getApiUrl(`/api/auctions/${id}`)

      if (!response.ok) {
        throw new Error('Failed to fetch auction')
      }

      const data = await response.json()
      setAuction({
        ...data.auction,
        current_bid: parseFloat(data.auction.current_bid),
        starting_bid: parseFloat(data.auction.starting_bid),
      })
      setBidAmount((parseFloat(data.auction.current_bid) + 1).toFixed(2))
      
      // Fetch top bids
      fetchTopBids()
    } catch (err) {
      console.error('Error fetching auction:', err)
      setError(err instanceof Error ? err.message : 'Failed to load auction')
    } finally {
      setLoading(false)
    }
  }

  const fetchTopBids = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/auctions/${id}/top-bids`)
      if (response.ok) {
        const data = await response.json()
        setTopBids(data.topBids.map((bid: any) => ({
          ...bid,
          bid_amount: parseFloat(bid.bid_amount)
        })))
      }
    } catch (err) {
      console.error('Error fetching top bids:', err)
    }
  }

  const checkBiddingStatus = async () => {
    try {
      setCheckingStatus(true)
      const token = localStorage.getItem('jwt_token')
      if (!token) {
        setCheckingStatus(false)
        return
      }

      const response = await fetch(getApiUrl(`/api/bidding/requests/${id}/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Bidding status response:', data)
        // Only set hasRequestedAccess if status is pending or approved
        // If rejected or none, allow user to request again
        setHasRequestedAccess(data.status === 'pending' || data.status === 'approved')
        console.log('hasRequestedAccess set to:', data.status === 'pending' || data.status === 'approved')
      }
    } catch (err) {
      console.error('Error checking bidding status:', err)
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleRequestAccess = async () => {
    try {
      setRequestingAccess(true)
      setBidError('')
      const token = localStorage.getItem('jwt_token')
      
      if (!token) {
        setBidError('Please log in to request access')
        navigate('/auth')
        return
      }

      const response = await fetch(getApiUrl(`/api/bidding/requests/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request')
      }

      setBidSuccess('✅ Bidding request submitted! Wait for seller approval.')
      setHasRequestedAccess(true)
    } catch (err) {
      console.error('Error requesting access:', err)
      setBidError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setRequestingAccess(false)
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const diff = expiry - now

    if (diff <= 0) return 'Expired'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`
    return `${hours}h ${minutes}m ${seconds}s`
  }

  const isAuctionExpired = () => {
    if (!auction) return false
    return new Date(auction.expires_at) <= new Date()
  }

  const isOwnAuction = () => {
    if (!user || !auction) return false
    return auction.seller_email === user.email
  }

  const isApprovedBidder = () => {
    return hasRequestedAccess
  }

  const hasCreditsAssigned = () => {
    return creditBalance > 0
  }

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault()
    setBidError('')
    setBidSuccess('')

    if (!user) {
      setBidError('Please log in to place a bid')
      navigate('/auth')
      return
    }

    if (isOwnAuction()) {
      setBidError('You cannot bid on your own auction')
      return
    }

    if (isAuctionExpired()) {
      setBidError('This auction has expired')
      return
    }

    const bid = parseFloat(bidAmount)
    if (isNaN(bid) || bid <= auction!.current_bid) {
      setBidError(`Bid must be higher than $${auction!.current_bid.toFixed(2)}`)
      return
    }

    // Check if user has enough credits
    if (creditBalance < bid) {
      setBidError(`Insufficient credits. You have $${creditBalance.toFixed(2)} but need $${bid.toFixed(2)}`)
      return
    }

    setBidding(true)

    try {
      const token = localStorage.getItem('jwt_token')
      if (!token) {
        setBidError('Authentication token not found. Please log in again.')
        navigate('/auth')
        return
      }

      const response = await fetch(getApiUrl(`/api/auctions/${id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bidAmount: bid }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place bid')
      }

      setBidSuccess('✅ Bid placed successfully!')
      setBidAmount((bid + 1).toFixed(2))
      fetchAuction()
    } catch (err) {
      console.error('Error placing bid:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to place bid'
      setBidError(errorMessage)
      
      // If not approved, show request button
      if (errorMessage.includes('not approved')) {
        setHasRequestedAccess(false)
      }
    } finally {
      setBidding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-vh-100 bg-dark text-white">
        <Navbar showBackButton={true} />
        <div className="container py-5">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-3">Loading auction details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !auction) {
    return (
      <div className="min-vh-100 bg-dark text-white">
        <Navbar showBackButton={true} />
        <div className="container py-5">
          <div className="alert alert-danger" role="alert">
            {error || 'Auction not found'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100 bg-dark text-white">
      <Navbar showBackButton={true} />

      <div className="container d-flex flex-column justify-content-center align-items-center py-4 py-md-5" style={{ minHeight: 'auto', scrollbarGutter: 'stable' }}>
        {/* New Bid Alert */}
        {newBidAlert && (
          <div className="alert alert-info alert-dismissible fade show w-100 mb-4" role="alert" data-aos="fade-down">
            <strong>🎉 New Bid Placed!</strong> ${newBidAlert.amount.toFixed(2)} by {newBidAlert.bidder}
            <button
              type="button"
              className="btn-close"
              onClick={() => setNewBidAlert(null)}
              aria-label="Close"
            />
          </div>
        )}

        {/* Sniper-Shield Alert */}
        {sniperShieldAlert && (
          <div className="alert alert-warning alert-dismissible fade show w-100 mb-4" role="alert" data-aos="fade-down">
            <strong>🛡️ Sniper-Shield Activated!</strong> Auction time extended by {sniperShieldAlert.seconds} seconds to ensure fair bidding.
            <button
              type="button"
              className="btn-close"
              onClick={() => setSniperShieldAlert(null)}
              aria-label="Close"
            />
          </div>
        )}

        <div className="row g-3 g-lg-4 w-100">
          {/* Image Section */}
          <div className="col-12 col-lg-6" data-aos="fade-right">
            <div className="card bg-dark-card border-secondary h-100">
              <img
                src={auction.image_url || getPlaceholderImage(500, 400)}
                className="card-img-top"
                alt={auction.title}
                style={{ height: '250px', objectFit: 'cover', minHeight: '250px' }}
              />
              
              {/* Top 3 Bids Section - Only show if user is approved and has credits */}
              <div className="card-body p-3">
                {checkingStatus ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted small mt-2 mb-0">Loading...</p>
                  </div>
                ) : user && !isOwnAuction() && isApprovedBidder() && hasCreditsAssigned() ? (
                  <>
                    <h5 className="mb-3" style={{ color: 'var(--teal)' }}>Top Bids</h5>
                    {topBids.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {topBids.map((bid, index) => (
                          <div
                            key={bid.id}
                            className={`p-2 rounded d-flex justify-content-between align-items-center ${
                              index === 0 ? 'bg-warning bg-opacity-25 border border-warning' : 'bg-dark'
                            }`}
                          >
                            <div>
                              <span className="badge bg-secondary me-2">#{index + 1}</span>
                              <small className="text-muted">{bid.bidder_email.split('@')[0]}</small>
                            </div>
                            <div className="text-end">
                              <strong className={index === 0 ? 'text-warning' : 'text-white'}>
                                ${bid.bid_amount.toFixed(2)}
                              </strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted small mb-0">No bids yet. Be the first to bid!</p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="mb-3">
                      <span style={{ fontSize: '3rem' }}>🔒</span>
                    </div>
                    <p className="text-muted small mb-0">
                      {!user ? 'Login to view bids' : isOwnAuction() ? 'Your auction' : !isApprovedBidder() ? 'Request approval to view bids' : 'Wait for credits to view bids'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="col-12 col-lg-6" data-aos="fade-left">
            <div className="card bg-dark-card border-secondary h-100" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-body p-3 p-md-4" style={{ overflowY: 'auto', flex: 1 }}>
                {/* Title */}
                <h1 className="h3 h-md-2 fw-bold mb-3" style={{ color: 'var(--teal)' }}>
                  {auction.title}
                </h1>

                {/* Category & Status */}
                <div className="mb-3 mb-md-4">
                  <span className="badge bg-secondary me-2 mb-2">{auction.category}</span>
                  <span className={`badge ${isAuctionExpired() ? 'bg-danger' : 'bg-success'} mb-2`}>
                    {isAuctionExpired() ? 'Expired' : 'Active'}
                  </span>
                </div>

                {/* Ask AI Assistant Button */}
                <button
                  className="btn btn-info w-100 btn-sm mb-3 mb-md-4"
                  onClick={() => setChatbotOpen(true)}
                >
                  💬 Ask Product Assistant
                </button>

                {/* Time Remaining */}
                <div className="mb-3 mb-md-4 p-2 p-md-3 bg-dark rounded">
                  <small className="text-muted d-block">Time Remaining</small>
                  <h5 className="text-warning mb-0">{timeRemaining || getTimeRemaining(auction.expires_at)}</h5>
                </div>

                {/* Bid Information - Only show if approved AND has credits */}
                {user && !isOwnAuction() && !checkingStatus && isApprovedBidder() && hasCreditsAssigned() && (
                  <>
                    <div className="row g-2 mb-3 mb-md-4">
                      <div className="col-6">
                        <div className="p-2 p-md-3 bg-dark rounded">
                          <small className="text-muted d-block">Starting Bid</small>
                          <h6 className="text-white mb-0">${auction.starting_bid.toFixed(2)}</h6>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 p-md-3 bg-dark rounded">
                          <small className="text-muted d-block">Current Bid</small>
                          <h6 className="text-primary mb-0">${auction.current_bid.toFixed(2)}</h6>
                        </div>
                      </div>
                    </div>

                    {/* Bid Count */}
                    <div className="mb-3 mb-md-4 p-2 p-md-3 bg-dark rounded">
                      <small className="text-muted d-block">Total Bids</small>
                      <h5 className="text-white mb-0">{auction.bids}</h5>
                    </div>

                    {/* Credit Balance */}
                    <div className="mb-3 mb-md-4 p-2 p-md-3 bg-dark rounded">
                      <small className="text-muted d-block">Your Credit Balance</small>
                      <h5 className="mb-0" style={{ color: creditBalance < auction.current_bid ? '#dc3545' : 'var(--teal)' }}>
                        ${creditBalance.toFixed(2)}
                      </h5>
                      {creditBalance < auction.current_bid && (
                        <small className="text-danger d-block mt-1">
                          ⚠️ Insufficient credits for next bid
                        </small>
                      )}
                    </div>
                  </>
                )}

                {/* Seller Info */}
                <div className="mb-3 mb-md-4 p-2 p-md-3 bg-dark rounded">
                  <small className="text-muted d-block">Seller</small>
                  <h6 className="text-white mb-0 text-break">{auction.seller_email}</h6>
                </div>

                {/* Error Message */}
                {bidError && (
                  <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
                    <small>{bidError}</small>
                    <button
                      type="button"
                      className="btn-close btn-sm"
                      onClick={() => setBidError('')}
                    />
                  </div>
                )}

                {/* Success Message */}
                {bidSuccess && (
                  <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
                    <small>{bidSuccess}</small>
                    <button
                      type="button"
                      className="btn-close btn-sm"
                      onClick={() => setBidSuccess('')}
                    />
                  </div>
                )}

                {/* Bid Form */}
                {!isAuctionExpired() && !isOwnAuction() ? (
                  <>
                    {!user ? (
                      <div className="alert alert-info mb-3 py-2 px-3">
                        <small><strong>Login Required</strong> - Please log in to place bids</small>
                      </div>
                    ) : checkingStatus ? (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Checking status...</span>
                        </div>
                        <p className="text-muted small mt-2 mb-0">Checking bidding status...</p>
                      </div>
                    ) : !isApprovedBidder() ? (
                      <div className="mb-3">
                        <div className="alert alert-warning mb-3 py-2 px-3">
                          <small><strong>Approval Required</strong> - Request approval to bid on this auction</small>
                        </div>
                        <button
                          type="button"
                          className="btn btn-warning w-100 mb-2 btn-sm"
                          onClick={handleRequestAccess}
                          disabled={requestingAccess || hasRequestedAccess}
                        >
                          {requestingAccess ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" />
                              Requesting...
                            </>
                          ) : hasRequestedAccess ? (
                            '✅ Request Pending'
                          ) : (
                            '📝 Request Bidding Access'
                          )}
                        </button>
                      </div>
                    ) : !hasCreditsAssigned() ? (
                      <div className="alert alert-info mb-3 py-2 px-3">
                        <small><strong>Credits Required</strong> - Wait for admin to assign credits to your account</small>
                      </div>
                    ) : (
                      <form onSubmit={handlePlaceBid}>
                        <div className="mb-3">
                          <label htmlFor="bidAmount" className="form-label">
                            Your Bid
                          </label>
                          <div className="input-group input-group-sm">
                            <span className="input-group-text">$</span>
                            <input
                              type="number"
                              className="form-control"
                              id="bidAmount"
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)}
                              min={auction.current_bid + 0.01}
                              step="0.01"
                              disabled={bidding}
                              required
                            />
                          </div>
                          <small className="text-muted d-block mt-2">
                            Min: ${(auction.current_bid + 0.01).toFixed(2)}
                          </small>
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary w-100 mb-2 btn-sm"
                          disabled={bidding || isAuctionExpired()}
                        >
                          {bidding ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                              />
                              Placing Bid...
                            </>
                          ) : (
                            'Place Bid'
                          )}
                        </button>
                      </form>
                    )}
                  </>
                ) : isOwnAuction() ? (
                  <div className="alert alert-warning mb-3 py-2 px-3">
                    <small><strong>Your Auction</strong> - You cannot bid on your own auction</small>
                  </div>
                ) : (
                  <div className="alert alert-danger mb-3 py-2 px-3">
                    <small><strong>Auction Expired</strong> - This auction is no longer active</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="row mt-4 mt-md-5 w-100">
          <div className="col-12" data-aos="fade-up">
            <div className="card bg-dark-card border-secondary">
              <div className="card-body p-3 p-md-4">
                <h3 className="h5 h-md-4 mb-3" style={{ color: 'var(--teal)' }}>
                  Description
                </h3>
                <p className="text-muted mb-0 text-break">{auction.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChatbotModal
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
        auctionData={auction ? {
          title: auction.title,
          description: auction.description,
          category: auction.category,
          starting_bid: auction.starting_bid,
          current_bid: auction.current_bid,
        } : undefined}
      />

      <footer className="bg-dark text-white py-4 py-md-5 mt-5 w-100">
        <div className="container-fluid px-3 px-md-0">
          <div className="row g-3 g-md-4 mb-4">
            <div className="col-6 col-md-3 mb-3 mb-md-0">
              <h6 className="fw-bold mb-2 mb-md-3">About</h6>
              <ul className="list-unstyled">
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-6 col-md-3 mb-3 mb-md-0">
              <h6 className="fw-bold mb-2 mb-md-3">Support</h6>
              <ul className="list-unstyled">
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-6 col-md-3 mb-3 mb-md-0">
              <h6 className="fw-bold mb-2 mb-md-3">Legal</h6>
              <ul className="list-unstyled">
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-6 col-md-3 mb-3 mb-md-0">
              <h6 className="fw-bold mb-2 mb-md-3">Follow Us</h6>
              <ul className="list-unstyled">
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <hr className="bg-white-50" />
          <div className="row">
            <div className="col-12 text-center">
              <p className="text-white-50 mb-0 small">
                &copy; 2024 Bid Buddy. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
