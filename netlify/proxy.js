/**
 * Netlify Serverless Function for Proxying Web Requests
 * * This function takes a URL as a query parameter, fetches the content
 * from that URL, and returns the response. This is a common way to bypass
 * cross-origin restrictions (CORS) and potentially some network filters.
 */

// Import the node-fetch library for making HTTP requests (Netlify includes this)
const fetch = require('node-fetch');

// Main handler for the Netlify function
exports.handler = async (event, context) => {
    // 1. Get the target URL from the query parameters
    const targetUrl = event.queryStringParameters.url;

    if (!targetUrl) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required "url" query parameter.' }),
        };
    }
    
    // Simple protocol enforcement for security and reliability
    let url;
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        url = targetUrl;
    } else {
        url = 'https://' + targetUrl;
    }

    console.log(`Proxying request to: ${url}`);

    try {
        // 2. Fetch the content from the target URL
        const response = await fetch(url, {
            // Optional: Forward user's headers if needed, but often simpler to use default
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
            // Disable follow redirects to better handle certain sites
            follow: 0, 
            redirect: 'manual',
            timeout: 10000, // 10 second timeout
        });

        // 3. Extract necessary data for the client response
        const body = await response.text();
        
        // 4. Determine content type and status code to correctly pass through
        const contentType = response.headers.get('content-type') || 'text/plain';
        
        // 5. Return the response to the client
        return {
            statusCode: response.status,
            headers: {
                'Content-Type': contentType,
                // Required CORS headers for the frontend to access this function
                'Access-Control-Allow-Origin': '*', 
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: body,
        };

    } catch (error) {
        console.error('Proxy Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Could not reach target server: ${error.message}` }),
        };
    }
};
