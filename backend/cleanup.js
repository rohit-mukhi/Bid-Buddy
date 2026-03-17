import pool from './config/database.js';

async function cleanup() {
  const client = await pool.connect();
  
  try {
    console.log('Checking current state...');
    
    const checkResult = await client.query(`
      SELECT ab.id, ab.auction_id, ab.user_id, u.email, br.status 
      FROM auction_bidders ab 
      JOIN users u ON ab.user_id = u.id 
      LEFT JOIN bidding_requests br ON ab.auction_id = br.auction_id AND ab.user_id = br.user_id 
      WHERE ab.auction_id = 6
    `);
    
    console.log('Current bidders for auction 6:', checkResult.rows);
    
    console.log('\nDeleting user 3 from auction 6...');
    
    await client.query('BEGIN');
    
    const deleteAB = await client.query(
      'DELETE FROM auction_bidders WHERE auction_id = 6 AND user_id = 3'
    );
    console.log(`Deleted ${deleteAB.rowCount} rows from auction_bidders`);
    
    const deleteBR = await client.query(
      'DELETE FROM bidding_requests WHERE auction_id = 6 AND user_id = 3'
    );
    console.log(`Deleted ${deleteBR.rowCount} rows from bidding_requests`);
    
    await client.query('COMMIT');
    console.log('Cleanup complete!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during cleanup:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
