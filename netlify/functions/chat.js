// netlify/functions/chat.js
export async function handler(event) {
  // Enable CORS for all origins
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!body.message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    // Get the auth token from environment variable
    const authToken = process.env.AUTH_TOKEN;
    if (!authToken) {
      console.error('AUTH_TOKEN environment variable is not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    // Forward the request to the external API
    const response = await fetch("https://129.80.218.9/api/agent/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    // Check if the response is ok
    if (!response.ok) {
      console.error(`External API error: ${response.status} ${response.statusText}`);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `External API error: ${response.status}`,
          message: await response.text()
        }),
      };
    }

    // Handle streaming response
    if (response.body) {
      // Return a streaming response
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
        body: response.body,
      };
    } else {
      // Fallback for non-streaming responses
      const data = await response.text();
      return {
        statusCode: response.status,
        headers,
        body: data,
      };
    }

  } catch (err) {
    console.error('Error in chat function:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: err.message 
      }),
    };
  }
}
