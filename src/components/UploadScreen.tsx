import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useLocalization } from "@/contexts/LocalizationContext";
import { uploadAsset } from '../lib/heygen';
import type { UploadResult } from '../lib/heygen';

interface UploadScreenProps {
  onComplete: (data: {
    voiceId: string;
    childName: string;
    age: string;
    favouriteFood: string;
    favouriteSport: string;
  }) => void;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({ onComplete }) => {
  const { t } = useLocalization();
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('');
  const [favouriteFood, setFavouriteFood] = useState('');
  const [favouriteSport, setFavouriteSport] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Handle recording start
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        setSelectedAudio(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setStatus(t('upload.recording'));
    } catch (err) {
      setError(t('upload.errors.microphoneAccess'));
      console.error('Recording error:', err);
    }
  };

  // Handle recording stop
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus(t('upload.recordingSaved'));
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAudio) return;
    if (!childName.trim()) {
      setError(t('upload.errors.enterName'));
      return;
    }
    if (!age) {
      setError(t('upload.errors.selectAge'));
      return;
    }
    if (!favouriteFood) {
      setError(t('upload.errors.selectFood'));
      return;
    }
    if (!favouriteSport) {
      setError(t('upload.errors.selectSport'));
      return;
    }
    setIsProcessing(true);
    setError(null);
    setStatus(t('upload.processing'));
    try {
      const result = await uploadAsset(selectedAudio);
      if (!result.voice_id) {
        throw new Error('Failed to create voice');
      }
      onComplete({
        voiceId: result.voice_id,
        childName: childName.trim(),
        age,
        favouriteFood,
        favouriteSport,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload.errors.processingFailed'));
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('upload.title')}</h1>
        <p className="text-gray-600 mt-2">{t('upload.subtitle')}</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <div className="space-y-6">
            {/* Recording Section */}
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                {!isRecording ? (
                  <Button
                    type="button"
                    onClick={startRecording}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {t('upload.recordButton')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={stopRecording}
                    variant="destructive"
                    className="w-full"
                  >
                    {t('upload.stopButton')}
                  </Button>
                )}
                <p className="text-sm text-gray-500 text-center italic">
                  {t('upload.recordTooltip')}
                </p>
              </div>
            </div>

            {selectedAudio && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">{t('upload.selectedAudio')} {selectedAudio.name}</p>
                <audio src={URL.createObjectURL(selectedAudio)} controls className="w-full mt-2" />
              </div>
            )}
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('upload.childNameLabel')}</label>
              <input
                type="text"
                value={childName}
                onChange={e => setChildName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('upload.childNamePlaceholder')}
                disabled={isProcessing}
                required
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('upload.ageLabel')}</label>
              <select
                value={age}
                onChange={e => setAge(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isProcessing}
                required
              >
                <option value="">{t('upload.ageSelect')}</option>
                {Array.from({ length: 14 }, (_, i) => 2 + i).map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('upload.favouriteFoodLabel')}</label>
              <select
                value={favouriteFood}
                onChange={e => setFavouriteFood(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isProcessing}
                required
              >
                <option value="">{t('upload.favouriteFoodSelect')}</option>
                <option value="pizza">{t('foods.pizza')}</option>
                <option value="ice cream">{t('foods.ice cream')}</option>
                <option value="chocolate">{t('foods.chocolate')}</option>
                <option value="pasta">{t('foods.pasta')}</option>
                <option value="burgers">{t('foods.burgers')}</option>
                <option value="cookies">{t('foods.cookies')}</option>
                <option value="apples">{t('foods.apples')}</option>
                <option value="sandwiches">{t('foods.sandwiches')}</option>
                <option value="chicken">{t('foods.chicken')}</option>
              </select>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('upload.favouriteSportLabel')}</label>
              <select
                value={favouriteSport}
                onChange={e => setFavouriteSport(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isProcessing}
                required
              >
                <option value="">{t('upload.favouriteSportSelect')}</option>
                <option value="football">{t('sports.football')}</option>
                <option value="basketball">{t('sports.basketball')}</option>
                <option value="tennis">{t('sports.tennis')}</option>
                <option value="swimming">{t('sports.swimming')}</option>
                <option value="soccer">{t('sports.soccer')}</option>
                <option value="baseball">{t('sports.baseball')}</option>
                <option value="volleyball">{t('sports.volleyball')}</option>
                <option value="gymnastics">{t('sports.gymnastics')}</option>
                <option value="running">{t('sports.running')}</option>
              </select>
            </div>
          </div>
        </Card>
        
        {error && <div className="error text-red-600 mb-2">{error}</div>}
        {status && <div className="status text-blue-600 mb-2">{status}</div>}
        
        <Button
          type="submit"
          disabled={isProcessing || !selectedAudio || !childName.trim() || !age || !favouriteFood || !favouriteSport}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-300"
        >
          {isProcessing ? t('upload.processing') : t('upload.createButton')}
        </Button>
      </form>
    </motion.div>
  );
};

export default UploadScreen;
