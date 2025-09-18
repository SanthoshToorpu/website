// Using built-in fetch API (Node.js 18+)

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    try {
        console.log('Function invoked with method:', event.httpMethod);
        console.log('Request body:', event.body);
        
        // Get the auth token from environment variables
        const authToken = process.env.CHATBOT_AUTH_TOKEN;
        
        if (!authToken) {
            console.error('CHATBOT_AUTH_TOKEN environment variable not set');
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Server configuration error - AUTH_TOKEN not set' })
            };
        }

        // Parse the request body
        let requestBody;
        try {
            requestBody = JSON.parse(event.body);
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError);
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }
        
        const { message, messages, stream = true } = requestBody;

        if (!message) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Message is required' })
            };
        }

        // Prepare the payload for the API
        const payload = {
            message: message,
            stream: stream,
            messages: messages || []
        };

        console.log('Forwarding request to API:', { message, stream, messagesCount: messages?.length || 0 });

        // Make the request to the external API
        let response;
        try {
            response = await fetch('https://129.80.218.9/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });
        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Failed to connect to API',
                    details: fetchError.message 
                })
            };
        }

        if (!response.ok) {
            console.error('API request failed:', response.status, response.statusText);
            return {
                statusCode: response.status,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: `API request failed: ${response.status} ${response.statusText}` 
                })
            };
        }

        // Handle streaming response
        if (stream && response.body) {
            // Set up streaming response headers
            const headers = {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            };

            // Create a readable stream that forwards the API response
            const streamResponse = {
                statusCode: 200,
                headers,
                body: response.body
            };

            return streamResponse;
        } else {
            // Handle non-streaming response
            const data = await response.text();
            
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: data
            };
        }

    } catch (error) {
        console.error('Error in chatbot function:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};
