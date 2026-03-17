import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getApiUrl } from '../lib/api'

export default function Home() {
  const { session, user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleRoleSelection = async (role: 'admin' | 'bidder') => {
    try {
      const response = await fetch(getApiUrl('/api/auth/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          isAdmin: role === 'admin',
          isBidder: role === 'bidder',
        }),
      })

      if (!response.ok) throw new Error('Failed to update role')

      const data = await response.json()
      localStorage.setItem('jwt_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Navigate based on role
      if (role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/bidding')
      }

      // Reload to update context
      window.location.reload()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update role. Please try again.')
    }
  }

  return (
    <div className="min-vh-100 bg-dark text-white">
      <Navbar showBackButton={false} />

      <div className="container py-5">
        <div className="row">
          <div className="col-lg-8 mx-auto">
            <h1 className="display-4 fw-bold mb-1 text-left" style={{ color: 'var(--teal)' }} data-aos="fade-down">
              What are you up to today?
            </h1>
            <p className="lead mb-5 text-left" data-aos="fade-up" data-aos-delay="100">
              Welcome, {session?.user?.email?.split('@')[0]}
            </p>
            
            <div className="row g-4 mt-5">
              <div className="col-md-6" data-aos="fade-up" data-aos-delay="200">
                <div 
                  className="card bg-dark-card border-secondary" 
                  style={{ 
                    cursor: 'pointer',
                    minHeight: '220px'
                  }}
                  onClick={() => handleRoleSelection('admin')}
                >
                  <div className="card-body text-center d-flex flex-column justify-content-center">
                    <div className="display-4 mb-3">📝</div>
                    <h5 className="card-title" style={{ color: 'var(--teal)' }}>Auction an item</h5>
                    <p className="card-text text-muted mb-2">Create and manage auctions as a seller</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6" data-aos="fade-up" data-aos-delay="300">
                <div 
                  className="card bg-dark-card border-secondary" 
                  style={{ 
                    cursor: 'pointer',
                    minHeight: '220px'
                  }}
                  onClick={() => handleRoleSelection('bidder')}
                >
                  <div className="card-body text-center d-flex flex-column justify-content-center">
                    <div className="display-4 mb-3">💰</div>
                    <h5 className="card-title" style={{ color: 'var(--teal)' }}>Place Bids</h5>
                    <p className="card-text text-muted mb-2">Browse and place bids on items</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-white py-5">
        <div className="container">
          <div className="row mb-4">
            <div className="col-lg-3 col-md-6 mb-4" data-aos="fade-up">
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
            <div className="col-lg-3 col-md-6 mb-4" data-aos="fade-up" data-aos-delay="100">
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
            <div className="col-lg-3 col-md-6 mb-4" data-aos="fade-up" data-aos-delay="200">
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
            <div className="col-lg-3 col-md-6 mb-4" data-aos="fade-up" data-aos-delay="300">
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
              <p className="text-white-50 mb-0">&copy; 2024 Bid Buddy. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
