// HeyGen API Integration Helper Functions
// All API calls are routed through our Cloudflare Worker to handle CORS

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://heygen-proxy.tobymather.workers.dev';
const HEYGEN_API_KEY = import.meta.env.VITE_HEYGEN_API_KEY;
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// Types
export interface UploadResult {
  voice_id?: string;
  provider?: 'elevenlabs';
  data?: {
    url?: string;
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
    'xi-api-key': ELEVENLABS_API_KEY,
    ...(options.headers || {}),
  };

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

// Helper function to make API requests to ElevenLabs
async function makeElevenLabsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${ELEVENLABS_API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'xi-api-key': ELEVENLABS_API_KEY,
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Upload an audio file to create an ElevenLabs voice
export async function uploadAsset(file: File): Promise<UploadResult> {
  console.log('Uploading asset:', file.name, file.type);
  
  if (!file.type.startsWith('audio/')) {
    throw new Error('Only audio files are supported');
  }

  try {
    // Create voice in ElevenLabs
    console.log('Creating voice in ElevenLabs');
    const formData = new FormData();
    formData.append('files', file);
    formData.append('name', `Voice ${Date.now()}`);
    
    const voiceResponse = await fetch(`${ELEVENLABS_API_BASE}/voices/add`, {
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
    
    // Return just the ElevenLabs voice ID
    return {
      voice_id: voiceData.voice_id,
      provider: 'elevenlabs',
    };
  } catch (error) {
    console.error('Error creating voice:', error);
    throw error;
  }
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

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 1.0,
        speed: 0.8
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  return {
    voice_id: voiceId,
    provider: 'elevenlabs',
    data: {
      url: audioUrl
    }
  };
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