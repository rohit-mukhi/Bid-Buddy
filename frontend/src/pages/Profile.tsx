import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { getPlaceholderImage } from '../utils/placeholder'
import { getApiUrl } from '../lib/api'
import { getApiUrl } from '../lib/api'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface UserInfo {
  email: string
  isAdmin: boolean
  isBidder: boolean
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
  status: string
  created_at: string
  expires_at: string
  bids: number
}

interface Bid {
  id: number
  auction_id: number
  bid_amount: number
  created_at: string
  auction_title: string
  auction_image_url: string
  auction_status: string
  auction_current_bid: number
  is_winning: boolean
}

interface CreditTransaction {
  id: number
  transaction_type: string
  amount: number
  description: string
  created_at: string
}

interface Invoice {
  id: number
  invoice_number: string
  auction_id: number
  auction_title: string
  buyer_email: string
  seller_email: string
  amount: number
  status: string
  created_at: string
}

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [myAuctions, setMyAuctions] = useState<Auction[]>([])
  const [myBids, setMyBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'auctions' | 'bids' | 'analytics' | 'credits' | 'invoices'>('auctions')
  const [monthlySpending, setMonthlySpending] = useState<{month: string, amount: number}[]>([])
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    if (!user) {
      navigate('/home')
      return
    }
    fetchProfileData()
  }, [user, navigate])

  const calculateMonthlySpending = (bids: Bid[]) => {
    const monthlyData: {[key: string]: number} = {}
    
    bids.forEach(bid => {
      const date = new Date(bid.created_at)
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' })
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + bid.bid_amount
    })

    const sortedMonths = Object.entries(monthlyData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, amount]) => ({ month, amount }))

    setMonthlySpending(sortedMonths)
  }

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('jwt_token')

      if (!token) {
        setError('Authentication token not found. Please log in again.')
        navigate('/home')
        return
      }

      // Fetch user info
      setUserInfo({
        email: user!.email,
        isAdmin: user!.isAdmin,
        isBidder: user!.isBidder,
        created_at: new Date().toISOString(),
      })

      // Fetch user's auctions
      const auctionsResponse = await fetch(getApiUrl('/api/auctions/my-auctions'), {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (auctionsResponse.ok) {
        const auctionsData = await auctionsResponse.json()
        const auctionsWithNumbers = (auctionsData.auctions || []).map((auction: any) => ({
          ...auction,
          starting_bid: parseFloat(auction.starting_bid),
          current_bid: parseFloat(auction.current_bid),
        }))
        setMyAuctions(auctionsWithNumbers)
      }

      // Fetch user's bids
      const bidsResponse = await fetch(getApiUrl('/api/auctions/my-bids'), {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (bidsResponse.ok) {
        const bidsData = await bidsResponse.json()
        const bidsWithNumbers = (bidsData.bids || []).map((bid: any) => ({
          ...bid,
          bid_amount: parseFloat(bid.bid_amount),
          auction_current_bid: parseFloat(bid.auction_current_bid),
        }))
        setMyBids(bidsWithNumbers)
        calculateMonthlySpending(bidsWithNumbers)
      }

      // Fetch credit transactions
      const historyResponse = await fetch(getApiUrl('/api/credits/history'), {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setCreditTransactions((historyData.transactions || []).map((t: any) => ({
          ...t,
          amount: parseFloat(t.amount),
        })))
      }

      // Fetch invoices
      console.log('[Profile] Fetching invoices...')
      const invoicesResponse = await fetch(getApiUrl('/api/invoices/my-invoices'), {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      console.log('[Profile] Invoices response status:', invoicesResponse.status)
      
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        console.log('[Profile] Invoices data:', invoicesData)
        console.log('[Profile] Number of invoices:', invoicesData.invoices?.length || 0)
        setInvoices((invoicesData.invoices || []).map((inv: any) => ({
          ...inv,
          amount: parseFloat(inv.amount),
        })))
      } else {
        console.error('[Profile] Failed to fetch invoices:', await invoicesResponse.text())
      }
    } catch (err) {
      console.error('Error fetching profile data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
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

  const chartData = {
    labels: monthlySpending.map(d => d.month),
    datasets: [
      {
        label: 'Monthly Spending ($)',
        data: monthlySpending.map(d => d.amount),
        borderColor: '#00a8c4',
        backgroundColor: 'rgba(0, 168, 196, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00a8c4',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#fff',
          font: { size: 14, weight: 'bold' as const },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#00a8c4',
        bodyColor: '#fff',
        borderColor: '#00a8c4',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => `$${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#999',
          callback: (value: any) => `$${value}`,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        ticks: {
          color: '#999',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-vh-100 bg-dark text-white">
      <Navbar showBackButton={true} />

      <div className="container py-5">
        <div className="row">
          <div className="col-lg-10 mx-auto">
            {/* Profile Header */}
            <div className="card bg-dark-card border-secondary mb-5" data-aos="fade-down">
              <div className="card-body p-4">
                <div className="row align-items-center">
                  <div className="col-md-2 text-center mb-3 mb-md-0">
                    <div
                      className="rounded-circle bg-primary d-flex align-items-center justify-content-center mx-auto"
                      style={{ width: '100px', height: '100px' }}
                    >
                      <span className="display-4">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-10">
                    <h2 className="fw-bold mb-2" style={{ color: 'var(--teal)' }}>
                      {user.email.split('@')[0]}
                    </h2>
                    <p className="text-muted mb-0">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                {error}
                <button type="button" className="btn-close" onClick={() => setError('')} />
              </div>
            )}

            {/* Stats Cards */}
            <div className="row g-4 mb-5" data-aos="fade-up">
              <div className="col-md-4">
                <div className="card bg-dark-card border-secondary text-center">
                  <div className="card-body p-4">
                    <h3 className="display-4 fw-bold text-primary mb-2">{myAuctions.length}</h3>
                    <p className="text-muted mb-0">Auctions Created</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card bg-dark-card border-secondary text-center">
                  <div className="card-body p-4">
                    <h3 className="display-4 fw-bold text-success mb-2">{myBids.length}</h3>
                    <p className="text-muted mb-0">Total Bids Placed</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card bg-dark-card border-secondary text-center">
                  <div className="card-body p-4">
                    <h3 className="display-4 fw-bold text-warning mb-2">
                      ${myBids.reduce((sum, b) => sum + b.bid_amount, 0).toFixed(2)}
                    </h3>
                    <p className="text-muted mb-0">Total Spent</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-4" data-aos="fade-up">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'auctions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('auctions')}
                  style={{
                    backgroundColor: activeTab === 'auctions' ? 'var(--teal)' : 'transparent',
                    color: activeTab === 'auctions' ? 'white' : 'var(--teal)',
                    border: 'none',
                  }}
                >
                  My Auctions
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'bids' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bids')}
                  style={{
                    backgroundColor: activeTab === 'bids' ? 'var(--teal)' : 'transparent',
                    color: activeTab === 'bids' ? 'white' : 'var(--teal)',
                    border: 'none',
                  }}
                >
                  My Bids
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('analytics')}
                  style={{
                    backgroundColor: activeTab === 'analytics' ? 'var(--teal)' : 'transparent',
                    color: activeTab === 'analytics' ? 'white' : 'var(--teal)',
                    border: 'none',
                  }}
                >
                  Analytics
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'credits' ? 'active' : ''}`}
                  onClick={() => setActiveTab('credits')}
                  style={{
                    backgroundColor: activeTab === 'credits' ? 'var(--teal)' : 'transparent',
                    color: activeTab === 'credits' ? 'white' : 'var(--teal)',
                    border: 'none',
                  }}
                >
                  Credits
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'invoices' ? 'active' : ''}`}
                  onClick={() => setActiveTab('invoices')}
                  style={{
                    backgroundColor: activeTab === 'invoices' ? 'var(--teal)' : 'transparent',
                    color: activeTab === 'invoices' ? 'white' : 'var(--teal)',
                    border: 'none',
                  }}
                >
                  Invoices
                </button>
              </li>
            </ul>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-3">Loading your data...</p>
              </div>
            ) : (
              <>
                {/* My Auctions Tab */}
                {activeTab === 'auctions' && (
                  <div data-aos="fade-up">
                    {myAuctions.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="display-1 mb-3">📦</div>
                        <h3 className="mb-3">No auctions yet</h3>
                        <p className="text-muted mb-4">Create your first auction to get started</p>
                        <button
                          className="btn btn-primary"
                          onClick={() => navigate('/admin/create-auction')}
                        >
                          Create Auction
                        </button>
                      </div>
                    ) : (
                      <div className="row g-4">
                        {myAuctions.map((auction, index) => (
                          <div
                            key={auction.id}
                            className="col-md-6 col-lg-4"
                            data-aos="fade-up"
                            data-aos-delay={index * 100}
                          >
                            <div className="card bg-dark-card border-secondary h-100">
                              <div style={{ height: '200px', overflow: 'hidden' }}>
                                <img
                                  src={auction.image_url || getPlaceholderImage(300, 200)}
                                  className="card-img-top"
                                  alt={auction.title}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                              <div className="card-body">
                                <h5 className="card-title" style={{ color: 'var(--teal)' }}>
                                  {auction.title}
                                </h5>
                                <p className="card-text text-muted small mb-3">
                                  {auction.description.substring(0, 80)}
                                  {auction.description.length > 80 ? '...' : ''}
                                </p>
                                <div className="d-flex justify-content-between mb-3">
                                  <div>
                                    <small className="text-muted d-block">Current Bid</small>
                                    <strong className="text-white">${auction.current_bid.toFixed(2)}</strong>
                                  </div>
                                  <div className="text-end">
                                    <small className="text-muted d-block">Bids</small>
                                    <strong className="text-white">{auction.bids}</strong>
                                  </div>
                                </div>
                                <div className="mb-3">
                                  <span className={`badge ${getStatusBadge(auction.status)}`}>
                                    {auction.status}
                                  </span>
                                  <span className="badge bg-secondary ms-2">
                                    {getTimeRemaining(auction.expires_at)}
                                  </span>
                                </div>
                                <button
                                  className="btn btn-outline-primary btn-sm w-100"
                                  onClick={() => navigate(`/auctions/${auction.id}`)}
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* My Bids Tab */}
                {activeTab === 'bids' && (
                  <div data-aos="fade-up">
                    {myBids.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="display-1 mb-3">💰</div>
                        <h3 className="mb-3">No bids yet</h3>
                        <p className="text-muted mb-4">Start bidding on auctions to see them here</p>
                        <button
                          className="btn btn-primary"
                          onClick={() => navigate('/bidding')}
                        >
                          Browse Auctions
                        </button>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-dark table-hover">
                          <thead>
                            <tr style={{ borderBottomColor: 'var(--dark-border)' }}>
                              <th style={{ color: 'var(--teal)' }}>Auction</th>
                              <th style={{ color: 'var(--teal)' }}>My Bid</th>
                              <th style={{ color: 'var(--teal)' }}>Current Bid</th>
                              <th style={{ color: 'var(--teal)' }}>Status</th>
                              <th style={{ color: 'var(--teal)' }}>Date</th>
                              <th style={{ color: 'var(--teal)' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myBids.map((bid) => (
                              <tr key={bid.id} style={{ borderBottomColor: 'var(--dark-border)' }}>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <img
                                      src={bid.auction_image_url || getPlaceholderImage(50, 50)}
                                      alt={bid.auction_title}
                                      className="rounded me-2"
                                      style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                    />
                                    <span className="text-white">{bid.auction_title}</span>
                                  </div>
                                </td>
                                <td className="text-white">${bid.bid_amount.toFixed(2)}</td>
                                <td className="text-primary">${bid.auction_current_bid.toFixed(2)}</td>
                                <td>
                                  {bid.is_winning ? (
                                    <span className="badge bg-success">Winning</span>
                                  ) : (
                                    <span className="badge bg-danger">Outbid</span>
                                  )}
                                </td>
                                <td className="text-muted">
                                  {new Date(bid.created_at).toLocaleDateString()}
                                </td>
                                <td>
                                  <button
                                    className="btn btn-outline-info btn-sm"
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
                    )}
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                  <div data-aos="fade-up">
                    {monthlySpending.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="display-1 mb-3">📊</div>
                        <h3 className="mb-3">No spending data yet</h3>
                        <p className="text-muted mb-4">Your spending analysis will appear here once you place bids</p>
                      </div>
                    ) : (
                      <div className="card bg-dark-card border-secondary">
                        <div className="card-body p-4">
                          <h5 className="card-title mb-4" style={{ color: 'var(--teal)' }}>
                            Monthly Spending Analysis
                          </h5>
                          <div style={{ height: '350px', position: 'relative' }}>
                            <Line data={chartData} options={chartOptions} />
                          </div>
                          <div className="row mt-4 g-3">
                            <div className="col-md-4">
                              <div className="p-3 bg-dark rounded">
                                <small className="text-muted d-block">Total Spent</small>
                                <h5 className="text-primary mb-0">
                                  ${monthlySpending.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
                                </h5>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="p-3 bg-dark rounded">
                                <small className="text-muted d-block">Average Monthly</small>
                                <h5 className="text-success mb-0">
                                  ${(monthlySpending.reduce((sum, m) => sum + m.amount, 0) / monthlySpending.length).toFixed(2)}
                                </h5>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="p-3 bg-dark rounded">
                                <small className="text-muted d-block">Highest Month</small>
                                <h5 className="text-warning mb-0">
                                  ${Math.max(...monthlySpending.map(m => m.amount)).toFixed(2)}
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Credits Tab */}
                {activeTab === 'credits' && (
                  <div data-aos="fade-up">
                    {creditTransactions.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="display-1 mb-3">💳</div>
                        <h3 className="mb-3">No transactions yet</h3>
                        <p className="text-muted mb-4">Your credit transactions will appear here</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-dark table-hover">
                          <thead>
                            <tr style={{ borderBottomColor: 'var(--dark-border)' }}>
                              <th style={{ color: 'var(--teal)' }}>Type</th>
                              <th style={{ color: 'var(--teal)' }}>Amount</th>
                              <th style={{ color: 'var(--teal)' }}>Description</th>
                              <th style={{ color: 'var(--teal)' }}>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {creditTransactions.map((transaction) => (
                              <tr key={transaction.id} style={{ borderBottomColor: 'var(--dark-border)' }}>
                                <td>
                                  <span className={`badge ${
                                    transaction.transaction_type === 'add' ? 'bg-success' : 
                                    transaction.transaction_type === 'refund' ? 'bg-info' : 'bg-danger'
                                  }`}>
                                    {transaction.transaction_type === 'add' ? 'Added' : 
                                     transaction.transaction_type === 'refund' ? 'Refund' : 'Deducted'}
                                  </span>
                                </td>
                                <td className={transaction.transaction_type === 'deduct' ? 'text-danger' : 'text-success'}>
                                  {transaction.transaction_type === 'deduct' ? '-' : '+'}${transaction.amount.toFixed(2)}
                                </td>
                                <td className="text-white">{transaction.description}</td>
                                <td className="text-muted">
                                  {new Date(transaction.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Invoices Tab */}
                {activeTab === 'invoices' && (
                  <div data-aos="fade-up">
                    {invoices.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="display-1 mb-3">🧾</div>
                        <h3 className="mb-3">No invoices yet</h3>
                        <p className="text-muted mb-4">Invoices for won/sold auctions will appear here</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-dark table-hover">
                          <thead>
                            <tr style={{ borderBottomColor: 'var(--dark-border)' }}>
                              <th style={{ color: 'var(--teal)' }}>Invoice #</th>
                              <th style={{ color: 'var(--teal)' }}>Auction</th>
                              <th style={{ color: 'var(--teal)' }}>Type</th>
                              <th style={{ color: 'var(--teal)' }}>Amount</th>
                              <th style={{ color: 'var(--teal)' }}>Status</th>
                              <th style={{ color: 'var(--teal)' }}>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.map((invoice) => {
                              const isBuyer = invoice.buyer_email === user?.email
                              return (
                                <tr key={invoice.id} style={{ borderBottomColor: 'var(--dark-border)' }}>
                                  <td className="text-white font-monospace">{invoice.invoice_number}</td>
                                  <td className="text-white">{invoice.auction_title}</td>
                                  <td>
                                    <span className={`badge ${isBuyer ? 'bg-primary' : 'bg-success'}`}>
                                      {isBuyer ? 'Won' : 'Sold'}
                                    </span>
                                  </td>
                                  <td className="text-white">${invoice.amount.toFixed(2)}</td>
                                  <td>
                                    <span className={`badge ${
                                      invoice.status === 'paid' ? 'bg-success' : 
                                      invoice.status === 'cancelled' ? 'bg-danger' : 'bg-warning'
                                    }`}>
                                      {invoice.status}
                                    </span>
                                  </td>
                                  <td className="text-muted">
                                    {new Date(invoice.created_at).toLocaleDateString()}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
