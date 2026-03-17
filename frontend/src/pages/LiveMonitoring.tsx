import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { initSocket, onBidPlaced, offBidPlaced } from '../lib/socket'
import { getApiUrl } from '../lib/api'

interface LiveBid {
  bid_id: number
  bid_amount: number
  bid_time: string
  auction_id: number
  auction_title: string
  current_bid: number
  auction_status: string
  expires_at: string
  bidder_email: string
  is_winning: boolean
}

export default function LiveMonitoring() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bids, setBids] = useState<LiveBid[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/home')
      return
    }
    
    // Initialize socket connection
    initSocket()
    
    fetchLiveBids()

    // Listen for real-time bid updates
    onBidPlaced(handleNewBid)

    return () => {
      offBidPlaced(handleNewBid)
    }
  }, [user, navigate])

  const fetchLiveBids = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('jwt_token')

      const response = await fetch(getApiUrl('/api/admin/live-bids', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch live bids')

      const data = await response.json()
      setBids(data.bids || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bids')
    } finally {
      setLoading(false)
    }
  }

  const handleNewBid = (data: any) => {
    // Refresh bids when new bid is placed
    fetchLiveBids()
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const diff = expiry - now

    if (diff <= 0) return 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="min-vh-100 bg-dark text-white">
      <Navbar showBackButton={true} />

      <div className="container-fluid py-5">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="display-4 fw-bold" style={{ color: 'var(--teal)' }}>
                  📊 Live Monitoring
                </h1>
                <p className="lead">Real-time bid activity across all auctions</p>
              </div>
              <button className="btn btn-outline-primary" onClick={fetchLiveBids}>
                🔄 Refresh
              </button>
            </div>

            {error && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" onClick={() => setError('')} />
              </div>
            )}

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-3">Loading live bids...</p>
              </div>
            ) : bids.length === 0 ? (
              <div className="text-center py-5">
                <div className="display-1 mb-3">📭</div>
                <h3 className="mb-3">No active bids</h3>
                <p className="text-muted">Bids will appear here as they are placed</p>
              </div>
            ) : (
              <div className="card bg-dark-card border-secondary">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-dark table-hover mb-0">
                      <thead className="table-dark">
                        <tr>
                          <th>Auction</th>
                          <th>Bidder</th>
                          <th>Bid Amount</th>
                          <th>Current High</th>
                          <th>Status</th>
                          <th>Time Remaining</th>
                          <th>Bid Time</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bids.map((bid) => (
                          <tr key={bid.bid_id} className={bid.is_winning ? 'table-success' : ''}>
                            <td>
                              <strong>{bid.auction_title}</strong>
                              <br />
                              <small className="text-muted">ID: {bid.auction_id}</small>
                            </td>
                            <td>{bid.bidder_email}</td>
                            <td>
                              <strong className="text-warning">
                                ${parseFloat(bid.bid_amount.toString()).toFixed(2)}
                              </strong>
                              {bid.is_winning && (
                                <span className="badge bg-success ms-2">Winning</span>
                              )}
                            </td>
                            <td>${parseFloat(bid.current_bid.toString()).toFixed(2)}</td>
                            <td>
                              <span className="badge bg-success">{bid.auction_status}</span>
                            </td>
                            <td>{getTimeRemaining(bid.expires_at)}</td>
                            <td>
                              <small>{formatTime(bid.bid_time)}</small>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-info"
                                onClick={() => navigate(`/auctions/${bid.auction_id}`)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card-footer bg-dark text-muted">
                  <small>Total Active Bids: {bids.length}</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
