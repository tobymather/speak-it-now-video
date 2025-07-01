// ElevenLabs API Cloudflare Worker
// This worker proxies requests to ElevenLabs API while handling CORS

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, xi-api-key',
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

// Main API request handler
async function handleApiRequest(request, env) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const elevenLabsApiKey = env.ELEVENLABS_API_KEY;
    
    console.log(`Handling ${request.method} request to ${path}`);
    console.log('First 6 chars of ElevenLabs API key:', elevenLabsApiKey ? elevenLabsApiKey.slice(0, 6) + '...' : 'undefined');

    if (!elevenLabsApiKey) {
      console.log('No ElevenLabs API key found in env!');
      return errorResponse('ElevenLabs API key is required', 401);
    }

    // ElevenLabs voice creation endpoint
    if (path === '/elevenlabs/voices/add') {
      try {
        console.log('Creating voice in ElevenLabs');
        
        const contentType = request.headers.get('Content-Type');
        console.log('Content-Type:', contentType);
        
        if (!contentType || !contentType.includes('multipart/form-data')) {
          return errorResponse('Content-Type must be multipart/form-data');
        }
        
        const formData = await request.formData();
        const audioFile = formData.get('files');
        const name = formData.get('name') || `Voice ${Date.now()}`;
        
        if (!audioFile) {
          return errorResponse('Audio file is required');
        }
        
        const elevenLabsFormData = new FormData();
        elevenLabsFormData.append('name', name);
        elevenLabsFormData.append('files', audioFile);
        
        const response = await fetch(`${ELEVENLABS_API_BASE}/voices/add`, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsApiKey,
          },
          body: elevenLabsFormData,
        });
        
        console.log('ElevenLabs API response status:', response.status);
        
        const respText = await response.text();
        console.log('ElevenLabs /voices/add response body:', respText.slice(0, 200));
        
        if (!response.ok) {
          console.error('ElevenLabs API error:', respText);
          return errorResponse(`ElevenLabs API error: ${response.status} - ${respText}`, response.status);
        }
        
        const data = JSON.parse(respText);
        console.log('Voice created successfully in ElevenLabs:', JSON.stringify(data));
        
        return successResponse(data);
      } catch (error) {
        console.error('ElevenLabs voice creation error:', error);
        return errorResponse(`ElevenLabs voice creation failed: ${error.message}`);
      }
    }

    // ElevenLabs text-to-speech endpoint
    if (path === '/elevenlabs/text-to-speech') {
      try {
        console.log('Generating speech from ElevenLabs');
        const body = await request.json();
        console.log('Request body:', JSON.stringify(body));
        
        if (!body.voice_id) {
          return errorResponse('voice_id is required');
        }
        
        if (!body.text) {
          return errorResponse('text is required');
        }
        
        const ttsUrl = `${ELEVENLABS_API_BASE}/text-to-speech/${body.voice_id}`;
        console.log('Proxying POST to:', ttsUrl);
        const response = await fetch(ttsUrl, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: body.text,
            model_id: body.model_id || 'eleven_monolingual_v1',
            voice_settings: body.voice_settings || {
              stability: 0.5,
              similarity_boost: 0.75
            }
          }),
        });
        
        console.log('ElevenLabs TTS response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('ElevenLabs TTS error:', errorText);
          return errorResponse(`ElevenLabs API error: ${response.status} - ${errorText}`, response.status);
        }
        
        const audioData = await response.arrayBuffer();
        console.log('Received audio data from ElevenLabs, size:', audioData.byteLength);
        
        return new Response(audioData, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioData.byteLength.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      } catch (error) {
        console.error('Speech generation error:', error);
        return errorResponse(`Speech generation failed: ${error.message}`);
      }
    }

    // ElevenLabs voices list endpoint
    if (request.method === 'GET' && path === '/elevenlabs/voices') {
      const query = url.search;
      console.log('Proxying GET /v2/voices to ElevenLabs with query:', query);
      const response = await fetch(`https://api.elevenlabs.io/v2/voices${query}`, {
        method: 'GET',
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
      });
      console.log('ElevenLabs /v2/voices response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('ElevenLabs /v2/voices error:', errorText);
        return errorResponse(`ElevenLabs API error: ${response.status} - ${errorText}`, response.status);
      }
      
      const data = await response.text();
      console.log('ElevenLabs /v2/voices response body:', data.slice(0, 200));
      
      try {
        const jsonData = JSON.parse(data);
        return successResponse(jsonData, response.status);
      } catch (parseError) {
        console.error('Failed to parse ElevenLabs response as JSON:', parseError);
        return errorResponse(`Invalid JSON response from ElevenLabs: ${data.slice(0, 200)}`, 500);
      }
    }

    // ElevenLabs voice deletion endpoint
    if (request.method === 'DELETE' && path.startsWith('/elevenlabs/voices/')) {
      const voiceId = path.split('/').pop();
      console.log('Proxying DELETE /v1/voices/' + voiceId + ' to ElevenLabs');
      const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
      });
      console.log('ElevenLabs DELETE /v1/voices response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.log('ElevenLabs DELETE /v1/voices error:', errorText);
        return errorResponse(`Failed to delete voice: ${errorText}`, response.status);
      }
      return successResponse({ success: true }, response.status);
    }

    // If we get here, the endpoint is not supported
    return errorResponse(`Endpoint not found: ${path}`, 404);

  } catch (error) {
    console.error('Worker error:', error);
    return errorResponse(`Worker error: ${error.message}`);
  }
}

// Main handler for all requests
async function handleRequest(request, env) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Handle all API requests
  return handleApiRequest(request, env);
}

// Register the fetch event handler
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event.env));
});

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};
