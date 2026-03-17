import { useState, useEffect } from 'react'
import './TimerModal.css'

interface TimerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (hours: number) => void
  initialHours?: number
}

export default function TimerModal({ isOpen, onClose, onConfirm, initialHours = 24 }: TimerModalProps) {
  const [days, setDays] = useState(0)
  const [hours, setHours] = useState(initialHours)
  const [minutes, setMinutes] = useState(0)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (initialHours) {
      const d = Math.floor(initialHours / 24)
      const h = Math.floor(initialHours % 24)
      setDays(Math.min(d, 10))
      setHours(h)
      setMinutes(0)
      setSeconds(0)
    }
  }, [initialHours, isOpen])

  const handleDone = () => {
    const totalHours = days * 24 + hours + minutes / 60 + seconds / 3600
    onConfirm(totalHours)
    onClose()
  }

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Math.max(parseInt(e.target.value) || 0, 0), 10)
    setDays(value)
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Math.max(parseInt(e.target.value) || 0, 0), 23)
    setHours(value)
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Math.max(parseInt(e.target.value) || 0, 0), 59)
    setMinutes(value)
  }

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Math.max(parseInt(e.target.value) || 0, 0), 59)
    setSeconds(value)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="timer-modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="timer-modal">
        <div className="timer-modal-content">
          {/* Header */}
          <div className="timer-modal-header">
            <h3 className="timer-modal-title">Set Timer</h3>
            <button className="timer-modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          {/* Body */}
          <div className="timer-modal-body">
            {/* Input Fields */}
            <div className="timer-inputs">
              {/* Days */}
              <div className="input-group">
                <label htmlFor="days">Days</label>
                <input
                  type="number"
                  id="days"
                  min="0"
                  max="10"
                  value={days}
                  onChange={handleDaysChange}
                  className="timer-input"
                />
              </div>

              {/* Separator */}
              <div className="input-separator">:</div>

              {/* Hours */}
              <div className="input-group">
                <label htmlFor="hours">Hours</label>
                <input
                  type="number"
                  id="hours"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={handleHoursChange}
                  className="timer-input"
                />
              </div>

              {/* Separator */}
              <div className="input-separator">:</div>

              {/* Minutes */}
              <div className="input-group">
                <label htmlFor="minutes">Minutes</label>
                <input
                  type="number"
                  id="minutes"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={handleMinutesChange}
                  className="timer-input"
                />
              </div>

              {/* Separator */}
              <div className="input-separator">:</div>

              {/* Seconds */}
              <div className="input-group">
                <label htmlFor="seconds">Seconds</label>
                <input
                  type="number"
                  id="seconds"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={handleSecondsChange}
                  className="timer-input"
                />
              </div>
            </div>

            {/* Display */}
            <div className="timer-display">
              <span>{String(days).padStart(2, '0')}</span>
              <span className="display-sep">:</span>
              <span>{String(hours).padStart(2, '0')}</span>
              <span className="display-sep">:</span>
              <span>{String(minutes).padStart(2, '0')}</span>
              <span className="display-sep">:</span>
              <span>{String(seconds).padStart(2, '0')}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="timer-modal-footer">
            <button className="btn btn-primary w-100" onClick={handleDone}>
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
