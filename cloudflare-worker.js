
/**
 * HeyGen API Proxy Worker
 * This would need to be deployed to Cloudflare Workers to handle the CORS issues
 * 
 * IMPORTANT: This file is for reference only, it would need to be deployed
 * to Cloudflare Workers separately from this application.
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORS(request, new Response(null, { status: 204 }))
  }

  const url = new URL(request.url)
  const path = url.pathname

  try {
    if (path === '/upload') {
      return await handleUpload(request)
    } else if (path === '/api') {
      return await handleApiProxy(request)
    } else {
      return new Response('Not found', { status: 404 })
    }
  } catch (err) {
    return handleCORS(
      request,
      new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    )
  }
}

async function handleUpload(request) {
  const requestData = await request.json()
  const { apiKey, fileData, mimeType } = requestData

  if (!apiKey || !fileData || !mimeType) {
    return handleCORS(
      request,
      new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    )
  }

  // Convert base64 to binary
  const binary = atob(fileData)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  // Create FormData with the binary data
  const formData = new FormData()
  const blob = new Blob([bytes], { type: mimeType })
  formData.append('file', blob)

  // Forward to HeyGen API
  const response = await fetch('https://api.heygen.com/v1/asset', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey
    },
    body: formData
  })

  const data = await response.json()
  return handleCORS(
    request,
    new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    })
  )
}

async function handleApiProxy(request) {
  const requestData = await request.json()
  const { apiKey, endpoint, method, body } = requestData

  if (!apiKey || !endpoint || !method) {
    return handleCORS(
      request,
      new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    )
  }

  const response = await fetch(`https://api.heygen.com${endpoint}`, {
    method: method,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  })

  const data = await response.json()
  return handleCORS(
    request,
    new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    })
  )
}

function handleCORS(request, response) {
  // Get the Origin header from the request
  const origin = request.headers.get('Origin')
  
  // Check if the origin is valid (you can implement your own validation logic)
  const validOrigins = [
    'http://localhost:3000',
    'https://your-production-domain.com',
    'https://preview-0eb197e8--speak-it-now-video.lovable.app'
  ]
  
  const allowedOrigin = validOrigins.includes(origin) ? origin : validOrigins[0]

  // Apply CORS headers to the response
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}
