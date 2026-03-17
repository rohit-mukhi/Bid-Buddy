import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../lib/api'
import Navbar from '../components/Navbar'
import { getApiUrl } from '../lib/api'

interface FormData {
  title: string
  description: string
  startingBid: string
  category: string
  duration: string
}

interface FormErrors {
  title?: string
  description?: string
  startingBid?: string
  category?: string
  image?: string
}

export default function CreateAuction() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    startingBid: '',
    category: '',
    duration: '24',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters'
    }

    if (!formData.startingBid) {
      newErrors.startingBid = 'Starting bid is required'
    } else if (parseFloat(formData.startingBid) <= 0) {
      newErrors.startingBid = 'Starting bid must be greater than 0'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!imageFile) {
      newErrors.image = 'Image is required'
    } else if (imageFile.size > 10 * 1024 * 1024) {
      newErrors.image = 'Image must be less than 10MB'
    } else if (!imageFile.type.startsWith('image/')) {
      newErrors.image = 'File must be an image'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!validateForm()) {
      setErrorMessage('Please fix the errors below')
      return
    }

    if (!user) {
      setErrorMessage('Please log in to create an auction')
      navigate('/auth')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('jwt_token')

      if (!token) {
        setErrorMessage('Authentication token not found. Please log in again.')
        navigate('/auth')
        return
      }

      // Convert image to base64
      let imageBase64 = ''
      if (imageFile) {
        imageBase64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(imageFile)
        })
      }

      setSuccessMessage('Uploading image and creating auction...')

      const response = await fetch(getApiUrl('/api/auctions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          startingBid: formData.startingBid,
          category: formData.category,
          duration: formData.duration,
          image: imageBase64,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create auction')
      }

      setSuccessMessage('✅ Auction created successfully! Redirecting...')
      setTimeout(() => {
        navigate('/admin/manage-auctions')
      }, 1500)
    } catch (error) {
      console.error('Error creating auction:', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to create auction. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      // Clear image error
      if (errors.image) {
        setErrors((prev) => ({
          ...prev,
          image: undefined,
        }))
      }
    }
  }

  return (
    <div className="min-vh-100 bg-dark text-white">
      <Navbar showBackButton={true} />

      <div className="container py-5">
        <div className="row">
          <div className="col-lg-8 mx-auto">
            <h1
              className="display-4 fw-bold mb-4"
              style={{ color: 'var(--teal)' }}
              data-aos="fade-down"
            >
              Create New Auction
            </h1>
            <p
              className="lead mb-5"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              List your item for auction
            </p>

            {/* Success Message */}
            {successMessage && (
              <div
                className="alert alert-success alert-dismissible fade show"
                role="alert"
                data-aos="fade-down"
              >
                {successMessage}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSuccessMessage('')}
                />
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div
                className="alert alert-danger alert-dismissible fade show"
                role="alert"
                data-aos="fade-down"
              >
                {errorMessage}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setErrorMessage('')}
                />
              </div>
            )}

            <form onSubmit={handleSubmit} data-aos="fade-up" data-aos-delay="200">
              <div className="card bg-dark-card border-secondary">
                <div className="card-body p-4">
                  {/* Title */}
                  <div className="mb-4">
                    <label htmlFor="title" className="form-label">
                      Item Title
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                        errors.title ? 'is-invalid' : ''
                      }`}
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter item title"
                      disabled={loading}
                    />
                    {errors.title && (
                      <div className="invalid-feedback d-block">
                        {errors.title}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label htmlFor="description" className="form-label">
                      Description
                    </label>
                    <textarea
                      className={`form-control ${
                        errors.description ? 'is-invalid' : ''
                      }`}
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Describe your item"
                      disabled={loading}
                    />
                    {errors.description && (
                      <div className="invalid-feedback d-block">
                        {errors.description}
                      </div>
                    )}
                  </div>

                  {/* Starting Bid & Category */}
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label htmlFor="startingBid" className="form-label">
                        Starting Bid ($)
                      </label>
                      <input
                        type="number"
                        className={`form-control ${
                          errors.startingBid ? 'is-invalid' : ''
                        }`}
                        id="startingBid"
                        name="startingBid"
                        value={formData.startingBid}
                        onChange={handleChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={loading}
                      />
                      {errors.startingBid && (
                        <div className="invalid-feedback d-block">
                          {errors.startingBid}
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="category" className="form-label">
                        Category
                      </label>
                      <select
                        className={`form-control ${
                          errors.category ? 'is-invalid' : ''
                        }`}
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        <option value="">Select category</option>
                        <option value="electronics">Electronics</option>
                        <option value="collectibles">Collectibles</option>
                        <option value="art">Art</option>
                        <option value="jewelry">Jewelry</option>
                        <option value="antiques">Antiques</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.category && (
                        <div className="invalid-feedback d-block">
                          {errors.category}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="mb-4">
                    <label htmlFor="duration" className="form-label">
                      Auction Duration
                    </label>
                    <select
                      className="form-control"
                      id="duration"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="1">1 Hour</option>
                      <option value="3">3 Hours</option>
                      <option value="6">6 Hours</option>
                      <option value="12">12 Hours</option>
                      <option value="24">24 Hours</option>
                      <option value="168">1 Week</option>
                      <option value="720">1 Month</option>
                    </select>
                  </div>

                  {/* Image Upload */}
                  <div className="mb-4">
                    <label htmlFor="image" className="form-label">
                      Item Image
                    </label>
                    <input
                      type="file"
                      className={`form-control ${
                        errors.image ? 'is-invalid' : ''
                      }`}
                      id="image"
                      name="image"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={loading}
                    />
                    <small className="text-muted">
                      Upload an image of your item (JPG, PNG, GIF - Max 10MB)
                    </small>
                    {errors.image && (
                      <div className="invalid-feedback d-block">
                        {errors.image}
                      </div>
                    )}

                    {imagePreview && (
                      <div className="mt-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="img-fluid rounded"
                          style={{
                            maxHeight: '300px',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Submit Buttons */}
                  <div className="d-flex gap-3">
                    <button
                      type="submit"
                      className="btn btn-primary flex-grow-1"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          />
                          Creating Auction...
                        </>
                      ) : (
                        'Create Auction'
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => navigate('/admin')}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>


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
            <div
              className="col-lg-3 col-md-6 mb-4"
              data-aos="fade-up"
              data-aos-delay="100"
            >
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
            <div
              className="col-lg-3 col-md-6 mb-4"
              data-aos="fade-up"
              data-aos-delay="200"
            >
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
            <div
              className="col-lg-3 col-md-6 mb-4"
              data-aos="fade-up"
              data-aos-delay="300"
            >
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
