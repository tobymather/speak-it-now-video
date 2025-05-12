
// HeyGen API Cloudflare Worker
// This worker proxies requests to HeyGen's API while handling CORS

const HEYGEN_API_BASE = 'https://api.heygen.com';

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, you'd want to restrict this
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, Authorization',
};

// Handle multipart form data for file uploads
async function handleFileUpload(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      throw new Error('No file provided');
    }
    
    // Forward the formData to HeyGen API
    const apiKey = request.headers.get('X-Api-Key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create new FormData instance to send to HeyGen
    const newFormData = new FormData();
    newFormData.append('file', file);
    
    const response = await fetch(`${HEYGEN_API_BASE}/v1/asset`, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: newFormData,
    });
    
    const responseData = await response.json();
    
    return new Response(
      JSON.stringify(responseData), 
      { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error processing file upload' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Handle standard API requests
async function handleApiRequest(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const apiKey = request.headers.get('X-Api-Key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const heygenUrl = `${HEYGEN_API_BASE}${path}${url.search}`;
    console.log(`Forwarding request to: ${heygenUrl}`);
    
    const headers = new Headers({
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    });
    
    const fetchOptions = {
      method: request.method,
      headers: headers,
    };
    
    // Add body for non-GET requests
    if (request.method !== 'GET') {
      fetchOptions.body = await request.text();
    }
    
    const response = await fetch(heygenUrl, fetchOptions);
    const responseData = await response.json();
    
    return new Response(
      JSON.stringify(responseData), 
      { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('API request error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error processing API request' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Main handler for all requests
async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const url = new URL(request.url);
  
  // Handle asset uploads separately
  if (url.pathname === '/v1/asset' && request.method === 'POST') {
    return handleFileUpload(request);
  }
  
  // Handle all other API requests
  return handleApiRequest(request);
}

// Register the fetch event handler
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
