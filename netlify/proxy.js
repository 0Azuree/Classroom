/**
 * Serverless function for the Classroom Web Proxy.
 * This function fetches an external URL and returns the HTML content,
 * bypassing CORS and allowing uncensored access.
 */
const fetch = require('node-fetch');

// The main handler function for the Netlify function
exports.handler = async (event, context) => {
    // 1. Check if the request method is POST and has a body
    if (event.httpMethod !== 'POST' || !event.body) {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed or Missing Body' }),
        };
    }

    let url;
    try {
        // Parse the body to get the target URL
        const data = JSON.parse(event.body);
        url = data.url;

        if (!url) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'URL parameter is missing in the request body.' }),
            };
        }
        
        // Ensure the URL is fully qualified for reliable fetching
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

    } catch (parseError) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON format in request body.' }),
        };
    }

    try {
        // 2. Fetch the content from the target URL
        const response = await fetch(url, {
            // Important: We need to tell the proxy to ignore response errors (like 404s) 
            // and simply return the content/status it receives.
            // This is a common point of failure for proxy functions.
            redirect: 'follow',
            timeout: 10000, // 10 second timeout
        });

        // 3. Handle non-200 status codes from the target site
        if (!response.ok) {
            return {
                statusCode: 200, // Still return 200 to the frontend so it can display the error
                body: JSON.stringify({ 
                    error: `Target site returned status: ${response.status} ${response.statusText}`,
                    content: `Could not load ${url}. Target server returned: ${response.status}`,
                }),
            };
        }

        // 4. Read the HTML content as plain text
        const content = await response.text();

        // 5. Success! Return the content wrapped in a JSON object
        return {
            statusCode: 200,
            headers: {
                // Allows the frontend to read this response
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({ content: content }),
        };

    } catch (fetchError) {
        // 6. Handle network or server-side errors
        console.error('Proxy Fetch Error:', fetchError);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Proxy failed to connect to site: ${fetchError.message}` }),
        };
    }
};
