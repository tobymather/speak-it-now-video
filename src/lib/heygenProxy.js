
/**
 * HeyGen API Proxy Helper Functions
 * This file contains proxy implementations that use server-side code or CORS-friendly approaches
 */

// Use Cloudflare Worker URL as a proxy to HeyGen API
const PROXY_URL = "https://lovable-heygen-proxy.yourdomain.workers.dev";

/**
 * Upload an asset (image or audio) to HeyGen through a proxy
 */
export async function proxyUploadAsset(file, mime) {
  console.log(`Proxying upload asset with type ${mime}, file size: ${file.size} bytes`);
  
  // Convert file to base64
  const base64 = await fileToBase64(file);
  
  try {
    // For testing: Show a fake success response until the proxy is set up
    console.log("DEVELOPMENT MODE: Returning mock HeyGen upload response");
    
    // In a real implementation, this would be the fetch call to your Cloudflare Worker:
    /*
    const response = await fetch(`${PROXY_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: import.meta.env.VITE_HEYGEN_API_KEY,
        fileData: base64,
        mimeType: mime
      }),
    });
    
    console.log(`Proxy upload response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Proxy upload asset failed: ${response.status}`, errorText);
      throw new Error(`Failed to upload asset via proxy: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    */
    
    // Mock response for testing
    const isImage = mime.startsWith('image/');
    const mockResponse = isImage 
      ? { image_key: `mock-image-key-${Date.now()}` } 
      : { audio_asset_id: `mock-audio-${Date.now()}` };
    
    console.log('Proxy upload asset successful (MOCK):', mockResponse);
    return mockResponse;
  } catch (error) {
    console.error('Error in proxyUploadAsset:', error);
    throw error;
  }
}

/**
 * Helper function to convert File to base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64String = reader.result.toString().split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Generic proxy function for HeyGen API calls
 */
export async function proxyHeyGenAPI(endpoint, method, body) {
  console.log(`Proxying API call to ${endpoint} with method ${method}`);
  
  try {
    // For testing: Show a fake success response until the proxy is set up
    console.log("DEVELOPMENT MODE: Returning mock HeyGen API response for endpoint", endpoint);
    
    // In a real implementation, this would be the fetch call to your Cloudflare Worker:
    /*
    const response = await fetch(`${PROXY_URL}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: import.meta.env.VITE_HEYGEN_API_KEY,
        endpoint,
        method,
        body
      }),
    });
    
    console.log(`Proxy API call response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Proxy API call failed: ${response.status}`, errorText);
      throw new Error(`Failed to call API via proxy: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    */
    
    // Mock responses based on endpoint
    let mockResponse = {};
    
    if (endpoint.includes('/avatar_group/create')) {
      mockResponse = { group_id: `mock-group-${Date.now()}` };
    }
    else if (endpoint.includes('/photo_avatar/train')) {
      mockResponse = { status: 'requested' };
    }
    else if (endpoint.includes('/train/status')) {
      mockResponse = { 
        status: 'completed', 
        talking_photo_id: `mock-talking-photo-${Date.now()}` 
      };
    }
    else if (endpoint.includes('/brand_voice/create')) {
      mockResponse = { voice_id: `mock-voice-${Date.now()}` };
    }
    else if (endpoint.includes('/video/generate')) {
      mockResponse = { video_id: `mock-video-${Date.now()}` };
    }
    else if (endpoint.includes('/video_status.get')) {
      mockResponse = { 
        status: 'completed',
        video_url: 'https://assets.mixkit.co/videos/preview/mixkit-a-woman-talking-while-reading-from-a-notebook-41716-large.mp4'
      };
    }
    
    console.log(`Mock API response for ${endpoint}:`, mockResponse);
    return mockResponse;
  } catch (error) {
    console.error(`Error in proxyHeyGenAPI call to ${endpoint}:`, error);
    throw error;
  }
}
