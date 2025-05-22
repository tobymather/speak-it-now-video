import React, { useState } from "react";
import { UploadScreen } from "@/components/UploadScreen";
import { ProgressScreen } from "@/components/ProgressScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import posthog from "posthog-js";

// Initialize PostHog but only if key exists and is not the placeholder
if (typeof window !== 'undefined' && 
    import.meta.env.VITE_POSTHOG_KEY && 
    import.meta.env.VITE_POSTHOG_KEY !== 'your_posthog_key_here') {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
  });
}

// Import the proxy functions
import { proxyUploadAsset, proxyHeyGenAPI } from "@/lib/heygenProxy";

const Index = () => {
  const [screen, setScreen] = useState<'upload' | 'progress' | 'result'>('upload');
  const [videoData, setVideoData] = useState<{
    avatarId: string;
    voiceId?: string;
    audioAssetId?: string;
    script: string;
  } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<'idle' | 'uploading' | 'training' | 'voicing' | 'rendering' | 'done'>('idle');

  const handleUploadComplete = async (data: typeof videoData) => {
    if (!data) return;
    
    setVideoData(data);
    setScreen('progress');
    setProgress(0);
    setState('uploading');
    
    try {
      // Track the start of video generation
      if (typeof window !== 'undefined' && posthog.isFeatureEnabled('video-generation')) {
        posthog.capture('video_generation_started', {
          hasVoiceId: !!data.voiceId,
          hasAudioAssetId: !!data.audioAssetId,
          scriptLength: data.script.length
        });
      }
      
      // 1. Create and train avatar (0-50%)
      setState('training');
      setProgress(5);
      
      const avatarGroupResponse = await proxyHeyGenAPI('/v2/photo_avatar/avatar_group/create', 'POST', {
        image_key: data.avatarId,
        name: `Avatar Group ${Date.now()}`,
      });
      setProgress(30);
      
      await proxyHeyGenAPI('/v2/photo_avatar/train', 'POST', {
        group_id: avatarGroupResponse.group_id,
      });
      setProgress(35);
      
      // Poll training status until completed
      let trainingComplete = false;
      let talkingPhotoId = '';
      
      while (!trainingComplete) {
        const trainingStatus = await proxyHeyGenAPI(`/v2/photo_avatar/train/status/${avatarGroupResponse.group_id}`, 'GET', null);
        
        if (trainingStatus.status === 'completed') {
          trainingComplete = true;
          talkingPhotoId = trainingStatus.talking_photo_id;
          setProgress(50);
        } else {
          setProgress(35 + Math.floor(Math.random() * 15));
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      // 2. Generate video (50-100%)
      setState('rendering');
      setProgress(55);
      
      // Prepare voice configuration
      const voiceConfig = data.voiceId ? {
        type: "text",
        voice_id: data.voiceId,
        input_text: data.script
      } : {
        type: "audio",
        audio_asset_id: data.audioAssetId
      };
      
      const payload = {
        video_inputs: [{
          character: {
            type: "talking_photo",
            talking_photo_id: talkingPhotoId
          },
          voice: voiceConfig,
        }],
      };
      
      const videoResponse = await proxyHeyGenAPI('/v2/video/generate', 'POST', payload);
      setProgress(80);
      
      // Poll video status until completed
      let videoComplete = false;
      
      while (!videoComplete) {
        const videoStatus = await proxyHeyGenAPI(`/v1/video_status.get?id=${videoResponse.video_id}`, 'GET', null);
        
        if (videoStatus.status === 'completed') {
          videoComplete = true;
          setVideoUrl(videoStatus.video_url);
          setProgress(100);
          setState('done');
          setScreen('result');
          
          // Track successful video generation
          if (typeof window !== 'undefined' && posthog.isFeatureEnabled('video-generation')) {
            posthog.capture('video_generation_completed', {
              videoId: videoResponse.video_id,
              duration: Date.now() - performance.now()
            });
          }
        } else {
          setProgress(80 + Math.floor(Math.random() * 19));
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
    } catch (error) {
      console.error("Error in video generation process:", error);
      setError(error instanceof Error ? error.message : String(error));
      toast.error("Something went wrong. Please try again.");
      setState('idle');
      
      // Track video generation error
      if (typeof window !== 'undefined' && posthog.isFeatureEnabled('video-generation')) {
        posthog.capture('video_generation_error', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };

  const handleReset = () => {
    setScreen('upload');
    setVideoData(null);
    setVideoUrl(null);
    setError(null);
    setProgress(0);
    setState('idle');
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
          {screen === 'upload' && (
            <UploadScreen key="upload" onComplete={handleUploadComplete} />
          )}
          
          {screen === 'progress' && videoData && (
            <ProgressScreen
              key="progress"
              {...videoData}
              progress={progress}
              state={state}
              onError={setError}
            />
          )}
          
          {screen === 'result' && videoUrl && (
            <ResultScreen
              key="result"
              videoUrl={videoUrl}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      </main>
      
      <Toaster />
    </div>
  );
};

export default Index;
