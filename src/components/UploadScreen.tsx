
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import posthog from "posthog-js";

interface UploadScreenProps {
  onSubmit: (photo: File, audio: Blob, script: string) => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onSubmit }) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [script, setScript] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "image/jpeg" || file.type === "image/png") {
        setPhoto(file);
        // Disabled posthog for now
        // posthog.capture("Photo Uploaded", { fileType: file.type });
      } else {
        toast.error("Please upload a JPG or PNG image");
      }
    }
  };
  
  // Start recording audio
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        setIsRecording(false);
        // Disabled posthog for now
        // posthog.capture("Voice Recorded", { duration: recordingTime });
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please check your permissions.");
    }
  };
  
  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (photo && audioBlob && script.trim()) {
      onSubmit(photo, audioBlob, script);
      // Disabled posthog for now
      // posthog.capture("Generation Started", { scriptLength: script.length });
    } else {
      toast.error("Please upload a photo, record your voice, and provide a script");
    }
  };
  
  // Check if all required fields are filled
  const isFormValid = !!photo && !!audioBlob && !!script.trim() && recordingTime >= 15;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Video Creator</h1>
        <p className="text-gray-600 mt-2">Upload a photo, record your voice, and get an AI-generated video</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <div className="space-y-6">
            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Your Photo</label>
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                {photo ? (
                  <div className="text-center">
                    <img 
                      src={URL.createObjectURL(photo)} 
                      alt="Preview" 
                      className="mx-auto h-40 w-auto object-cover mb-2 rounded"
                    />
                    <p className="text-sm text-gray-500">{photo.name}</p>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPhoto(null)}
                      className="mt-2"
                    >
                      Change Photo
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Select Photo (JPG/PNG)
                    </label>
                    <p className="mt-2 text-xs text-gray-500">Select a clear photo of your face</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Voice Recording */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Record Your Voice (at least 15 seconds)</label>
              <div className="border border-gray-300 rounded-lg p-6">
                <div className="flex flex-col items-center justify-center">
                  {audioBlob ? (
                    <div className="w-full text-center">
                      <audio src={URL.createObjectURL(audioBlob)} controls className="w-full mb-2" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAudioBlob(null)}
                      >
                        Record Again
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="mb-2 text-2xl font-bold">
                        {isRecording ? `${recordingTime}s` : "Ready"}
                      </div>
                      <Button
                        type="button"
                        variant={isRecording ? "destructive" : "default"}
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`${isRecording ? "bg-red-600" : "bg-indigo-600"} text-white`}
                      >
                        {isRecording ? "Stop Recording" : "Start Recording"}
                      </Button>
                      {isRecording && recordingTime < 15 && (
                        <p className="mt-2 text-sm text-amber-500">
                          Please record for at least 15 seconds ({15 - recordingTime}s remaining)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
              />
            </div>
          </div>
        </Card>
        
        <Button
          type="submit"
          disabled={!isFormValid}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-300"
        >
          Create AI Video
        </Button>
      </form>
    </motion.div>
  );
};

export default UploadScreen;
