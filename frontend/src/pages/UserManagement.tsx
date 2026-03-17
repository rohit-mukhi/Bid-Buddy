import { useEffect, useState } from 'react'
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
  image_url: string
  expires_at: string
  bids: number
  seller_email: string
}

export default function UserManagement() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && !user.isAdmin) {
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
        current_bid: parseFloat(String(auction.current_bid)),
        starting_bid: parseFloat(String(auction.starting_bid)),
      }))
      setAuctions(auctionsWithNumbers)
    } catch (err) {
      console.error('Error fetching auctions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load auctions')
    } finally {
      setLoading(false)
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

    if (days > 0) return `${days}d ${hours}h ${minutes}m`
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

  if (!user?.isAdmin) {
    return null
  }

  return (
    <div className="min-vh-100 bg-dark text-white">
      <Navbar showBackButton={true} />

      <div className="container py-5">
        <div className="row">
          <div className="col-lg-10 mx-auto">
            <h1 className="display-4 fw-bold mb-4" style={{ color: 'var(--teal)' }} data-aos="fade-down">
              My Auctions
            </h1>
            <p className="lead mb-5" data-aos="fade-up" data-aos-delay="100">
              Click on any auction to view and manage bidders
            </p>

            {error && (
              <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                {error}
                <button type="button" className="btn-close" onClick={() => setError('')} />
              </div>
            )}

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-3">Loading auctions...</p>
              </div>
            ) : auctions.length === 0 ? (
              <div className="text-center py-5" data-aos="fade-up">
                <div className="display-1 mb-3">📦</div>
                <h3 className="mb-3">No auctions yet</h3>
                <p className="text-muted mb-4">You haven't created any auctions yet.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/admin/create-auction')}
                >
                  Create Your First Auction
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
                    <div
                      className="card bg-dark-card border-secondary h-100"
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                      onClick={() => navigate(`/admin/auction-listing/${auction.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-10px)'
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 168, 196, 0.2)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* Image */}
                      <div
                        style={{
                          height: '200px',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={auction.image_url || getPlaceholderImage(300, 200)}
                          className="card-img-top"
                          alt={auction.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <span
                          className={`badge ${getUrgencyColor(auction.expires_at)} position-absolute top-0 end-0 m-3`}
                        >
                          {getTimeRemaining(auction.expires_at)}
                        </span>
                        <span className="badge bg-secondary position-absolute bottom-0 start-0 m-3">
                          {auction.category}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="card-body d-flex flex-column">
                        <h5 className="card-title" style={{ color: 'var(--teal)' }}>
                          {auction.title}
                        </h5>
                        <p className="card-text text-muted small mb-3 flex-grow-1">
                          {auction.description.substring(0, 80)}
                          {auction.description.length > 80 ? '...' : ''}
                        </p>

                        {/* Stats */}
                        <div className="row mb-3 text-center">
                          <div className="col-6">
                            <small className="text-muted d-block">Current Bid</small>
                            <strong className="text-white">${auction.current_bid.toFixed(2)}</strong>
                          </div>
                          <div className="col-6">
                            <small className="text-muted d-block">Bids</small>
                            <strong className="text-white">{auction.bids}</strong>
                          </div>
                        </div>

                        {/* Seller Info */}
                        <div className="mb-3 p-2 bg-dark rounded">
                          <small className="text-muted d-block">Seller</small>
                          <small className="text-white text-break">{auction.seller_email}</small>
                        </div>

                        <button className="btn btn-primary w-100 btn-sm">
                          View Bidders
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
