// ElevenLabs API Integration Helper Functions
// All API calls are routed through our Cloudflare Worker to handle CORS

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://elevenlabs-proxy.tobymather.workers.dev';
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// Import analytics for tracking
import { analytics } from './analytics';

// Types
export interface UploadResult {
  voice_id?: string;
  provider?: 'elevenlabs';
  data?: {
    url?: string;
  };
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  created_at_unix: number;
  category: string;
  is_owner: boolean;
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
  has_more: boolean;
  total_count: number;
  next_page_token?: string;
}

// Helper function to make requests with error handling
async function makeWorkerRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${WORKER_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Clean up old ElevenLabs voices (older than 1 hour)
export async function cleanupOldVoices(): Promise<{ deleted: number; errors: string[] }> {
  console.log('Starting voice cleanup...');
  try {
    // Calculate cutoff time (1 hour ago)
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    // Get all personal voices via Worker
    const response = await fetch(`${WORKER_URL}/elevenlabs/voices?voice_type=personal&sort=created_at_unix&sort_direction=asc&page_size=100`, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }
    const voicesData: ElevenLabsVoicesResponse = await response.json();
    console.log(`Found ${voicesData.total_count} personal voices`);
    // Filter voices older than 1 hour
    const voicesToDelete = voicesData.voices.filter(voice => 
      voice.created_at_unix < oneHourAgo && voice.is_owner
    );
    console.log(`Found ${voicesToDelete.length} voices older than 1 hour to delete`);
    if (voicesToDelete.length === 0) {
      return { deleted: 0, errors: [] };
    }
    // Delete each old voice via Worker
    const results = await Promise.allSettled(
      voicesToDelete.map(async (voice) => {
        console.log(`Deleting voice: ${voice.name} (${voice.voice_id})`);
        const deleteResponse = await fetch(`${WORKER_URL}/elevenlabs/voices/${voice.voice_id}`, {
          method: 'DELETE',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          },
        });
        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete voice ${voice.voice_id}: ${deleteResponse.status}`);
        }
        return voice.voice_id;
      })
    );
    const deleted = results.filter(result => result.status === 'fulfilled').length;
    const errors = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason.message);
    console.log(`Voice cleanup completed: ${deleted} deleted, ${errors.length} errors`);
    analytics.voiceCleanup(deleted, errors.length);
    return { deleted, errors };
  } catch (error) {
    console.error('Voice cleanup failed:', error);
    return { 
      deleted: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown cleanup error'] 
    };
  }
}

// Upload an audio file to create an ElevenLabs voice
export async function uploadAsset(file: File): Promise<UploadResult> {
  console.log('Uploading asset:', file.name, file.type);
  if (!file.type.startsWith('audio/')) {
    throw new Error('Only audio files are supported');
  }
  try {
    // Clean up old voices before creating a new one
    console.log('Cleaning up old voices before creating new voice...');
    const cleanupResult = await cleanupOldVoices();
    if (cleanupResult.errors.length > 0) {
      console.warn('Some voices could not be deleted:', cleanupResult.errors);
    }
    console.log(`Cleanup completed: ${cleanupResult.deleted} voices deleted`);
    // Create voice in ElevenLabs via Worker
    console.log('Creating voice in ElevenLabs via Worker');
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
    return {
      voice_id: voiceData.voice_id,
      provider: 'elevenlabs',
    };
  } catch (error) {
    console.error('Error creating voice:', error);
    throw error;
  }
}

// Generate speech from text using ElevenLabs via Worker
export async function generateSpeech(voiceId: string, text: string): Promise<UploadResult> {
  console.log('Generating speech for text via Worker:', text);
  const response = await fetch(`${WORKER_URL}/elevenlabs/text-to-speech`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      voice_id: voiceId,
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 1.0,
        speed: 0.8
      }
    }),
  });
  
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Error response:', error);
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }
  
  // Check if the response is audio data
  const contentType = response.headers.get('content-type');
  console.log('Content-Type:', contentType);
  
  if (contentType && contentType.includes('audio/')) {
    // The Worker now returns audio data directly, so we need to create a blob URL
    console.log('Processing audio response...');
    const audioBlob = await response.blob();
    console.log('Audio blob size:', audioBlob.size);
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log('Created audio URL:', audioUrl);
    
    return {
      voice_id: voiceId,
      provider: 'elevenlabs',
      data: {
        url: audioUrl
      }
    };
  } else {
    // Fallback: try to parse as JSON (for debugging)
    console.log('Response is not audio, trying to parse as JSON...');
    const text = await response.text();
    console.log('Response text (first 200 chars):', text.slice(0, 200));
    throw new Error(`Unexpected response type: ${contentType}. Response: ${text.slice(0, 200)}`);
  }
} 