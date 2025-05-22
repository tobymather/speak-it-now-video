// HeyGen API Integration Helper Functions
// All API calls are routed through our Cloudflare Worker to handle CORS

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://heygen-proxy.tobymather.workers.dev';
const HEYGEN_API_KEY = import.meta.env.VITE_HEYGEN_API_KEY;
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

// Types
export interface UploadResult {
  asset_id: string;
  voice_id?: string;
  provider?: 'elevenlabs';
  data?: {
    url?: string;
    asset_id?: string;
  };
}

export interface AvatarGroupResult {
  data: {
    group_id: string;
  };
}

export interface TrainingStatus {
  data: {
    status: 'processing' | 'ready' | 'completed' | 'failed';
    error_msg?: string;
  };
}

export interface VideoResult {
  data: {
    video_id: string;
    video_url?: string;
    status: 'processing' | 'completed' | 'failed';
    error_msg?: string;
  };
}

export interface ScriptPayload {
  type: string;
  input: string;
  voice_id?: string;
  audio_asset_id?: string;
}

// Helper function to make API requests through the worker
async function makeWorkerRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${WORKER_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': HEYGEN_API_KEY,
    ...(options.headers || {}),
  };

  // Add ElevenLabs API key if needed
  if (endpoint.startsWith('/elevenlabs/') || endpoint === '/v1/voice.add') {
    headers['xi-api-key'] = ELEVENLABS_API_KEY;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Upload an asset (image or audio) to HeyGen
export async function uploadAsset(file: File): Promise<UploadResult> {
  console.log('Uploading asset:', file.name, file.type);
  
  // Special handling for audio files - create ElevenLabs voice first
  if (file.type.startsWith('audio/')) {
    try {
      // 1. Create voice in ElevenLabs
      console.log('Creating voice in ElevenLabs');
      const formData = new FormData();
      formData.append('files', file);
      formData.append('name', `Voice ${Date.now()}`);
      
      const voiceResponse = await fetch(`${WORKER_URL}/elevenlabs/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: formData,
      });
      
      if (!voiceResponse.ok) {
        const error = await voiceResponse.text();
        throw new Error(`ElevenLabs voice creation failed: ${voiceResponse.status} - ${error}`);
      }
      
      const voiceData = await voiceResponse.json();
      console.log('Voice created in ElevenLabs:', voiceData);
      
      // 2. Link voice to HeyGen
      console.log('Linking voice to HeyGen');
      const linkResponse = await makeWorkerRequest<{ data: { voice_id: string } }>('/v1/voice.add', {
        method: 'POST',
        body: JSON.stringify({
          voice_id: voiceData.voice_id,
        }),
      });
      
      console.log('Voice linked to HeyGen:', linkResponse);
      
      // Return both the ElevenLabs voice ID and HeyGen voice ID
      return {
        asset_id: linkResponse.data.voice_id,
        voice_id: voiceData.voice_id,
        provider: 'elevenlabs',
      };
    } catch (error) {
      console.error('Error creating voice:', error);
      throw error;
    }
  }
  
  // For images, use the regular upload process
  const response = await fetch(`${WORKER_URL}/v1/asset`, {
    method: 'POST',
    headers: {
      'X-Api-Key': HEYGEN_API_KEY,
    },
    body: file,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  console.log('Asset uploaded successfully:', data);
  
  // For images, format the key correctly
  if (file.type.startsWith('image/')) {
    return {
      ...data,
      asset_id: `image/${data.data.asset_id}/original`,
    };
  }
  
  return data;
}

// Create an avatar group from uploaded images
export async function createAvatarGroup(imageKey: string): Promise<AvatarGroupResult> {
  console.log('Creating avatar group with image:', imageKey);
  
  return makeWorkerRequest<AvatarGroupResult>('/v2/photo_avatar/avatar_group/create', {
    method: 'POST',
    body: JSON.stringify({
      image_key: imageKey,
    }),
  });
}

// Train the avatar group
export async function trainAvatarGroup(groupId: string): Promise<{ data: { status: string } }> {
  console.log('Training avatar group:', groupId);
  
  return makeWorkerRequest('/v2/photo_avatar/train', {
    method: 'POST',
    body: JSON.stringify({
      group_id: groupId,
    }),
  });
}

// Check training status
export async function checkTrainingStatus(groupId: string): Promise<TrainingStatus> {
  console.log('Checking training status for group:', groupId);
  
  return makeWorkerRequest<TrainingStatus>(`/v2/photo_avatar/train/status/${groupId}`, {
    method: 'GET',
  });
}

// Generate speech from text using ElevenLabs
export async function generateSpeech(voiceId: string, text: string): Promise<UploadResult> {
  console.log('Generating speech for text:', text);
  
  return makeWorkerRequest<UploadResult>('/elevenlabs/text-to-speech', {
    method: 'POST',
    body: JSON.stringify({
      voice_id: voiceId,
      text: text,
    }),
  });
}

// Generate a video
export async function generateVideo(
  avatarId: string,
  script: string,
  voiceId?: string,
  audioAssetId?: string
): Promise<VideoResult> {
  console.log('Generating video with:', { avatarId, script, voiceId, audioAssetId });
  
  const payload = {
    avatar_id: avatarId,
    script: {
      type: 'text',
      input: script,
    } as ScriptPayload,
  };
  
  // Use either voice_id (for ElevenLabs) or audio_asset_id (for direct audio)
  if (voiceId) {
    payload.script.voice_id = voiceId;
  } else if (audioAssetId) {
    payload.script.audio_asset_id = audioAssetId;
  } else {
    throw new Error('Either voice_id or audio_asset_id must be provided');
  }
  
  return makeWorkerRequest<VideoResult>('/v2/video/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Check video status
export async function checkVideoStatus(videoId: string): Promise<VideoResult> {
  console.log('Checking video status:', videoId);
  
  return makeWorkerRequest<VideoResult>(`/v1/video.status.get?video_id=${videoId}`, {
    method: 'GET',
  });
}

// Poll training status
export async function pollTraining(groupId: string): Promise<{
  status: 'processing' | 'completed' | 'failed';
  talking_photo_id?: string;
  error_msg?: string;
}> {
  console.log('Polling training status for group:', groupId);
  
  const status = await checkTrainingStatus(groupId);
  
  if (status.data.status === 'failed') {
    throw new Error(status.data.error_msg || 'Training failed');
  }
  
  // Map 'ready' status to 'completed' for consistency
  const mappedStatus = status.data.status === 'ready' ? 'completed' : status.data.status;
  
  return {
    status: mappedStatus as 'processing' | 'completed' | 'failed',
    talking_photo_id: mappedStatus === 'completed' ? groupId : undefined,
  };
}

// Create a brand voice from audio
export async function createBrandVoice(audioAssetId: string): Promise<{
  voice_id: string;
}> {
  console.log('Creating brand voice from audio:', audioAssetId);
  
  // For now, we'll just return the audio asset ID as the voice ID
  // since we're using direct audio uploads
  return {
    voice_id: audioAssetId,
  };
}

// Poll video status
export async function pollVideo(videoId: string): Promise<{
  status: 'processing' | 'completed' | 'failed';
  video_url?: string;
  error_msg?: string;
}> {
  console.log('Polling video status:', videoId);
  
  const status = await checkVideoStatus(videoId);
  
  if (status.data.status === 'failed') {
    throw new Error(status.data.error_msg || 'Video generation failed');
  }
  
  return {
    status: status.data.status,
    video_url: status.data.video_url,
  };
} 