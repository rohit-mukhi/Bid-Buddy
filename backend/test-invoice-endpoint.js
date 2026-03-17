import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Test the invoice endpoint with a real JWT token
async function testInvoiceEndpoint() {
  try {
    // Create a JWT token for the buyer user
    const buyerEmail = 'rohitmukhi52@gmail.com';
    const token = jwt.sign(
      { email: buyerEmail, isAdmin: false, isBidder: true },
      process.env.JWT_SECRET
    );
    
    console.log('Testing invoice endpoint for:', buyerEmail);
    console.log('Token:', token.substring(0, 50) + '...');
    
    // Make request to the API
    const response = await fetch('http://localhost:3000/api/invoices/my-invoices', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Invoices returned:', data.invoices.length);
      console.log(JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testInvoiceEndpoint();
