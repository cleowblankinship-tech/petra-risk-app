// api/getReview.js
// Vercel Serverless Function for retrieving assessment results by token

module.exports = async (req, res) => {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Retrieve from KV store (if configured)
    // In production: const data = await kv.get(token);
    
    // For development: Return mock data
    console.log('Retrieving data for token:', token);

    // Check if KV is available
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        const kvResponse = await fetch(
          `${process.env.KV_REST_API_URL}/get/${token}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`
            }
          }
        );

        if (!kvResponse.ok) {
          console.log('Token not found in KV');
          return res.status(404).json({ 
            error: 'Token not found or expired',
            expired: true 
          });
        }

        const kvData = await kvResponse.json();
        const payload = kvData.result;

        if (!payload) {
          return res.status(404).json({ 
            error: 'Token not found or expired',
            expired: true 
          });
        }

        // Check expiration
        const expiresAt = new Date(payload.meta.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000);
        if (expiresAt < new Date()) {
          return res.status(410).json({ 
            error: 'Token expired',
            expired: true 
          });
        }

        return res.status(200).json({
          ...payload,
          expired: false
        });

      } catch (kvError) {
        console.error('Error retrieving from KV:', kvError);
      }
    }

    // Fallback: Return mock data for development
    console.log('KV not configured - returning mock data');
    return res.status(200).json({
      client: {
        firstName: 'Sample',
        lastName: 'Client',
        email: 'sample@example.com'
      },
      scores: {
        overall: 67,
        band: 'Balanced Growth',
        behavioral: 38,
        traditional: 29
      },
      meta: {
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'America/Denver'
        }),
        version: '1.0'
      },
      answers: [
        {
          id: 'example1',
          text: 'Sample question 1',
          selectedOption: 'Sample answer'
        }
      ],
      expired: false
    });

  } catch (error) {
    console.error('Error in getReview:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message // this is CB making a very small change
    });
  }
};