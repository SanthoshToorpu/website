const fetch = require('node-fetch');

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

    // Handle CORS preflight
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
        // Get the auth token from environment variables
        const authToken = process.env.CHATBOT_AUTH_TOKEN;
        
        if (!authToken) {
            console.error('CHATBOT_AUTH_TOKEN not found in environment variables');
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        // Parse the request body
        const requestBody = JSON.parse(event.body);
        const { message, stream, messages } = requestBody;

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
            message,
            stream: stream || true,
            messages: messages || []
        };

        console.log('Forwarding request to API:', { message: message.substring(0, 100) + '...' });

        // Make the request to the actual API
        const apiResponse = await fetch('https://129.80.218.9/api/agent/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            console.error('API request failed:', apiResponse.status, apiResponse.statusText);
            return {
                statusCode: apiResponse.status,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: `API request failed: ${apiResponse.status} ${apiResponse.statusText}` 
                })
            };
        }

        // Check if the response is streaming
        const contentType = apiResponse.headers.get('content-type');
        
        if (contentType && contentType.includes('text/event-stream')) {
            // Handle streaming response
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                },
                body: apiResponse.body
            };
        } else {
            // Handle regular JSON response
            const responseData = await apiResponse.text();
            
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: responseData
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
