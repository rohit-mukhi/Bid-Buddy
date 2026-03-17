import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Hamburger from 'hamburger-react'
import { useAuth } from '../context/AuthContext'

interface NavbarProps {
  showBackButton?: boolean
}

export default function Navbar({ showBackButton = false }: NavbarProps) {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <nav className="navbar navbar-dark bg-dark-card border-bottom border-secondary position-relative">
        <div className="container">
          <div className="d-flex align-items-center gap-3">
            {showBackButton && (
              <button 
                className="btn btn-link text-white p-0" 
                onClick={() => navigate(-1)}
                style={{ fontSize: '1.5rem', textDecoration: 'none' }}
              >
                &lt;
              </button>
            )}
            <span className="navbar-brand mb-0 h1">Bid Buddy</span>
          </div>
          <div className="position-relative">
            <Hamburger
              toggled={isMenuOpen}
              toggle={setIsMenuOpen}
              color="#ffffff"
              size={20}
            />
          </div>
        </div>
      </nav>
      
      {isMenuOpen && (
        <>
          <div 
            className="position-fixed top-0 start-0 w-100 h-100" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 999 }}
            onClick={() => setIsMenuOpen(false)}
          />
          <div 
            className="dropdown-menu-custom position-fixed bg-dark-card border-bottom border-secondary"
            style={{ 
              top: '56px',
              right: 0,
              maxWidth: '412px',
              width: '100%',
              backgroundColor: 'rgba(45, 45, 45, 0.5)',
              backdropFilter: 'blur(10px)',
              zIndex: 1000,
              animation: 'slideDown 0.3s ease-out',
              borderRadius: '0 0 12px 12px'
            }}
          >
            <div className="container py-4">
              <div className="d-flex flex-column gap-3">
                <div className="text-center">
                  <p className="text-white mb-1">{session?.user?.email?.split('@')[0]}</p>
                  <p className="text-muted small mb-0">{session?.user?.email}</p>
                </div>
                <hr className="border-secondary my-2" />
                <hr className="border-secondary my-2" />
                <button 
                  className="btn btn-outline-primary w-100" 
                  onClick={() => {
                    setIsMenuOpen(false)
                    navigate('/profile')
                  }}
                >
                  My Profile
                </button>
                <button 
                  className="btn btn-outline-danger w-100" 
                  onClick={() => {
                    setIsMenuOpen(false)
                    signOut(navigate)
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
