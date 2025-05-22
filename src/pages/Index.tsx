import React, { useState } from "react";
import { UploadScreen } from "@/components/UploadScreen";
import { ProgressScreen } from "@/components/ProgressScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import posthog from "posthog-js";
import { AnimatePresence } from "framer-motion";

// Initialize PostHog but only if key exists and is not the placeholder
if (typeof window !== 'undefined' && 
    import.meta.env.VITE_POSTHOG_KEY && 
    import.meta.env.VITE_POSTHOG_KEY !== 'your_posthog_key_here') {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
  });
}

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

  const handleUploadComplete = (data: typeof videoData) => {
    setVideoData(data);
    setScreen('progress');
  };

  const handleVideoComplete = (url: string) => {
    setVideoUrl(url);
    setScreen('result');
  };

  const handleError = (error: string) => {
    setError(error);
    toast.error(error);
  };

  const handleReset = () => {
    setScreen('upload');
    setVideoData(null);
    setVideoUrl(null);
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
          {screen === 'upload' && (
            <UploadScreen key="upload" onComplete={handleUploadComplete} />
          )}
          
          {screen === 'progress' && videoData && (
            <ProgressScreen
              key="progress"
              {...videoData}
              onComplete={handleVideoComplete}
              onError={handleError}
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
