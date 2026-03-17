import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../lib/api'
import Navbar from '../components/Navbar'
import { getApiUrl } from '../lib/api'
import { getPlaceholderImage } from '../utils/placeholder'
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
  cloudinary_public_id: string
  created_at: string
  expires_at: string
  bids: number
  status: string
}

export default function ManageAuctions() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/home')
      return
    }
    fetchAuctions()
  }, [user, navigate])

  const fetchAuctions = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('jwt_token')

      if (!token) {
        setError('Authentication token not found. Please log in again.')
        navigate('/home')
        return
      }

      const response = await fetch(getApiUrl('/api/auctions/my-auctions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch auctions')
      }

      const data = await response.json()
      const auctionsWithNumbers = (data.auctions || []).map((auction: any) => ({
        ...auction,
        current_bid: parseFloat(auction.current_bid),
        starting_bid: parseFloat(auction.starting_bid),
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this auction? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(id)
      const token = localStorage.getItem('jwt_token')

      if (!token) {
        setError('Authentication token not found. Please log in again.')
        return
      }

      const response = await fetch(getApiUrl(`/api/auctions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete auction')
      }

      setAuctions((prev) => prev.filter((auction) => auction.id !== id))
    } catch (err) {
      console.error('Error deleting auction:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to delete auction'
      )
    } finally {
      setDeleting(null)
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success'
      case 'completed':
        return 'bg-info'
      case 'cancelled':
        return 'bg-danger'
      default:
        return 'bg-secondary'
    }
  }

  return (
    <div className="min-vh-100 bg-dark text-white">
      <Navbar showBackButton={true} />

      <div className="container py-5">
        <div className="row">
          <div className="col-lg-10 mx-auto">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1
                  className="display-4 fw-bold"
                  style={{ color: 'var(--teal)' }}
                  data-aos="fade-down"
                >
                  My Auctions
                </h1>
                <p className="lead" data-aos="fade-up" data-aos-delay="100">
                  Manage your listed items
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/admin/create-auction')}
                data-aos="fade-left"
              >
                + Create New
              </button>
            </div>

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

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-3">Loading your auctions...</p>
              </div>
            ) : auctions.length === 0 ? (
              <div className="text-center py-5" data-aos="fade-up">
                <div className="display-1 mb-3">📦</div>
                <h3 className="mb-3">No auctions yet</h3>
                <p className="text-muted mb-4">
                  Create your first auction to get started
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/admin/create-auction')}
                >
                  Create Auction
                </button>
              </div>
            ) : (
              <div className="row g-4">
                {auctions.map((auction, index) => (
                  <div
                    key={auction.id}
                    className="col-md-6 col-lg-4"
                    data-aos="fade-up"
                    data-aos-delay={index * 100}
                  >
                    <div className="card bg-dark-card border-secondary h-100">
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
                          className={`badge ${getStatusBadgeColor(
                            auction.status
                          )} position-absolute top-0 end-0 m-3`}
                        >
                          {getTimeRemaining(auction.expires_at)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="card-body">
                        <h5
                          className="card-title"
                          style={{ color: 'var(--teal)' }}
                        >
                          {auction.title}
                        </h5>
                        <p className="card-text text-muted small mb-3">
                          {auction.description.substring(0, 80)}
                          {auction.description.length > 80 ? '...' : ''}
                        </p>

                        {/* Stats */}
                        <div className="d-flex justify-content-between mb-3">
                          <div>
                            <small className="text-muted d-block">
                              Current Bid
                            </small>
                            <strong className="text-white">
                              ${auction.current_bid.toFixed(2)}
                            </strong>
                          </div>
                          <div className="text-end">
                            <small className="text-muted d-block">Bids</small>
                            <strong className="text-white">
                              {auction.bids}
                            </strong>
                          </div>
                          <div className="text-end">
                            <small className="text-muted d-block">
                              Duration
                            </small>
                            <strong className="text-white">
                              {auction.duration_hours}h
                            </strong>
                          </div>
                        </div>

                        {/* Category Badge */}
                        <div className="mb-3">
                          <span className="badge bg-secondary">
                            {auction.category}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-outline-info btn-sm flex-grow-1"
                            onClick={() =>
                              navigate(`/auctions/${auction.id}`)
                            }
                          >
                            View
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm flex-grow-1"
                            onClick={() => handleDelete(auction.id)}
                            disabled={deleting === auction.id}
                          >
                            {deleting === auction.id ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-2"
                                  role="status"
                                  aria-hidden="true"
                                />
                                Deleting...
                              </>
                            ) : (
                              'Delete'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
