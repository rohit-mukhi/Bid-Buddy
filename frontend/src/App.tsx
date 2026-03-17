import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Hamburger from 'hamburger-react'
import { useAuth } from './context/AuthContext'
import './App.css'

interface AuctionItem {
  id: number
  title: string
  currentBid: number
  image: string
  timeLeft: string
  bids: number
}

const featuredAuctions: AuctionItem[] = [
  {
    id: 1,
    title: 'Vintage Leather Watch',
    currentBid: 450,
    image: 'https://placehold.co/300x200/1a1a1a/00a8c4?text=Vintage+Watch',
    timeLeft: '2h 30m',
    bids: 12,
  },
  {
    id: 2,
    title: 'Antique Wooden Clock',
    currentBid: 320,
    image: 'https://placehold.co/300x200/1a1a1a/00a8c4?text=Wooden+Clock',
    timeLeft: '5h 15m',
    bids: 8,
  },
  {
    id: 3,
    title: 'Classic Camera Collection',
    currentBid: 680,
    image: 'https://placehold.co/300x200/1a1a1a/00a8c4?text=Camera',
    timeLeft: '1h 45m',
    bids: 24,
  },
  {
    id: 4,
    title: 'Rare Vinyl Records',
    currentBid: 210,
    image: 'https://placehold.co/300x200/1a1a1a/00a8c4?text=Vinyl+Records',
    timeLeft: '8h 20m',
    bids: 5,
  },
]

function App() {
  const [isOpen, setIsOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { session, signInWithGoogle, signOut } = useAuth()

  const handleStartBidding = async () => {
    if (session) {
      navigate('/home')
    } else {
      try {
        await signInWithGoogle()
      } catch (error) {
        console.error('Sign in error:', error)
      }
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const menuElement = document.getElementById('navbarNav')
      const hamburgerElement = document.querySelector('.hamburger-menu')
      
      if (menuElement && !menuElement.contains(event.target as Node) && 
          hamburgerElement && !hamburgerElement.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside as EventListener)
      document.addEventListener('touchstart', handleClickOutside as EventListener)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener)
      document.removeEventListener('touchstart', handleClickOutside as EventListener)
    }
  }, [isOpen])

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section py-5 text-white text-center position-relative" ref={navRef}>
        <div className="hamburger-menu position-absolute top-0 end-0 m-3 d-lg-none mt-4">
          <Hamburger
            toggled={isOpen}
            toggle={setIsOpen}
            color="#ffffff"
            size={24}
          />
        </div>
        <div
          className={`collapse navbar-collapse ${isOpen ? 'show' : ''}`}
          id="navbarNav"
        >
          <ul className="navbar-nav ms-auto">
            <li className="nav-item" data-aos="fade-left" data-aos-delay="100">
              <a
                className="nav-link"
                href="#auctions"
                onClick={() => setIsOpen(false)}
              >
                Browse
              </a>
            </li>
            <li className="nav-item" data-aos="fade-left" data-aos-delay="200">
              <a
                className="nav-link"
                href="#how-it-works"
                onClick={() => setIsOpen(false)}
              >
                How It Works
              </a>
            </li>
            <li className="nav-item" data-aos="fade-left" data-aos-delay="300">
              <a
                className="nav-link"
                href="#contact"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </a>
            </li>
            <li className="nav-item" data-aos="fade-left" data-aos-delay="400">
              {session ? (
                <button className="btn btn-primary ms-2" onClick={() => signOut(() => navigate('/'))}>
                  Sign Out
                </button>
              ) : (
                <button className="btn btn-primary ms-2" onClick={() => signInWithGoogle()}>
                  Sign In
                </button>
              )}
            </li>
          </ul>
        </div>
        <div className="container py-5 mt-5">
          <div className="row align-items-center">
            <div className="col-lg-8 mx-auto">
              <h1 className="display-3 fw-bold mb-4" data-aos="fade-up">
                Bid Buddy
              </h1>
              <p className="lead mb-4" data-aos="fade-up" data-aos-delay="100">
                The smart auction engine for finding amazing deals on items you love
              </p>
              <button 
                className="btn btn-light btn-lg px-5" 
                data-aos="fade-up" 
                data-aos-delay="200" 
                onClick={handleStartBidding}
              >
                Start Bidding Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Auctions Section */}
      <section id="auctions" className="py-5 bg-light">
        <div className="container">
          <div className="row mb-5">
            <div className="col-lg-8 mx-auto text-center" data-aos="fade-up">
              <h2 className="display-5 fw-bold mb-3">Featured Auctions</h2>
              <p className="lead text-muted">Discover amazing items up for bid right now</p>
            </div>
          </div>

          <div className="row g-4">
            {featuredAuctions.map((auction, index) => (
              <div
                key={auction.id}
                className="col-lg-3 col-md-6"
                data-aos="zoom-in"
                data-aos-delay={index * 100}
              >
                <div className="card h-100 auction-card shadow-sm">
                  <div className="auction-image-wrapper position-relative overflow-hidden">
                    <img
                      src={auction.image}
                      className="card-img-top auction-img"
                      alt={auction.title}
                    />
                    <span className="badge bg-danger position-absolute top-0 end-0 m-3">
                      {auction.timeLeft}
                    </span>
                  </div>
                  <div className="card-body">
                    <h5 className="card-title fw-bold">{auction.title}</h5>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <small className="text-muted d-block">Current Bid</small>
                        <h6 className="text-primary fw-bold">${auction.currentBid}</h6>
                      </div>
                      <div className="text-end">
                        <small className="text-muted d-block">{auction.bids} Bids</small>
                      </div>
                    </div>
                    <button className="btn btn-primary w-100">Place Bid</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-5">
        <div className="container">
          <div className="row mb-5">
            <div className="col-lg-8 mx-auto text-center" data-aos="fade-up">
              <h2 className="display-5 fw-bold mb-3">How It Works</h2>
              <p className="lead text-muted">Simple steps to start your bidding journey</p>
            </div>
          </div>

          <div className="row g-4">
            {[
              {
                num: 1,
                icon: '👤',
                title: 'Create Account',
                desc: 'Sign up and verify your email to get started',
              },
              {
                num: 2,
                icon: '🔍',
                title: 'Browse Auctions',
                desc: 'Explore thousands of items from sellers worldwide',
              },
              {
                num: 3,
                icon: '💰',
                title: 'Place Your Bid',
                desc: 'Bid on items you love with our smart bidding system',
              },
              {
                num: 4,
                icon: '🎁',
                title: 'Win & Receive',
                desc: 'Win auctions and receive your items safely',
              },
            ].map((step, index) => (
              <div
                key={step.num}
                className="col-lg-3 col-md-6"
                data-aos="flip-left"
                data-aos-delay={index * 150}
              >
                <div className="card h-100 text-center step-card shadow-sm border-0">
                  <div className="card-body">
                    <div className="step-icon mb-3">{step.icon}</div>
                    <div className="step-number mb-3">
                      <span className="badge bg-primary rounded-circle p-3 fs-5">{step.num}</span>
                    </div>
                    <h5 className="card-title fw-bold mb-2">{step.title}</h5>
                    <p className="card-text text-muted">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-5 bg-primary text-white">
        <div className="container">
          <div className="row text-center">
            {[
              { stat: '50K+', label: 'Active Auctions' },
              { stat: '100K+', label: 'Happy Bidders' },
              { stat: '$10M+', label: 'Items Sold' },
              { stat: '24/7', label: 'Support' },
            ].map((item, index) => (
              <div
                key={index}
                className="col-lg-3 col-md-6 mb-4 mb-lg-0"
                data-aos="count-up"
                data-aos-delay={index * 100}
              >
                <h3 className="display-5 fw-bold" data-aos="fade-up" data-aos-delay={index * 100}>
                  {item.stat}
                </h3>
                <p className="lead">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="row mb-5">
            <div className="col-lg-8 mx-auto text-center" data-aos="fade-up">
              <h2 className="display-5 fw-bold mb-3">Why Choose Bid Buddy?</h2>
              <p className="lead text-muted">Experience the best auction platform</p>
            </div>
          </div>

          <div className="row g-4">
            {[
              {
                icon: '🔒',
                title: 'Secure Transactions',
                desc: 'Your payments and personal information are protected',
              },
              {
                icon: '⚡',
                title: 'Fast & Easy',
                desc: 'Simple bidding process with instant notifications',
              },
              {
                icon: '🌍',
                title: 'Global Reach',
                desc: 'Bid on items from sellers around the world',
              },
              {
                icon: '💬',
                title: 'Expert Support',
                desc: 'Our team is here to help 24/7',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="col-lg-3 col-md-6"
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <div className="card h-100 text-center feature-card shadow-sm border-0">
                  <div className="card-body">
                    <div className="feature-icon mb-3">
                      <span className="display-4">{feature.icon}</span>
                    </div>
                    <h5 className="card-title fw-bold">{feature.title}</h5>
                    <p className="card-text text-muted">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-5 bg-gradient text-white text-center">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mx-auto">
              <h2 className="display-4 fw-bold mb-4" data-aos="fade-up">
                Ready to find your next treasure?
              </h2>
              <p className="lead mb-4" data-aos="fade-up" data-aos-delay="100">
                Join thousands of bidders on Bid Buddy and start winning amazing items today
              </p>
              <button 
                className="btn btn-light btn-lg px-5" 
                data-aos="fade-up" 
                data-aos-delay="200"
                onClick={handleStartBidding}
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="row">
            <div className="col-lg-6 mx-auto text-center" data-aos="zoom-in">
              <h3 className="fw-bold mb-3">Subscribe to Our Newsletter</h3>
              <p className="text-muted mb-4">Get updates on new auctions and exclusive deals</p>
              <div className="input-group mb-3">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email"
                  aria-label="Email"
                />
                <button className="btn btn-primary" type="button">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

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
    </>
  )
}

export default App
