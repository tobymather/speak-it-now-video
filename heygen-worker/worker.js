// HeyGen API Cloudflare Worker
// This worker proxies requests to HeyGen's API while handling CORS and security

const HEYGEN_API_BASE = 'https://api.heygen.com';

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Replace with your domain in production
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, Authorization',
};

// Handle multipart form data parsing
async function parseFormData(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) {
    throw new Error('No file provided');
  }
  return file;
}

// Handle incoming requests
async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const apiKey = request.headers.get('X-Api-Key');

    if (!apiKey) {
      return new Response('API key is required', { status: 401 });
    }

    // Special handling for file uploads
    if (path === '/v1/asset') {
      const file = await parseFormData(request);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${HEYGEN_API_BASE}/v1/asset`, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
        },
        body: formData,
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Handle all other API routes
    const heygenResponse = await fetch(`${HEYGEN_API_BASE}${path}${url.search}`, {
      method: request.method,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    const data = await heygenResponse.json();
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: heygenResponse.status,
    });

  } catch (error) {
    console.error('Worker error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// Register the worker handler
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
}); 