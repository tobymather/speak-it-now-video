import React, { useState, useEffect } from "react";
import { UploadScreen } from "@/components/UploadScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { useLocalization } from "@/contexts/LocalizationContext";
import { analytics } from "@/lib/analytics";

const Index = () => {
  const { language, setLanguage, t } = useLocalization();
  const [screen, setScreen] = useState<'upload' | 'result'>('upload');
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  const [favouriteFood, setFavouriteFood] = useState<string | null>(null);
  const [favouriteSport, setFavouriteSport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track page view on component mount
  useEffect(() => {
    analytics.pageView('home', language);
  }, [language]);

  const handleLanguageChange = (newLanguage: 'en' | 'ro') => {
    setLanguage(newLanguage);
    analytics.pageView('home', newLanguage);
  };

  const handleUploadComplete = async (data: { voiceId: string, childName: string, age: string, favouriteFood: string, favouriteSport: string }) => {
    setVoiceId(data.voiceId);
    setChildName(data.childName);
    setAge(data.age);
    setFavouriteFood(data.favouriteFood);
    setFavouriteSport(data.favouriteSport);
    setScreen('result');
    
    // Track navigation to result screen
    analytics.pageView('result', language);
  };

  const handleReset = () => {
    setScreen('upload');
    setVoiceId(null);
    setChildName(null);
    setAge(null);
    setFavouriteFood(null);
    setFavouriteSport(null);
    setError(null);
    
    // Track navigation back to upload screen
    analytics.pageView('upload', language);
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
            <span className="text-lg font-semibold text-gray-700">{t('nav.title')}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {language === 'en' ? '🇺🇸 EN' : '🇷🇴 RO'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleLanguageChange('ro')}
                className={language === 'ro' ? 'bg-gray-100' : ''}
              >
                🇷🇴 Română
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleLanguageChange('en')}
                className={language === 'en' ? 'bg-gray-100' : ''}
              >
                🇺🇸 English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
