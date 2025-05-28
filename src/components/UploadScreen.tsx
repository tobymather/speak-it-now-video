import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [audioMode, setAudioMode] = useState<'record' | 'upload'>('record');
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('');
  const [favouriteFood, setFavouriteFood] = useState('');
  const [favouriteSport, setFavouriteSport] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Handle audio file selection
  const handleAudioSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedAudio(file);
    setError(null);
    setStatus('');
  };

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
      setStatus('Recording...');
    } catch (err) {
      setError('Failed to access microphone');
      console.error('Recording error:', err);
    }
  };

  // Handle recording stop
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('Recording saved');
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAudio) return;
    if (!childName.trim()) {
      setError('Please enter the child\'s name.');
      return;
    }
    if (!age) {
      setError('Please select the child\'s age.');
      return;
    }
    if (!favouriteFood) {
      setError('Please select the child\'s favourite food.');
      return;
    }
    if (!favouriteSport) {
      setError('Please select the child\'s favourite sport.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setStatus('Processing voice sample...');
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
      setError(err instanceof Error ? err.message : 'Failed to process voice');
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
        <h1 className="text-3xl font-bold text-gray-900">English Level AI Preview</h1>
        <p className="text-gray-600 mt-2">Upload or record a voice sample to create your AI preview</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <div className="space-y-6">
            <Tabs defaultValue="record" value={audioMode} onValueChange={(v) => setAudioMode(v as 'record' | 'upload')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="record">Record Voice</TabsTrigger>
                <TabsTrigger value="upload">Upload Audio</TabsTrigger>
              </TabsList>
              
              <TabsContent value="record">
                <div className="flex flex-col items-center space-y-4">
                  {!isRecording ? (
                    <Button
                      type="button"
                      onClick={startRecording}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={stopRecording}
                      variant="destructive"
                      className="w-full"
                    >
                      Stop Recording
                    </Button>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="upload">
                <div className="flex flex-col items-center space-y-4">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioSelect}
                    className="w-full"
                    disabled={isProcessing}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {selectedAudio && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Selected audio: {selectedAudio.name}</p>
                <audio src={URL.createObjectURL(selectedAudio)} controls className="w-full mt-2" />
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Child's Name (in English letters)</label>
              <input
                type="text"
                value={childName}
                onChange={e => setChildName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter child's name"
                disabled={isProcessing}
                required
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <select
                value={age}
                onChange={e => setAge(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isProcessing}
                required
              >
                <option value="">Select age</option>
                {Array.from({ length: 14 }, (_, i) => 2 + i).map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Favourite Food</label>
              <select
                value={favouriteFood}
                onChange={e => setFavouriteFood(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isProcessing}
                required
              >
                <option value="">Select favourite food</option>
                <option value="pizza">Pizza</option>
                <option value="ice cream">Ice Cream</option>
                <option value="chocolate">Chocolate</option>
                <option value="pasta">Pasta</option>
                <option value="burgers">Burgers</option>
                <option value="cookies">Cookies</option>
                <option value="apples">Apples</option>
                <option value="sandwiches">Sandwiches</option>
                <option value="chicken">Chicken</option>
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Favourite Sport</label>
              <select
                value={favouriteSport}
                onChange={e => setFavouriteSport(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isProcessing}
                required
              >
                <option value="">Select favourite sport</option>
                <option value="football">Football</option>
                <option value="basketball">Basketball</option>
                <option value="tennis">Tennis</option>
                <option value="swimming">Swimming</option>
                <option value="soccer">Soccer</option>
                <option value="baseball">Baseball</option>
                <option value="volleyball">Volleyball</option>
                <option value="gymnastics">Gymnastics</option>
                <option value="running">Running</option>
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
          {isProcessing ? 'Processing...' : 'Create AI Voice'}
        </Button>
      </form>
    </motion.div>
  );
};

export default UploadScreen;
