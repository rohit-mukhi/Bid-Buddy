import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getPlaceholderImage } from '../utils/placeholder'
import { getApiUrl } from '../lib/api'
import { initSocket, onBidPlaced, offBidPlaced } from '../lib/socket'

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
  isOwnAuction?: boolean
}

export default function BiddingInterface() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (user && !user.isBidder) {
      navigate('/home')
      return
    }
    fetchAuctions()

    // Initialize WebSocket
    const socket = initSocket()

    // Listen for bid updates
    const handleBidPlaced = (data: any) => {
      setAuctions((prev) =>
        prev.map((auction) =>
          auction.id === data.auctionId
            ? {
                ...auction,
                current_bid: data.bidAmount,
                bids: auction.bids + 1,
              }
            : auction
        )
      )
    }

    onBidPlaced(handleBidPlaced)

    return () => {
      offBidPlaced(handleBidPlaced)
    }
  }, [user, navigate])

  const fetchAuctions = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(getApiUrl('/api/auctions/all'))

      if (!response.ok) {
        throw new Error('Failed to fetch auctions')
      }

      const data = await response.json()
      const auctionsWithNumbers = (data.auctions || []).map((auction: any) => ({
        ...auction,
        current_bid: parseFloat(auction.current_bid),
        starting_bid: parseFloat(auction.starting_bid),
        isOwnAuction: auction.seller_email === user?.email,
      }))
      setAuctions(auctionsWithNumbers)
    } catch (err) {
      console.error('Error fetching auctions:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load auctions'
      )
    } finally {
      setLoading(false)
    }
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

  const getUrgencyColor = (expiresAt: string) => {
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const diff = expiry - now
    const hours = diff / (1000 * 60 * 60)

    if (hours <= 1) return 'bg-danger'
    if (hours <= 6) return 'bg-warning'
    return 'bg-success'
  }

  const filteredAuctions = auctions.filter((auction) => {
    if (filter === 'all') return true
    return auction.category === filter
  })

  const categories = ['all', ...new Set(auctions.map((a) => a.category))]

  if (!user?.isBidder) {
    return null
  }

  return (
    <div className="min-vh-100 bg-dark text-white">
      <Navbar showBackButton={true} />

      <div className="container py-5">
        <div className="row">
          <div className="col-lg-10 mx-auto">
            <h1
              className="display-4 fw-bold mb-4"
              style={{ color: 'var(--teal)' }}
              data-aos="fade-down"
            >
              Browse Auctions
            </h1>
            <p className="lead mb-5" data-aos="fade-up" data-aos-delay="100">
              Discover and bid on amazing items
            </p>

            {/* Error Message */}
            {error && (
              <div
                className="alert alert-danger alert-dismissible fade show"
                role="alert"
                data-aos="fade-down"
              >
                {error}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setError('')}
                />
              </div>
            )}

            {/* Category Filter */}
            {!loading && auctions.length > 0 && (
              <div className="mb-4" data-aos="fade-up" data-aos-delay="100">
                <div className="d-flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={`btn btn-sm ${
                        filter === cat
                          ? 'btn-primary'
                          : 'btn-outline-secondary'
                      }`}
                      onClick={() => setFilter(cat)}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-3">Loading auctions...</p>
              </div>
            ) : filteredAuctions.length === 0 ? (
              <div className="text-center py-5" data-aos="fade-up">
                <div className="display-1 mb-3">🔍</div>
                <h3 className="mb-3">No auctions found</h3>
                <p className="text-muted mb-4">
                  {auctions.length === 0
                    ? 'No active auctions at the moment. Check back soon!'
                    : 'No auctions match your filter. Try a different category.'}
                </p>
                {auctions.length > 0 && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setFilter('all')}
                  >
                    View All Auctions
                  </button>
                )}
              </div>
            ) : (
              <div className="row g-4">
                {filteredAuctions.map((auction, index) => (
                  <div
                    key={auction.id}
                    className="col-md-6 col-lg-4"
                    data-aos="fade-up"
                    data-aos-delay={index * 100}
                  >
                    <div className="card bg-dark-card border-secondary h-100 auction-card">
                      {/* Image */}
                      <div
                        className="position-relative"
                        style={{
                          height: '200px',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={
                            auction.image_url ||
                            getPlaceholderImage(300, 200)
                          }
                          className="card-img-top"
                          alt={auction.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <span
                          className={`badge ${getUrgencyColor(
                            auction.expires_at
                          )} position-absolute top-0 end-0 m-3`}
                        >
                          {getTimeRemaining(auction.expires_at)}
                        </span>
                        <span className="badge bg-secondary position-absolute bottom-0 start-0 m-3">
                          {auction.category}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="card-body d-flex flex-column">
                        <h5
                          className="card-title"
                          style={{ color: 'var(--teal)' }}
                        >
                          {auction.title}
                        </h5>
                        <p className="card-text text-muted small mb-3 flex-grow-1">
                          {auction.description.substring(0, 80)}
                          {auction.description.length > 80 ? '...' : ''}
                        </p>

                        {/* Stats */}
                        <div className="row mb-3 text-center">
                          <div className="col-6">
                            <small className="text-muted d-block">
                              Current Bid
                            </small>
                            <strong className="text-white">
                              ${auction.current_bid.toFixed(2)}
                            </strong>
                          </div>
                          <div className="col-6">
                            <small className="text-muted d-block">Bids</small>
                            <strong className="text-white">
                              {auction.bids}
                            </strong>
                          </div>
                        </div>

                        {/* Starting Bid Info */}
                        <div className="mb-3 p-2 bg-dark rounded">
                          <small className="text-muted d-block">
                            Starting Bid
                          </small>
                          <small className="text-white">
                            ${auction.starting_bid.toFixed(2)}
                          </small>
                        </div>

                        {/* Seller Info */}
                        <div className="mb-3">
                          <small className="text-muted d-block">Seller</small>
                          <small className="text-white">
                            {auction.seller_email}
                          </small>
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-primary flex-grow-1"
                            onClick={() =>
                              navigate(`/auctions/${auction.id}`)
                            }
                          >
                            View Details
                          </button>
                          {auction.isOwnAuction ? (
                            <button
                              className="btn btn-secondary flex-grow-1"
                              disabled
                              title="You cannot bid on your own auction"
                            >
                              Your Auction
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline-primary flex-grow-1"
                              onClick={() =>
                                navigate(`/auctions/${auction.id}`)
                              }
                            >
                              Bid
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            {!loading && auctions.length > 0 && (
              <div className="row mt-5 pt-5 border-top border-secondary">
                <div className="col-md-4 text-center mb-4" data-aos="fade-up">
                  <h3 className="text-primary">{auctions.length}</h3>
                  <p className="text-muted">Active Auctions</p>
                </div>
                <div className="col-md-4 text-center mb-4" data-aos="fade-up" data-aos-delay="100">
                  <h3 className="text-primary">
                    ${auctions
                      .reduce((sum, a) => sum + a.current_bid, 0)
                      .toFixed(2)}
                  </h3>
                  <p className="text-muted">Total Bid Value</p>
                </div>
                <div className="col-md-4 text-center mb-4" data-aos="fade-up" data-aos-delay="200">
                  <h3 className="text-primary">
                    {auctions.reduce((sum, a) => sum + a.bids, 0)}
                  </h3>
                  <p className="text-muted">Total Bids Placed</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-white py-5 mt-5">
        <div className="container">
          <div className="row mb-4">
            <div className="col-lg-3 col-md-6 mb-4">
              <h5 className="fw-bold mb-3">About</h5>
              <ul className="list-unstyled">
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-lg-3 col-md-6 mb-4">
              <h5 className="fw-bold mb-3">Support</h5>
              <ul className="list-unstyled">
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-lg-3 col-md-6 mb-4">
              <h5 className="fw-bold mb-3">Legal</h5>
              <ul className="list-unstyled">
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-lg-3 col-md-6 mb-4">
              <h5 className="fw-bold mb-3">Follow Us</h5>
              <ul className="list-unstyled">
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white-50 text-decoration-none">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <hr className="bg-white-50" />
          <div className="row">
            <div className="col-12 text-center">
              <p className="text-white-50 mb-0">
                &copy; 2024 Bid Buddy. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
