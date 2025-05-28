import React, { useState } from "react";
import { UploadScreen } from "@/components/UploadScreen";
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

const Index = () => {
  const [screen, setScreen] = useState<'upload' | 'result'>('upload');
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  const [favouriteFood, setFavouriteFood] = useState<string | null>(null);
  const [favouriteSport, setFavouriteSport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = async (data: { voiceId: string, childName: string, age: string, favouriteFood: string, favouriteSport: string }) => {
    setVoiceId(data.voiceId);
    setChildName(data.childName);
    setAge(data.age);
    setFavouriteFood(data.favouriteFood);
    setFavouriteSport(data.favouriteSport);
    setScreen('result');
  };

  const handleReset = () => {
    setScreen('upload');
    setVoiceId(null);
    setChildName(null);
    setAge(null);
    setFavouriteFood(null);
    setFavouriteSport(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/novakid-logo.png" 
              alt="Novakid" 
              className="h-8 w-auto"
            />
            <span className="text-lg font-semibold text-gray-700">English Level AI Preview</span>
          </div>
        </div>
      </header>
      
      <main className="py-6">
        <AnimatePresence mode="wait">
          {screen === 'upload' && (
            <UploadScreen
              key="upload"
              onComplete={handleUploadComplete}
            />
          )}
          
          {screen === 'result' && voiceId && childName && age && favouriteFood && favouriteSport && (
            <ResultScreen
              key="result"
              voiceId={voiceId}
              childName={childName}
              age={age}
              favouriteFood={favouriteFood}
              favouriteSport={favouriteSport}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      </main>
      
      <Toaster />
      
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default Index;
