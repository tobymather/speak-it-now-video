
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
  console.log(`Uploading asset with type ${mime}, file size: ${file.size} bytes`);
  console.log(`Using API key: ${import.meta.env.VITE_HEYGEN_API_KEY}`);
  console.log(`API Base URL: ${import.meta.env.VITE_HEYGEN_BASE}`);
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    console.log(`Sending request to ${import.meta.env.VITE_HEYGEN_BASE}/v1/asset`);
    const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v1/asset`, {
      method: 'POST',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
      },
      body: formData,
    });
    
    console.log(`Upload response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Upload asset failed: ${response.status} ${response.statusText}`, errorText);
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
    
    console.log(`Create avatar group response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Create avatar group failed: ${response.status} ${response.statusText}`, errorText);
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
    
    console.log(`Train avatar group response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Train avatar group failed: ${response.status} ${response.statusText}`, errorText);
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
    const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v2/photo_avatar/train/status/${groupId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
      },
    });
    
    console.log(`Poll training status response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Poll training status failed: ${response.status} ${response.statusText}`, errorText);
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
 * Create a brand voice (with fallback to ElevenLabs)
 * @param {string} audioAssetId - The ID of the uploaded audio asset
 * @returns {Promise<object>} - The response from the API
 */
export async function createBrandVoice(audioAssetId) {
  console.log(`Creating brand voice with audio asset ID: ${audioAssetId}`);
  
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
    
    console.log(`Create brand voice response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Create brand voice failed: ${response.status} ${response.statusText}`, errorText);
      if (response.status === 403) {
        console.warn('Falling back to using audio directly due to 403 error');
        return { voice_id: null, audio_asset_id: audioAssetId }; // Return audio_asset_id for fallback
      }
      throw new Error(`Failed to create brand voice: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Create brand voice successful:', data);
    return data;
  } catch (error) {
    console.error('Error in createBrandVoice:', error);
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
  console.log(`Generating video with talking photo ID: ${talkingPhotoId}`);
  console.log(`Voice ID: ${voiceId || 'Not available, falling back to audio asset'}`);
  console.log(`Audio Asset ID (fallback): ${audioAssetId}`);
  console.log(`Script: ${script}`);
  
  // Prepare voice configuration based on what we have
  let voiceConfig;
  if (voiceId) {
    voiceConfig = {
      type: "text",
      voice_id: voiceId,
      input_text: script
    };
    console.log('Using text-to-speech voice configuration');
  } else {
    voiceConfig = {
      type: "audio",
      audio_asset_id: audioAssetId
    };
    console.log('Using direct audio asset configuration');
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
  
  console.log('Video generation payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log(`Generate video response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Generate video failed: ${response.status} ${response.statusText}`, errorText);
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
    const response = await fetch(`${import.meta.env.VITE_HEYGEN_BASE}/v1/video_status.get?id=${videoId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': import.meta.env.VITE_HEYGEN_API_KEY,
      },
    });
    
    console.log(`Poll video status response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Poll video status failed: ${response.status} ${response.statusText}`, errorText);
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
