import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../lib/api'
import Navbar from '../components/Navbar'
import { getApiUrl } from '../lib/api'
import { getPlaceholderImage } from '../utils/placeholder'
import { getApiUrl } from '../lib/api'

interface Bid {
  id: number
  user_id: number
  bid_amount: number
  created_at: string
  bidder_email: string
}

interface ApprovedBidder {
  id: number
  user_id: number
  bidder_email: string
  approved_at: string
  credits_assigned: number
}

interface BiddingRequest {
  id: number
  user_id: number
  bidder_email: string
  status: string
  created_at: string
}

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

export default function AuctionListing() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [bidders, setBidders] = useState<Bid[]>([])
  const [approvedBidders, setApprovedBidders] = useState<ApprovedBidder[]>([])
  const [biddingRequests, setBiddingRequests] = useState<BiddingRequest[]>([])
  const [filteredBidders, setFilteredBidders] = useState<Bid[]>([])
  const [filteredApprovedBidders, setFilteredApprovedBidders] = useState<ApprovedBidder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [approvedSearchQuery, setApprovedSearchQuery] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [processing, setProcessing] = useState<number | null>(null)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<BiddingRequest | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditDescription, setCreditDescription] = useState('')
  const [showFullDescription, setShowFullDescription] = useState(false)

  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/home')
      return
    }
    fetchAuctionAndBidders()
  }, [user, navigate, id])

  const fetchAuctionAndBidders = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('jwt_token')

      // Fetch auction details
      const auctionResponse = await fetch(getApiUrl(`/api/auctions/${id}`)
      if (!auctionResponse.ok) {
        throw new Error('Failed to fetch auction')
      }
      const auctionData = await auctionResponse.json()
      setAuction({
        ...auctionData.auction,
        starting_bid: parseFloat(auctionData.auction.starting_bid),
        current_bid: parseFloat(auctionData.auction.current_bid),
      })

      // Fetch approved bidders
      const approvedResponse = await fetch(getApiUrl(`/api/bidding/auction/${id}/bidders`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (approvedResponse.ok) {
        const approvedData = await approvedResponse.json()
        setApprovedBidders(approvedData.bidders || [])
        setFilteredApprovedBidders(approvedData.bidders || [])
      }

      // Fetch bidding requests
      const requestsResponse = await fetch(getApiUrl(`/api/bidding/requests/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json()
        setBiddingRequests(requestsData.requests || [])
      } else {
        console.error('Failed to fetch requests:', requestsResponse.status, await requestsResponse.text())
        // If 403, user is not the auction owner
        if (requestsResponse.status === 403) {
          console.warn('You are not the owner of this auction')
        }
      }

      // Fetch bidders for this auction
      const biddersResponse = await fetch(getApiUrl(`/api/admin/auction/${id}/bidders`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (biddersResponse.ok) {
        const biddersData = await biddersResponse.json()
        const biddersWithNumbers = (biddersData.bidders || []).map((bid: any) => ({
          ...bid,
          bid_amount: parseFloat(bid.bid_amount)
        }))
        setBidders(biddersWithNumbers)
        setFilteredBidders(biddersWithNumbers)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim() === '') {
      setFilteredBidders(bidders)
    } else {
      const filtered = bidders.filter((bidder) =>
        bidder.bidder_email.toLowerCase().includes(query.toLowerCase())
      )
      setFilteredBidders(filtered)
    }
  }

  const handleApprovedSearch = (query: string) => {
    setApprovedSearchQuery(query)
    if (query.trim() === '') {
      setFilteredApprovedBidders(approvedBidders)
    } else {
      const filtered = approvedBidders.filter((bidder) =>
        bidder.bidder_email.toLowerCase().includes(query.toLowerCase())
      )
      setFilteredApprovedBidders(filtered)
    }
  }

  const handleDeleteBidder = async (bidderId: number) => {
    if (!confirm('Are you sure you want to remove this bidder? They will need to request access again.')) return

    try {
      setDeleting(bidderId)
      const token = localStorage.getItem('jwt_token')
      const response = await fetch(getApiUrl(`/api/bidding/auction/${id}/bidder/${bidderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to remove bidder')

      // Refresh all data to update both approved bidders and pending requests
      fetchAuctionAndBidders()
    } catch (err) {
      console.error('Error removing bidder:', err)
      setError('Failed to remove bidder')
    } finally {
      setDeleting(null)
    }
  }

  const handleApproveRequest = async (requestId: number) => {
    // Open modal instead of directly approving
    const request = biddingRequests.find(r => r.id === requestId)
    if (request) {
      setSelectedRequest(request)
      setShowCreditModal(true)
    }
  }

  const handleApproveWithCredits = async () => {
    if (!selectedRequest || !creditAmount || parseFloat(creditAmount) <= 0) {
      setError('Please enter a valid credit amount')
      return
    }

    try {
      setProcessing(selectedRequest.id)
      const token = localStorage.getItem('jwt_token')

      // First approve the request
      const approveResponse = await fetch(getApiUrl(`/api/bidding/request/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!approveResponse.ok) throw new Error('Failed to approve request')

      // Then assign auction-specific credits
      const creditsResponse = await fetch(getApiUrl('/api/auction-credits/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          auctionId: id,
          userEmail: selectedRequest.bidder_email,
          amount: parseFloat(creditAmount),
          description: creditDescription || `Credits for auction ${id}`,
        }),
      })

      if (!creditsResponse.ok) throw new Error('Failed to assign credits')

      // Close modal and refresh
      setShowCreditModal(false)
      setSelectedRequest(null)
      setCreditAmount('')
      setCreditDescription('')
      fetchAuctionAndBidders()
    } catch (err) {
      console.error('Error approving request:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve request')
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectRequest = async (requestId: number) => {
    try {
      setProcessing(requestId)
      const token = localStorage.getItem('jwt_token')
      const response = await fetch(getApiUrl(`/api/bidding/request/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to reject request')

      fetchAuctionAndBidders()
    } catch (err) {
      console.error('Error rejecting request:', err)
      alert('Failed to reject request')
    } finally {
      setProcessing(null)
    }
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
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-3">Loading auction details...</p>
              </div>
            ) : error || !auction ? (
              <div className="alert alert-danger" role="alert">
                {error || 'Auction not found'}
              </div>
            ) : (
              <>
                {/* Auction Header */}
                <div className="row mb-5" data-aos="fade-down">
                  <div className="col-md-4">
                    <img
                      src={auction.image_url || getPlaceholderImage(300, 200)}
                      alt={auction.title}
                      className="img-fluid rounded"
                      style={{ maxHeight: '300px', objectFit: 'cover' }}
                    />
                  </div>
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-3" style={{ color: 'var(--teal)' }}>
                      {auction.title}
                    </h1>
                    <div className="mb-4">
                      <p className="lead text-muted mb-0" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: showFullDescription ? 'unset' : 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {auction.description}
                      </p>
                      {auction.description.length > 100 && (
                        <button
                          className="btn btn-link p-0 text-primary"
                          onClick={() => setShowFullDescription(!showFullDescription)}
                          style={{ textDecoration: 'none', fontSize: '0.9rem' }}
                        >
                          {showFullDescription ? 'Show less' : 'more...'}
                        </button>
                      )}
                    </div>

                    <div className="row g-3 mb-4">
                      <div className="col-6">
                        <div className="p-3 bg-dark rounded">
                          <small className="text-muted d-block">Starting Bid</small>
                          <h6 className="text-white mb-0">${auction.starting_bid.toFixed(2)}</h6>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-3 bg-dark rounded">
                          <small className="text-muted d-block">Current Bid</small>
                          <h6 className="text-primary mb-0">${auction.current_bid.toFixed(2)}</h6>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-3 bg-dark rounded">
                          <small className="text-muted d-block">Category</small>
                          <h6 className="text-white mb-0">{auction.category}</h6>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-3 bg-dark rounded">
                          <small className="text-muted d-block">Total Bids</small>
                          <h6 className="text-white mb-0">{auction.bids}</h6>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-dark rounded">
                      <small className="text-muted d-block">Seller</small>
                      <h6 className="text-white mb-0 text-break">{auction.seller_email}</h6>
                    </div>
                  </div>
                </div>

                {/* Bidding Requests Section */}
                <div data-aos="fade-up" className="mb-5">
                  <h2 className="h4 fw-bold mb-4" style={{ color: 'var(--teal)' }}>
                    Pending Requests ({biddingRequests.filter(r => r.status === 'pending').length})
                  </h2>

                  <div className="card bg-dark-card border-secondary">
                    <div className="card-body p-4">
                      {biddingRequests.filter(r => r.status === 'pending').length === 0 ? (
                        <p className="text-muted mb-0">No pending requests</p>
                      ) : (
                        <div className="row g-3">
                          {biddingRequests.filter(r => r.status === 'pending').map((request) => (
                            <div key={request.id} className="col-md-6 col-lg-4">
                              <div className="card bg-dark border-secondary h-100">
                                <div className="card-body">
                                  <div className="mb-3">
                                    <small className="text-muted d-block mb-1">Bidder:</small>
                                    <h6 className="text-white mb-0">{request.bidder_email.split('@')[0]}</h6>
                                  </div>
                                  <div className="mb-3">
                                    <small className="text-muted d-block mb-1">Requested at:</small>
                                    <p className="text-white-50 small mb-0">{new Date(request.created_at).toLocaleString()}</p>
                                  </div>
                                  <div className="d-flex flex-column gap-2">
                                    <button
                                      className="btn btn-success btn-sm w-100"
                                      onClick={() => handleApproveRequest(request.id)}
                                      disabled={processing === request.id}
                                    >
                                      {processing === request.id ? 'Processing...' : 'Approve'}
                                    </button>
                                    <button
                                      className="btn btn-danger btn-sm w-100"
                                      onClick={() => handleRejectRequest(request.id)}
                                      disabled={processing === request.id}
                                    >
                                      Reject
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

                {/* Approved Bidders Section */}
                <div data-aos="fade-up">
                  <h2 className="h4 fw-bold mb-4" style={{ color: 'var(--teal)' }}>
                    Approved Bidders ({approvedBidders.length})
                  </h2>

                  {/* Search Bar */}
                  <div className="mb-4">
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      placeholder="Search approved bidders..."
                      value={approvedSearchQuery}
                      onChange={(e) => handleApprovedSearch(e.target.value)}
                      style={{
                        backgroundColor: 'var(--dark-card)',
                        borderColor: 'var(--dark-border)',
                        color: 'var(--light-text)',
                      }}
                    />
                  </div>

                  <div className="card bg-dark-card border-secondary">
                    <div className="card-body p-4">
                      {approvedBidders.length === 0 ? (
                        <div className="text-center py-5">
                          <div className="display-1 mb-3">🚫</div>
                          <p className="text-muted mb-0">No approved bidders yet</p>
                        </div>
                      ) : filteredApprovedBidders.length === 0 ? (
                        <p className="text-muted mb-0">No bidders match your search</p>
                      ) : (
                        <div className="row g-3">
                          {filteredApprovedBidders.map((bidder) => (
                            <div key={bidder.id} className="col-md-6 col-lg-4">
                              <div className="card bg-dark border-secondary h-100">
                                <div className="card-body">
                                  <div className="mb-3">
                                    <small className="text-muted d-block mb-1">Bidder:</small>
                                    <h6 className="text-white mb-0">{bidder.bidder_email.split('@')[0]}</h6>
                                  </div>
                                  <div className="mb-3">
                                    <small className="text-muted d-block mb-1">Approved at:</small>
                                    <p className="text-white-50 small mb-0">{new Date(bidder.approved_at).toLocaleString()}</p>
                                  </div>
                                  <div className="mb-3">
                                    <small className="text-muted d-block mb-1">Credits Assigned:</small>
                                    <h6 className="mb-0" style={{ color: 'var(--teal)' }}>${parseFloat(bidder.credits_assigned || 0).toFixed(2)}</h6>
                                  </div>
                                  <button
                                    className="btn btn-danger btn-sm w-100"
                                    onClick={() => handleDeleteBidder(bidder.id)}
                                    disabled={deleting === bidder.id}
                                  >
                                    {deleting === bidder.id ? 'Removing...' : 'Remove'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Results Count */}
                  <p className="text-muted mt-3 small">
                    Showing {filteredApprovedBidders.length} of {approvedBidders.length} approved bidders
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Credit Assignment Modal */}
      {showCreditModal && selectedRequest && (
        <>
          <div 
            className="modal-backdrop fade show" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => {
              setShowCreditModal(false)
              setSelectedRequest(null)
              setCreditAmount('')
              setCreditDescription('')
            }}
          />
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content bg-dark-card border-secondary">
                <div className="modal-header border-secondary">
                  <h5 className="modal-title" style={{ color: 'var(--teal)' }}>
                    Approve & Assign Credits
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => {
                      setShowCreditModal(false)
                      setSelectedRequest(null)
                      setCreditAmount('')
                      setCreditDescription('')
                    }}
                  />
                </div>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                      {error}
                      <button type="button" className="btn-close" onClick={() => setError('')} />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label text-muted">Bidder:</label>
                    <p className="text-white">{selectedRequest.bidder_email}</p>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="creditAmount" className="form-label">
                      Credit Amount <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">$</span>
                      <input
                        type="number"
                        className="form-control"
                        id="creditAmount"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                        placeholder="100.00"
                        disabled={processing === selectedRequest.id}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="creditDescription" className="form-label">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="creditDescription"
                      value={creditDescription}
                      onChange={(e) => setCreditDescription(e.target.value)}
                      placeholder="Initial bidding credits"
                      disabled={processing === selectedRequest.id}
                    />
                  </div>
                </div>
                <div className="modal-footer border-secondary">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCreditModal(false)
                      setSelectedRequest(null)
                      setCreditAmount('')
                      setCreditDescription('')
                    }}
                    disabled={processing === selectedRequest.id}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleApproveWithCredits}
                    disabled={processing === selectedRequest.id || !creditAmount}
                  >
                    {processing === selectedRequest.id ? 'Processing...' : 'Approve & Assign'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
