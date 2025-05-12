/**
 * HeyGen API Integration Helper Functions
 * All API calls are routed through our Cloudflare Worker to handle CORS
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://heygen-proxy.tobymather.workers.dev';

/**
 * Upload an asset (image or audio) to HeyGen
 * @param {File} file - The file to upload
 * @param {string} mime - The MIME type of the file
 * @returns {Promise<object>} - The response from the API
 */
export async function uploadAsset(file, mime) {
  console.log(`Uploading asset with type ${mime}, file size: ${file.size} bytes`);
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`${WORKER_URL}/v1/asset`, {
      method: 'POST',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload asset: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Upload asset successful:', data);
    return data;
  } catch (error) {
    console.error('Error in uploadAsset:', error);
    throw error;
  }
}

/**
 * Create an avatar group using an image key
 * @param {string} imageKey - The key of the uploaded image
 * @returns {Promise<object>} - The response from the API
 */
export async function createAvatarGroup(imageKey) {
  console.log(`Creating avatar group with image key: ${imageKey}`);
  
  try {
    const response = await fetch(`${WORKER_URL}/v2/photo_avatar/avatar_group/create`, {
      method: 'POST',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_key: imageKey,
        name: `Avatar Group ${Date.now()}`,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create avatar group: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Create avatar group successful:', data);
    return data;
  } catch (error) {
    console.error('Error in createAvatarGroup:', error);
    throw error;
  }
}

/**
 * Train an avatar group
 * @param {string} groupId - The ID of the avatar group to train
 * @returns {Promise<object>} - The response from the API
 */
export async function trainAvatarGroup(groupId) {
  console.log(`Training avatar group with ID: ${groupId}`);
  
  try {
    const response = await fetch(`${WORKER_URL}/v2/photo_avatar/train`, {
      method: 'POST',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        group_id: groupId,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to start training: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Train avatar group successful:', data);
    return data;
  } catch (error) {
    console.error('Error in trainAvatarGroup:', error);
    throw error;
  }
}

/**
 * Poll training status
 * @param {string} groupId - The ID of the avatar group being trained
 * @returns {Promise<object>} - The response from the API
 */
export async function pollTraining(groupId) {
  console.log(`Polling training status for group ID: ${groupId}`);
  
  try {
    const response = await fetch(`${WORKER_URL}/v2/photo_avatar/train/status/${groupId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to poll training status: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Poll training status successful:', data);
    return data;
  } catch (error) {
    console.error('Error in pollTraining:', error);
    throw error;
  }
}

/**
 * Create a brand voice
 * @param {string} audioAssetId - The ID of the uploaded audio asset
 * @returns {Promise<object>} - The response from the API
 */
export async function createBrandVoice(audioAssetId) {
  console.log(`Creating brand voice with audio asset ID: ${audioAssetId}`);
  
  try {
    const response = await fetch(`${WORKER_URL}/v1/brand_voice/create`, {
      method: 'POST',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_asset_id: audioAssetId,
        name: `Voice ${Date.now()}`,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create brand voice: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Create brand voice successful:', data);
    return data;
  } catch (error) {
    console.error('Error in createBrandVoice:', error);
    throw error;
  }
}

/**
 * Generate a video
 * @param {string} talkingPhotoId - The ID of the talking photo avatar
 * @param {string} voiceId - The ID of the voice to use
 * @param {string} script - The text to speak
 * @returns {Promise<object>} - The response from the API
 */
export async function generateVideo(talkingPhotoId, voiceId, audioAssetId, script) {
  console.log(`Generating video with talking photo ID: ${talkingPhotoId}`);
  
  let voiceConfig;
  if (voiceId) {
    voiceConfig = {
      type: "text",
      voice_id: voiceId,
      input_text: script
    };
  } else {
    voiceConfig = {
      type: "audio",
      audio_asset_id: audioAssetId
    };
  }
  
  const payload = {
    video_inputs: [
      {
        character: {
          type: "talking_photo",
          talking_photo_id: talkingPhotoId
        },
        voice: voiceConfig,
      },
    ],
  };
  
  try {
    const response = await fetch(`${WORKER_URL}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate video: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Generate video successful:', data);
    return data;
  } catch (error) {
    console.error('Error in generateVideo:', error);
    throw error;
  }
}

/**
 * Poll video generation status
 * @param {string} videoId - The ID of the video being generated
 * @returns {Promise<object>} - The response from the API
 */
export async function pollVideo(videoId) {
  console.log(`Polling video status for video ID: ${videoId}`);
  
  try {
    const response = await fetch(`${WORKER_URL}/v1/video_status.get?id=${videoId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to poll video status: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Poll video status successful:', data);
    return data;
  } catch (error) {
    console.error('Error in pollVideo:', error);
    throw error;
  }
}
