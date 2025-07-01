import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useLocalization } from '@/contexts/LocalizationContext';
import { analytics } from '@/lib/analytics';
import { generateSpeech } from '../lib/elevenlabs';
import { VOICE_SCRIPTS } from '../lib/scripts';
import strings from '../lib/strings.json';
import type { UploadResult } from '../lib/elevenlabs';

interface ResultScreenProps {
  voiceId: string;
  childName: string;
  age: string;
  favouriteFood: string;
  favouriteSport: string;
  onReset: () => void;
}

interface AudioResult {
  scriptId: string;
  title: string;
  audioUrl: string;
  isLoading: boolean;
  error?: string;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ voiceId, childName, age, favouriteFood, favouriteSport, onReset }) => {
  const { t, language } = useLocalization();
  const [results, setResults] = useState<AudioResult[]>(
    VOICE_SCRIPTS.map(script => ({
      scriptId: script.id,
      title: '', // Will be set after component mounts
      audioUrl: '',
      isLoading: true,
    }))
  );

  // Handle audio play events
  const handleAudioPlay = (audioType: 'original' | 'generated') => {
    analytics.listenRecording(audioType, language);
  };

  // Handle trial link click
  const handleTrialLinkClick = () => {
    analytics.clickTrialLink(language, 'cta_button');
  };

  // Update titles when language changes
  useEffect(() => {
    setResults(prevResults => 
      prevResults.map(result => ({
        ...result,
        title: t('result.scriptTitle')
      }))
    );
  }, [t]);

  useEffect(() => {
    const generateAllAudio = async () => {
      const newResults = await Promise.all(
        VOICE_SCRIPTS.map(async (script) => {
          try {
            let scriptText = script.text.replace(/\{child_name\}/g, childName);
            scriptText = scriptText.replace(/\{age\}/g, age);
            
            // Always use English values for food and sport in the script sent to ElevenLabs
            const englishFoodValue = strings.en.foods[favouriteFood as keyof typeof strings.en.foods] || favouriteFood;
            const englishSportValue = strings.en.sports[favouriteSport as keyof typeof strings.en.sports] || favouriteSport;
            
            scriptText = scriptText.replace(/\{favourite_food\}/g, englishFoodValue);
            scriptText = scriptText.replace(/\{favourite_sport\}/g, englishSportValue);
            
            const result = await generateSpeech(voiceId, scriptText);
            return {
              scriptId: script.id,
              title: t('result.scriptTitle'),
              audioUrl: result.data?.url || '',
              isLoading: false,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate audio';
            analytics.error('audio_generation', errorMessage, { 
              language, 
              scriptId: script.id,
              favouriteFood,
              favouriteSport 
            });
            return {
              scriptId: script.id,
              title: t('result.scriptTitle'),
              audioUrl: '',
              isLoading: false,
              error: errorMessage,
            };
          }
        })
      );
      setResults(newResults);
    };

    generateAllAudio();
  }, [voiceId, childName, age, favouriteFood, favouriteSport]); // Remove 't' from dependencies

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('result.title')}</h1>
        <p className="text-gray-600 mt-2">{t('result.subtitle')}</p>
      </div>

      <div className="space-y-6">
        {results.map((result) => (
          <Card key={result.scriptId} className="p-6">
            <h2 className="text-xl font-semibold mb-4">{result.title}</h2>
            {result.isLoading ? (
              <div className="text-center py-4">
                <p className="text-gray-600">{t('result.generating')}</p>
              </div>
            ) : result.error ? (
              <div className="text-center py-4">
                <p className="text-red-600">{result.error}</p>
              </div>
            ) : (
              <audio
                src={result.audioUrl}
                controls
                className="w-full"
                controlsList="nodownload"
                onPlay={() => handleAudioPlay('generated')}
              />
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center space-y-4">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('result.ctaTitle')}
          </h3>

          <Button
            asChild
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg font-semibold"
          >
            <a
              href="https://school.novakidschool.com/parent/billing/buy-subscription?utm_source=ai_preview&utm_medium=web_app&utm_campaign=english_level_demo&utm_content=buy_subscription"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTrialLinkClick}
            >
              {t('result.ctaButton')}
            </a>
          </Button>
        </div>
        
        <Button
          onClick={onReset}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {t('result.resetButton')}
        </Button>
      </div>
    </motion.div>
  );
};

export default ResultScreen;
