import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { generateSpeech } from '../lib/heygen';
import { VOICE_SCRIPTS } from '../lib/scripts';
import type { UploadResult } from '../lib/heygen';

interface ResultScreenProps {
  voiceId: string;
  childName: string;
  age: string;
  onReset: () => void;
}

interface AudioResult {
  scriptId: string;
  title: string;
  audioUrl: string;
  isLoading: boolean;
  error?: string;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ voiceId, childName, age, onReset }) => {
  const [results, setResults] = useState<AudioResult[]>(
    VOICE_SCRIPTS.map(script => ({
      scriptId: script.id,
      title: script.title,
      audioUrl: '',
      isLoading: true,
    }))
  );

  useEffect(() => {
    const generateAllAudio = async () => {
      const newResults = await Promise.all(
        VOICE_SCRIPTS.map(async (script) => {
          try {
            let scriptText = script.text.replace(/\{child_name\}/g, childName);
            scriptText = scriptText.replace(/\{age\}/g, age);
            const result = await generateSpeech(voiceId, scriptText);
            return {
              scriptId: script.id,
              title: script.title,
              audioUrl: result.data?.url || '',
              isLoading: false,
            };
          } catch (error) {
            return {
              scriptId: script.id,
              title: script.title,
              audioUrl: '',
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to generate audio',
            };
          }
        })
      );
      setResults(newResults);
    };

    generateAllAudio();
  }, [voiceId, childName, age]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your child's future English level:</h1>
        <p className="text-gray-600 mt-2">Here's the progress your child will make with Novakid</p>
      </div>

      <div className="space-y-6">
        {results.map((result) => (
          <Card key={result.scriptId} className="p-6">
            <h2 className="text-xl font-semibold mb-4">{result.title}</h2>
            {result.isLoading ? (
              <div className="text-center py-4">
                <p className="text-gray-600">Generating audio...</p>
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
              />
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Button
          onClick={onReset}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Create Another Voice
        </Button>
      </div>
    </motion.div>
  );
};

export default ResultScreen;
