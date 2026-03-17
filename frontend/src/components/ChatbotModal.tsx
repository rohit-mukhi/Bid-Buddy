import { useState, useRef, useEffect } from 'react'
import aiConcierge from '../services/aiConcierge'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

interface ChatbotModalProps {
  isOpen: boolean
  onClose: () => void
  auctionData?: {
    title: string
    description: string
    category: string
    starting_bid: number
    current_bid: number
  }
}

export default function ChatbotModal({ isOpen, onClose, auctionData }: ChatbotModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hi! Ask me anything about ${auctionData?.title || 'this product'}.`,
      sender: 'bot',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelStatus, setModelStatus] = useState<string>('Initializing AI...')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      initializeAI()
    }
  }, [isOpen])

  const initializeAI = async () => {
    try {
      setModelStatus('Loading AI models...')
      await aiConcierge.initialize()
      setModelStatus('AI Ready ✓')
    } catch (error) {
      console.error('Failed to initialize AI:', error)
      setModelStatus('AI unavailable - using fallback')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !auctionData) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const startTime = performance.now()
      
      // Use local AI for instant response
      const result = await aiConcierge.answerQuestion(input, auctionData)
      
      const endTime = performance.now()
      const responseTime = Math.round(endTime - startTime)

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: result.answer,
        sender: 'bot',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
      console.log(`[AI Concierge] Response time: ${responseTime}ms, Source: ${result.source}, Chunks: ${result.retrievedChunks}, Confidence: ${Math.round(result.confidence * 100)}%`)
    } catch (error) {
      console.error('Error with AI:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try rephrasing your question.',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 1040,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1050,
          width: '90%',
          maxWidth: '500px',
        }}
      >
        <div className="rounded" style={{
          borderWidth: '2px',
          borderColor: '#00d4ff',
          backgroundColor: '#1a1a1a',
          boxShadow: '0 0 30px rgba(0, 212, 255, 0.6), 0 0 60px rgba(0, 212, 255, 0.3), inset 0 0 20px rgba(0, 212, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center p-4 border-bottom" style={{
            borderColor: 'rgba(0, 168, 196, 0.3)',
            background: 'linear-gradient(135deg, rgba(0, 168, 196, 0.1) 0%, rgba(31, 58, 82, 0.1) 100%)',
          }}>
            <div>
              <h5 className="mb-0 fw-bold" style={{ color: 'var(--teal)', fontSize: '1.25rem', letterSpacing: '0.5px' }}>
                🤖 AI Product Assistant
              </h5>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>{modelStatus}</small>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
              style={{ filter: 'brightness(1.2)', backgroundColor: 'white' }}
            />
          </div>

          {/* Messages */}
          <div
            style={{
              height: '400px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0f0f0f',
              padding: '1.5rem',
              background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    marginBottom: '1rem',
                    textAlign: message.sender === 'user' ? 'right' : 'left',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      maxWidth: '80%',
                      padding: '10px 15px',
                      borderRadius: '12px',
                      backgroundColor:
                        message.sender === 'user' ? 'var(--teal)' : 'var(--dark-card)',
                      color: message.sender === 'user' ? '#000' : 'var(--light-text)',
                      wordWrap: 'break-word',
                      fontSize: '0.95rem',
                      lineHeight: '1.4',
                    }}
                  >
                    {message.text}
                  </div>
                  <small
                    style={{
                      display: 'block',
                      color: 'var(--muted-text)',
                      marginTop: '4px',
                      fontSize: '0.8rem',
                    }}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </div>
              ))}
              {loading && (
                <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '10px 15px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--dark-card)',
                      color: 'var(--light-text)',
                    }}
                  >
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Processing locally...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-top" style={{
            borderColor: 'rgba(0, 168, 196, 0.3)',
            backgroundColor: '#1a1a1a',
            background: 'linear-gradient(135deg, rgba(0, 168, 196, 0.05) 0%, rgba(31, 58, 82, 0.05) 100%)',
          }}>
            <form onSubmit={handleSendMessage}>
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ask about this product..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  style={{
                    backgroundColor: 'var(--dark-card)',
                    borderColor: 'var(--dark-border)',
                    color: 'var(--light-text)',
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={loading || !input.trim()}
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
