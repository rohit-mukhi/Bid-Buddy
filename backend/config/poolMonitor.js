import pool from './database.js';

export const getPoolStats = () => {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
    activeConnections: pool.totalCount - pool.idleCount,
  };
};

export const logPoolStats = () => {
  const stats = getPoolStats();
  console.log('📊 Connection Pool Stats:', stats);
  return stats;
};

export default { getPoolStats, logPoolStats };
