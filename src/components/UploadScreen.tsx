import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadAsset, createAvatarGroup, trainAvatarGroup, generateSpeech } from '../lib/heygen';
import type { UploadResult } from '../lib/heygen';

interface UploadScreenProps {
  onComplete: (data: {
    avatarId: string;
    voiceId?: string;
    audioAssetId?: string;
    script: string;
  }) => void;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({ onComplete }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [script, setScript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [audioMode, setAudioMode] = useState<'record' | 'upload'>('record');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Handle image selection and upload
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setError(null);
    setStatus('');
  };
  
  // Handle audio file selection
  const handleAudioSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedAudio(file);
    setError(null);
    setStatus('');
  };
  
  // Handle audio recording
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
        // Do NOT upload/process audio here
      };
      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Recording...');
    } catch (err) {
      setError('Failed to start recording: ' + (err instanceof Error ? err.message : String(err)));
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('Processing recording...');
    }
  };
  
  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedImage || !script || (audioMode === 'upload' && !selectedAudio) || (audioMode === 'record' && !selectedAudio)) {
      setError('Please select an image, provide your voice, and enter a script');
      return;
    }
    setStatus('Uploading image...');
    setIsProcessing(true);
    setError(null);
    try {
      // 1. Upload image
      const imageResult = await uploadAsset(selectedImage);
      // Asset ID extraction for image
      const imageAssetId = imageResult.asset_id || imageResult.data?.asset_id;
      if (!imageAssetId) throw new Error('Image asset ID missing from upload response');
      setStatus('Uploading audio...');
      // 2. Upload audio (if provided)
      let voiceId: string | undefined = undefined;
      let audioAssetId: string | undefined = undefined;
      if (selectedAudio) {
        // Only upload/process audio and create voice here
        const audioResult = await uploadAsset(selectedAudio);
        audioAssetId = audioResult.asset_id || audioResult.data?.asset_id;
        voiceId = audioResult.voice_id;
      }
      setStatus('Creating avatar group...');
      // 3. Create avatar group
      const groupResult = await createAvatarGroup(imageAssetId);
      const groupId = groupResult.data.group_id;
      setStatus('Training avatar...');
      // 4. Train avatar group
      await trainAvatarGroup(groupId);
      setStatus('Ready!');
      // 5. Call onComplete with all IDs
      onComplete({
        avatarId: groupId,
        voiceId,
        audioAssetId,
        script,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process video');
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
        <h1 className="text-3xl font-bold text-gray-900">AI Video Creator</h1>
        <p className="text-gray-600 mt-2">Upload a photo, provide your voice, and get an AI-generated video</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <div className="space-y-6">
            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Your Photo</label>
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                {selectedImage ? (
                  <div className="text-center">
                    <img 
                      src={URL.createObjectURL(selectedImage)} 
                      alt="Preview" 
                      className="mx-auto h-40 w-auto object-cover mb-2 rounded"
                    />
                    <p className="text-sm text-gray-500">{selectedImage.name}</p>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedImage(null)}
                      className="mt-2"
                    >
                      Change Photo
                    </Button>
                  </div>
                ) : (
                  <div className="w-full text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="mx-auto"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Audio Section - with tabs for Recording vs Uploading */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provide Your Voice</label>
              <Tabs value={audioMode} onValueChange={(value) => {
                setAudioMode(value as 'record' | 'upload');
                setSelectedAudio(null);
              }}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="record">Record Voice</TabsTrigger>
                  <TabsTrigger value="upload">Upload Audio</TabsTrigger>
                </TabsList>
                
                <TabsContent value="record" className="border border-gray-300 rounded-lg p-6">
                  <div className="flex flex-col items-center justify-center">
                    {selectedAudio ? (
                      <div className="w-full text-center">
                        <audio src={URL.createObjectURL(selectedAudio)} controls className="w-full mb-2" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAudio(null)}
                        >
                          Record Again
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full text-center">
                        {isRecording ? (
                          <Button type="button" variant="destructive" onClick={stopRecording} className="mb-2">Stop Recording</Button>
                        ) : (
                          <Button type="button" onClick={startRecording} className="mb-2">Start Recording</Button>
                        )}
                        <p className="text-xs text-gray-500">Record your voice using your microphone.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="upload" className="border border-gray-300 rounded-lg p-6">
                  <div className="flex flex-col items-center justify-center">
                    {selectedAudio ? (
                      <div className="w-full text-center">
                        <audio src={URL.createObjectURL(selectedAudio)} controls className="w-full mb-2" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAudio(null)}
                        >
                          Change Audio File
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full text-center">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioSelect}
                          className="mx-auto"
                        />
                        <p className="text-xs text-gray-500 mt-2">Upload a pre-recorded audio file.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Script Input */}
            <div>
              <label htmlFor="script" className="block text-sm font-medium text-gray-700 mb-2">
                Script (English)
              </label>
              <textarea
                id="script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="Enter the text your AI avatar will say..."
                disabled={isProcessing}
              />
            </div>
          </div>
        </Card>
        
        {error && <div className="error text-red-600 mb-2">{error}</div>}
        {status && <div className="status text-blue-600 mb-2">{status}</div>}
        
        <Button
          type="submit"
          disabled={isProcessing || !selectedImage || !script || (audioMode === 'upload' && !selectedAudio) || (audioMode === 'record' && !selectedAudio)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-300"
        >
          {isProcessing ? 'Processing...' : 'Create AI Video'}
        </Button>
      </form>
    </motion.div>
  );
};

export default UploadScreen;
