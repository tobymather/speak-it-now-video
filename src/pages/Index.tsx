
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

// Initialize PostHog
if (typeof window !== 'undefined' && import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
  });
}

type AppState = 'idle' | 'uploading' | 'training' | 'voicing' | 'rendering' | 'done';

const Index = () => {
  const [state, setState] = useState<AppState>('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>('');
  
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
      // Start the process
      setState('uploading');
      setProgress(0);
      
      // 1. Upload photo and audio (0-25%)
      const uploadProgressStep = 25;
      setProgress(5);
      
      const photoResponse = await uploadAsset(photo, photo.type);
      setProgress(15);
      console.log("Photo uploaded:", photoResponse);
      const imageKey = photoResponse.image_key;
      
      const audioResponse = await uploadAsset(audio, audio.type);
      setProgress(25);
      console.log("Audio uploaded:", audioResponse);
      const audioAssetId = audioResponse.audio_asset_id;
      
      // 2. Create and train avatar (25-50%)
      setState('training');
      
      const avatarGroupResponse = await createAvatarGroup(imageKey);
      setProgress(30);
      console.log("Avatar group created:", avatarGroupResponse);
      const groupId = avatarGroupResponse.group_id;
      
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
          setProgress(50);
        } else {
          // Update progress based on estimated completion
          setProgress(35 + Math.floor(Math.random() * 15)); // Random between 35-49
          await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
        }
      }
      
      // 3. Create voice (50-75%)
      setState('voicing');
      setProgress(55);
      
      let voiceId = null;
      try {
        const voiceResponse = await createBrandVoice(audioAssetId);
        console.log("Voice created:", voiceResponse);
        voiceId = voiceResponse.voice_id;
        setProgress(75);
      } catch (error) {
        console.error("Error creating voice, will fall back to direct audio:", error);
        // We'll fall back to using audio_asset_id directly if voice creation fails
      }
      
      // 4. Generate video (75-99%)
      setState('rendering');
      setProgress(80);
      
      const videoResponse = await generateVideo(talkingPhotoId, voiceId, audioAssetId, script);
      console.log("Video generation started:", videoResponse);
      const videoId = videoResponse.video_id;
      
      // Poll video status until completed
      let videoComplete = false;
      
      while (!videoComplete) {
        const videoStatus = await pollVideo(videoId);
        console.log("Video status:", videoStatus);
        
        if (videoStatus.status === 'completed') {
          videoComplete = true;
          setVideoUrl(videoStatus.video_url);
          setProgress(100);
          setState('done');
        } else {
          // Update progress based on estimated completion
          setProgress(80 + Math.floor(Math.random() * 19)); // Random between 80-98
          await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
        }
      }
      
    } catch (error) {
      console.error("Error in video creation process:", error);
      toast.error("Something went wrong. Please try again.");
      setState('idle');
    }
  };
  
  const resetApp = () => {
    setState('idle');
    setProgress(0);
    setVideoUrl('');
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
      </main>
      
      <footer className="py-6 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>© 2025 AI Video Creator. Powered by HeyGen AI.</p>
        </div>
      </footer>
      
      <Toaster position="bottom-right" />
    </div>
  );
};

export default Index;
