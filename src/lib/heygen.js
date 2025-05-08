
/**
 * HeyGen API Integration Helper Functions
 */

/**
 * Upload an asset (image or audio) to HeyGen
 * @param {File} file - The file to upload
 * @param {string} mime - The MIME type of the file
 * @returns {Promise<object>} - The response from the API
 */
export async function uploadAsset(file, mime) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v1/asset`, {
    method: 'POST',
    headers: {
      'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to upload asset: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Create an avatar group using an image key
 * @param {string} imageKey - The key of the uploaded image
 * @returns {Promise<object>} - The response from the API
 */
export async function createAvatarGroup(imageKey) {
  const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v2/photo_avatar/avatar_group/create`, {
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
    throw new Error(`Failed to create avatar group: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Train an avatar group
 * @param {string} groupId - The ID of the avatar group to train
 * @returns {Promise<object>} - The response from the API
 */
export async function trainAvatarGroup(groupId) {
  const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v2/photo_avatar/train`, {
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
    throw new Error(`Failed to start training: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Poll training status
 * @param {string} groupId - The ID of the avatar group being trained
 * @returns {Promise<object>} - The response from the API
 */
export async function pollTraining(groupId) {
  const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v2/photo_avatar/train/status/${groupId}`, {
    method: 'GET',
    headers: {
      'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to poll training status: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Create a brand voice (with fallback to ElevenLabs)
 * @param {string} audioAssetId - The ID of the uploaded audio asset
 * @returns {Promise<object>} - The response from the API
 */
export async function createBrandVoice(audioAssetId) {
  try {
    const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v1/brand_voice/create`, {
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
      throw new Error(`Failed to create brand voice: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Falling back to using audio directly:', error);
    return { voice_id: null, audio_asset_id: audioAssetId }; // Return audio_asset_id for fallback
  }
}

/**
 * Generate a video
 * @param {string} talkingPhotoId - The ID of the talking photo avatar
 * @param {string} voiceId - The ID of the voice to use (optional)
 * @param {string} audioAssetId - The ID of the audio asset (fallback if no voiceId)
 * @param {string} script - The text to speak
 * @returns {Promise<object>} - The response from the API
 */
export async function generateVideo(talkingPhotoId, voiceId, audioAssetId, script) {
  // Prepare voice configuration based on what we have
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
  
  const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v2/video/generate`, {
    method: 'POST',
    headers: {
      'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate video: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Poll video generation status
 * @param {string} videoId - The ID of the video being generated
 * @returns {Promise<object>} - The response from the API
 */
export async function pollVideo(videoId) {
  const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v1/video_status.get?id=${videoId}`, {
    method: 'GET',
    headers: {
      'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to poll video status: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}
