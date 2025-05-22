
/**
 * HeyGen API Integration through Cloudflare Worker
 * This file handles routing API calls through our Cloudflare Worker to avoid CORS issues
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://heygen-proxy.toby-mather.workers.dev';
const API_KEY = import.meta.env.VITE_HEYGEN_API_KEY;

/**
 * Upload an asset (image or audio) to HeyGen via Cloudflare Worker
 * @param {File|Blob} file - The file to upload
 * @param {string} mimeType - The MIME type of the file
 * @returns {Promise<object>} - The response from the API
 */
export async function proxyUploadAsset(file, mimeType) {
  console.log(`Uploading asset via worker: ${WORKER_URL}/v1/asset`);
  console.log(`File type: ${mimeType}, size: ${file.size} bytes`);
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`${WORKER_URL}/v1/asset`, {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Worker response error: ${response.status}`, errorText);
      throw new Error(`Worker returned error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Worker upload asset response:', data);
    return data;
  } catch (error) {
    console.error('Error in proxyUploadAsset:', error);
    throw error;
  }
}

/**
 * Make a HeyGen API request via Cloudflare Worker
 * @param {string} endpoint - The API endpoint (e.g., "/v1/talking_photo")
 * @param {string} method - The HTTP method (GET, POST, etc.)
 * @param {object|null} body - The request body (for POST, PUT methods)
 * @returns {Promise<object>} - The response from the API
 */
export async function proxyHeyGenAPI(endpoint, method, body) {
  console.log(`Making API request via worker to: ${endpoint}`);
  console.log(`Method: ${method}, Body:`, body);
  
  try {
    const fetchOptions = {
      method: method,
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body);
    }
    
    const url = `${WORKER_URL}${endpoint}`;
    console.log(`Full request URL: ${url}`);
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Worker response error: ${response.status}`, errorText);
      throw new Error(`Worker returned error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Worker API response for ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`Error in proxyHeyGenAPI for ${endpoint}:`, error);
    throw error;
  }
}
