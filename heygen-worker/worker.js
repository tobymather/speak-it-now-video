// HeyGen API Cloudflare Worker
// This worker proxies requests to HeyGen's API while handling CORS and security

const HEYGEN_API_BASE = 'https://api.heygen.com';
const HEYGEN_UPLOAD_BASE = 'https://upload.heygen.com';

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Replace with your domain in production
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, Authorization',
};

// Error response helper
function errorResponse(message, status = 500) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

// Success response helper
function successResponse(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
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

    console.log(`Handling ${request.method} request to ${path}`);

    if (!apiKey) {
      console.error('No API key provided');
      return errorResponse('API key is required', 401);
    }

    // Special handling for file uploads
    if (path === '/v1/asset') {
      try {
        console.log('Processing file upload request');
        
        // Get the content type from the incoming request
        const contentType = request.headers.get('Content-Type');
        console.log('Content-Type:', contentType);
        
        // Read the file as an array buffer
        const fileBuffer = await request.arrayBuffer();
        console.log('File size:', fileBuffer.byteLength, 'bytes');
        
        // HeyGen expects the raw file with the Content-Type header
        const targetUrl = `${HEYGEN_UPLOAD_BASE}/v1/asset`;
        console.log('Sending file to HeyGen API:', targetUrl);
        
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': contentType,
          },
          body: fileBuffer,
        });

        console.log('HeyGen API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('HeyGen API error:', errorText);
          return errorResponse(`HeyGen API error: ${response.status} - ${errorText}`, response.status);
        }

        const data = await response.json();
        console.log('File upload successful:', data);
        
        return successResponse(data);
      } catch (error) {
        console.error('File upload error:', error);
        return errorResponse(`File upload failed: ${error.message}`);
      }
    }
    
    // Special handling for photo avatar group creation
    if (path === '/v2/photo_avatar/avatar_group/create') {
      try {
        console.log('Creating avatar group');
        const body = await request.json();
        console.log('Request body:', JSON.stringify(body));
        
        if (!body.image_key) {
          return errorResponse('image_key is required');
        }
        
        console.log('Using image_key:', body.image_key);
        
        // Make request to HeyGen
        const response = await fetch(`${HEYGEN_API_BASE}/v2/photo_avatar/avatar_group/create`, {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        console.log('Avatar group creation response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Avatar group creation error:', errorText);
          return errorResponse(`HeyGen API error: ${response.status} - ${errorText}`, response.status);
        }
        
        const data = await response.json();
        console.log('Avatar group created successfully:', JSON.stringify(data));
        
        return successResponse(data);
      } catch (error) {
        console.error('Avatar group creation error:', error);
        return errorResponse(`Avatar group creation failed: ${error.message}`);
      }
    }
    
    // Special handling for training photo avatar
    if (path === '/v2/photo_avatar/train') {
      try {
        console.log('Training avatar group');
        const body = await request.json();
        console.log('Request body:', JSON.stringify(body));
        
        if (!body.group_id) {
          return errorResponse('group_id is required');
        }
        
        console.log('Using group_id:', body.group_id);
        
        // Check avatar group status before training
        try {
          const statusResponse = await fetch(`${HEYGEN_API_BASE}/v2/photo_avatar/avatar_group/get?group_id=${body.group_id}`, {
            method: 'GET',
            headers: {
              'X-Api-Key': apiKey,
            },
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('Current avatar group status:', JSON.stringify(statusData));
          } else {
            console.warn('Could not get avatar group status:', statusResponse.status);
          }
        } catch (statusError) {
          console.warn('Error checking avatar group status:', statusError);
        }
        
        // Make request to HeyGen
        const response = await fetch(`${HEYGEN_API_BASE}/v2/photo_avatar/train`, {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        console.log('Training response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Training error:', errorText);
          return errorResponse(`HeyGen API error: ${response.status} - ${errorText}`, response.status);
        }
        
        const data = await response.json();
        console.log('Training initiated successfully:', JSON.stringify(data));
        
        return successResponse(data);
      } catch (error) {
        console.error('Training error:', error);
        return errorResponse(`Training failed: ${error.message}`);
      }
    }
    
    // Special handling for polling training status
    if (path.startsWith('/v2/photo_avatar/train/status/')) {
      try {
        const groupId = path.split('/').pop();
        console.log('Polling training status for group:', groupId);
        
        // Make request to HeyGen
        const response = await fetch(`${HEYGEN_API_BASE}/v2/photo_avatar/train/status/${groupId}`, {
          method: 'GET',
          headers: {
            'X-Api-Key': apiKey,
          },
        });
        
        console.log('Training status response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Training status error:', errorText);
          return errorResponse(`HeyGen API error: ${response.status} - ${errorText}`, response.status);
        }
        
        const data = await response.json();
        console.log('Training status retrieved successfully:', JSON.stringify(data));
        
        return successResponse(data);
      } catch (error) {
        console.error('Training status error:', error);
        return errorResponse(`Training status check failed: ${error.message}`);
      }
    }
    
    // Special handling for brand voice creation
    if (path === '/v1/brand_voice/create') {
      try {
        console.log('Creating brand voice');
        const body = await request.json();
        console.log('Request body:', JSON.stringify(body));
        
        if (!body.audio_asset_id) {
          return errorResponse('audio_asset_id is required');
        }
        
        console.log('Using audio_asset_id:', body.audio_asset_id);
        
        // Make request to HeyGen
        const response = await fetch(`${HEYGEN_API_BASE}/v1/brand_voice/create`, {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        console.log('Brand voice creation response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Brand voice creation error:', errorText);
          return errorResponse(`HeyGen API error: ${response.status} - ${errorText}`, response.status);
        }
        
        const data = await response.json();
        console.log('Brand voice created successfully:', JSON.stringify(data));
        
        return successResponse(data);
      } catch (error) {
        console.error('Brand voice creation error:', error);
        return errorResponse(`Brand voice creation failed: ${error.message}`);
      }
    }
    
    // Special handling for video generation
    if (path === '/v2/video/generate') {
      try {
        console.log('Generating video');
        const body = await request.json();
        console.log('Request body:', JSON.stringify(body));
        
        // Make request to HeyGen
        const response = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        console.log('Video generation response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Video generation error:', errorText);
          return errorResponse(`HeyGen API error: ${response.status} - ${errorText}`, response.status);
        }
        
        const data = await response.json();
        console.log('Video generated successfully:', JSON.stringify(data));
        
        return successResponse(data);
      } catch (error) {
        console.error('Video generation error:', error);
        return errorResponse(`Video generation failed: ${error.message}`);
      }
    }

    // Handle all other API routes
    console.log(`Proxying ${request.method} request to ${path}`);
    const heygenResponse = await fetch(`${HEYGEN_API_BASE}${path}${url.search}`, {
      method: request.method,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      console.error('HeyGen API error:', errorText);
      return errorResponse(`HeyGen API error: ${heygenResponse.status} - ${errorText}`, heygenResponse.status);
    }

    const data = await heygenResponse.json();
    console.log(`Response from ${path}:`, data);
    
    return successResponse(data, heygenResponse.status);

  } catch (error) {
    console.error('Worker error:', error);
    return errorResponse(`Worker error: ${error.message}`);
  }
}

// Register the worker handler
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
}); 