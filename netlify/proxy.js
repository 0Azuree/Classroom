const fetch = require('node-fetch');

// List of headers that can cause issues when proxied
const headersToStrip = [
    'content-encoding',
    'transfer-encoding',
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'upgrade',
    'expect',
    'host'
];

exports.handler = async (event) => {
    // 1. Check for valid method (must be POST)
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    let urlToProxy;
    try {
        // 2. Parse the body to get the URL
        const { url } = JSON.parse(event.body);
        if (!url) {
            throw new Error('Missing URL in request body.');
        }
        urlToProxy = url;
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Invalid Request Body: ${e.message}` }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        // 3. Perform the fetch request to the external site
        const response = await fetch(urlToProxy, {
            method: 'GET', // Always request with GET to get content
            // We strip headers here to increase success rate against blocking
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
            redirect: 'follow',
            timeout: 10000, // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`External site responded with status: ${response.status}`);
        }

        // 4. Get the HTML content as text
        const content = await response.text();

        // 5. Success response: return the content wrapped in JSON
        return {
            statusCode: 200,
            body: JSON.stringify({ content: content }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Allow all origins for the function call
            },
        };

    } catch (error) {
        console.error('Proxy Fetch Error:', error);
        
        // 6. Error response
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Could not reach site or internal error: ${error.message}` }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
