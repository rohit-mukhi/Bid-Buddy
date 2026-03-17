import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from '../components/Navbar'

export default function AdminPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/home')
    }
  }, [user, navigate])

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
              Admin Panel
            </h1>
            <p className="lead mb-5" data-aos="fade-up" data-aos-delay="100">
              Manage auctions and platform settings
            </p>

            <div className="row g-4">
              <div className="col-md-6" data-aos="fade-up" data-aos-delay="200">
                <div className="card bg-dark-card border-secondary h-100" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/create-auction')}>
                  <div className="card-body">
                    <h5 className="card-title" style={{ color: 'var(--teal)' }}>
                      📝 Create Auction
                    </h5>
                    <p className="card-text text-muted mb-4">
                      Add new items to the auction platform
                    </p>
                    <button className="btn btn-primary">Create New Auction</button>
                  </div>
                </div>
              </div>

              <div className="col-md-6" data-aos="fade-up" data-aos-delay="300">
                <div className="card bg-dark-card border-secondary h-100" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/manage-auctions')}>
                  <div className="card-body">
                    <h5 className="card-title" style={{ color: 'var(--teal)' }}>
                      📊 Manage Auctions
                    </h5>
                    <p className="card-text text-muted mb-4">
                      View and edit existing auctions
                    </p>
                    <button className="btn btn-primary">View All Auctions</button>
                  </div>
                </div>
              </div>

              <div className="col-md-6" data-aos="fade-up" data-aos-delay="400">
                <div className="card bg-dark-card border-secondary h-100" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/users')}>
                  <div className="card-body">
                    <h5 className="card-title" style={{ color: 'var(--teal)' }}>
                      👥 User Management
                    </h5>
                    <p className="card-text text-muted mb-4">
                      Manage users and permissions
                    </p>
                    <button className="btn btn-primary">Manage Users</button>
                  </div>
                </div>
              </div>

              <div className="col-md-6" data-aos="fade-up" data-aos-delay="500">
                <div className="card bg-dark-card border-secondary h-100" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/live-monitoring')}>
                  <div className="card-body">
                    <h5 className="card-title" style={{ color: 'var(--teal)' }}>
                      📊 Live Monitoring
                    </h5>
                    <p className="card-text text-muted mb-4">
                      Real-time bid tracking across all auctions
                    </p>
                    <button className="btn btn-primary">View Live Bids</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
