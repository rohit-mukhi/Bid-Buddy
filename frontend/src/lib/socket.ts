import { io, Socket } from 'socket.io-client'
import { getApiBaseUrl } from './api'

let socket: Socket | null = null

export const initSocket = (): Socket => {
  if (socket) return socket

  const socketUrl = getApiBaseUrl()
  socket = io(socketUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => {
    console.log('Connected to WebSocket server')
  })

  socket.on('disconnect', () => {
    console.log('Disconnected from WebSocket server')
  })

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error)
  })

  return socket
}

export const getSocket = (): Socket | null => {
  return socket
}

export const joinAuction = (auctionId: number) => {
  if (socket) {
    socket.emit('join-auction', auctionId)
  }
}

export const leaveAuction = (auctionId: number) => {
  if (socket) {
    socket.emit('leave-auction', auctionId)
  }
}

export const onBidPlaced = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('bid-placed', callback)
  }
}

export const offBidPlaced = (callback: (data: any) => void) => {
  if (socket) {
    socket.off('bid-placed', callback)
  }
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
