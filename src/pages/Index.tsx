
import React, { useState, useEffect } from "react";
import UploadScreen from "@/components/UploadScreen";
import ProgressScreen from "@/components/ProgressScreen";
import ResultScreen from "@/components/ResultScreen";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import posthog from "posthog-js";
import { AnimatePresence } from "framer-motion";

import {
  uploadAsset,
  createAvatarGroup,
  trainAvatarGroup,
  pollTraining,
  createBrandVoice,
  generateVideo,
  pollVideo,
} from "@/lib/heygen";

// Initialize PostHog but only if key exists and is not the placeholder
if (typeof window !== 'undefined' && 
    import.meta.env.VITE_POSTHOG_KEY && 
    import.meta.env.VITE_POSTHOG_KEY !== 'your_posthog_key_here') {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
  });
}

type AppState = 'idle' | 'uploading' | 'training' | 'voicing' | 'rendering' | 'done';

const Index = () => {
  const [state, setState] = useState<AppState>('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Poll for status updates
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    
    // Clean up function
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);
  
  const handleSubmit = async (photo: File, audio: Blob, script: string) => {
    try {
      console.log("Starting video creation process");
      console.log("Photo type:", photo.type, "size:", photo.size);
      console.log("Audio type:", audio.type, "size:", audio.size);
      console.log("Script length:", script.length);
      
      setError(null);
      
      // Start the process
      setState('uploading');
      setProgress(0);
      
      // 1. Upload photo and audio (0-25%)
      const uploadProgressStep = 25;
      setProgress(5);
      
      console.log("Step 1: Uploading photo");
      
      // Check if direct API is working or if we need to use a proxy
      try {
        const photoResponse = await uploadAsset(photo, photo.type);
        setProgress(15);
        console.log("Photo uploaded:", photoResponse);
        const imageKey = photoResponse.image_key;
        console.log("Image key:", imageKey);
        
        console.log("Step 1b: Uploading audio");
        const audioResponse = await uploadAsset(audio, audio.type);
        setProgress(25);
        console.log("Audio uploaded:", audioResponse);
        const audioAssetId = audioResponse.audio_asset_id;
        console.log("Audio asset ID:", audioAssetId);
        
        // 2. Create and train avatar (25-50%)
        console.log("Step 2: Creating avatar group");
        setState('training');
        
        const avatarGroupResponse = await createAvatarGroup(imageKey);
        setProgress(30);
        console.log("Avatar group created:", avatarGroupResponse);
        const groupId = avatarGroupResponse.group_id;
        console.log("Group ID:", groupId);
        
        console.log("Step 2b: Training avatar");
        await trainAvatarGroup(groupId);
        setProgress(35);
        console.log("Training started");
        
        // Poll training status until completed
        let trainingComplete = false;
        let talkingPhotoId = '';
        
        while (!trainingComplete) {
          const trainingStatus = await pollTraining(groupId);
          console.log("Training status:", trainingStatus);
          
          if (trainingStatus.status === 'completed') {
            trainingComplete = true;
            talkingPhotoId = trainingStatus.talking_photo_id;
            console.log("Training completed. Talking photo ID:", talkingPhotoId);
            setProgress(50);
          } else {
            console.log("Training in progress, status:", trainingStatus.status);
            // Update progress based on estimated completion
            setProgress(35 + Math.floor(Math.random() * 15)); // Random between 35-49
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
          }
        }
        
        // 3. Create voice (50-75%)
        console.log("Step 3: Creating voice");
        setState('voicing');
        setProgress(55);
        
        let voiceId = null;
        try {
          const voiceResponse = await createBrandVoice(audioAssetId);
          console.log("Voice created:", voiceResponse);
          voiceId = voiceResponse.voice_id;
          console.log("Voice ID:", voiceId);
          setProgress(75);
        } catch (error) {
          console.error("Error creating voice, will fall back to direct audio:", error);
          // We'll fall back to using audio_asset_id directly if voice creation fails
        }
        
        // 4. Generate video (75-99%)
        console.log("Step 4: Generating video");
        setState('rendering');
        setProgress(80);
        
        const videoResponse = await generateVideo(talkingPhotoId, voiceId, audioAssetId, script);
        console.log("Video generation started:", videoResponse);
        const videoId = videoResponse.video_id;
        console.log("Video ID:", videoId);
        
        // Poll video status until completed
        let videoComplete = false;
        
        while (!videoComplete) {
          const videoStatus = await pollVideo(videoId);
          console.log("Video status:", videoStatus);
          
          if (videoStatus.status === 'completed') {
            videoComplete = true;
            console.log("Video completed. URL:", videoStatus.video_url);
            setVideoUrl(videoStatus.video_url);
            setProgress(100);
            setState('done');
          } else {
            console.log("Video rendering in progress, status:", videoStatus.status);
            // Update progress based on estimated completion
            setProgress(80 + Math.floor(Math.random() * 19)); // Random between 80-98
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
          }
        }
      } catch (apiError) {
        console.error("Direct API request failed:", apiError);
        setError("CORS error or API connection issue. Please try again later or use our mobile app.");
        toast.error("API connection issue. Please try again later.");
        setState('idle');
      }
      
    } catch (error) {
      console.error("Error in video creation process:", error);
      setError(`${error}`);
      toast.error("Something went wrong. Please try again.");
      setState('idle');
    }
  };
  
  const resetApp = () => {
    setState('idle');
    setProgress(0);
    setVideoUrl('');
    setError(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-lg font-semibold text-indigo-600">AI Video Creator</h1>
        </div>
      </header>
      
      <main className="py-6">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <UploadScreen key="upload" onSubmit={handleSubmit} />
          )}
          
          {['uploading', 'training', 'voicing', 'rendering'].includes(state) && (
            <ProgressScreen 
              key="progress" 
              status={state as 'uploading' | 'training' | 'voicing' | 'rendering'} 
              progress={progress} 
            />
          )}
          
          {state === 'done' && videoUrl && (
            <ResultScreen 
              key="result"
              videoUrl={videoUrl} 
              onCreateAnother={resetApp}
            />
          )}
        </AnimatePresence>
        
        {error && (
          <div className="max-w-3xl mx-auto px-4 mt-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p>Error: {error}</p>
            </div>
          </div>
        )}
      </main>
      
      <footer className="py-6 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>© 2025 AI Video Creator. Powered by HeyGen AI.</p>
          <p className="mt-1 text-xs text-gray-400">Note: This app requires CORS-enabled APIs.</p>
        </div>
      </footer>
      
      <Toaster position="bottom-right" />
    </div>
  );
};

export default Index;
