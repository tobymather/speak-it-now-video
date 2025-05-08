
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader, Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";
import posthog from "posthog-js";

interface UploadScreenProps {
  onSubmit: (photo: File, audio: Blob, script: string) => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onSubmit }) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [script, setScript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle photo upload
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
        toast.error("Please upload a JPG or PNG image");
        return;
      }
      
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Track photo upload event
      posthog.capture("Photo Uploaded");
    }
  };
  
  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mp3" });
        setAudio(audioBlob);
        
        // Track voice recording event
        posthog.capture("Voice Recorded");
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      
      // Timer for recording duration
      let duration = 0;
      timerRef.current = setInterval(() => {
        duration += 1;
        setRecordingDuration(duration);
      }, 1000);
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access the microphone. Please check your browser permissions.");
    }
  };
  
  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop all tracks in the stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);
  
  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!photo) {
      toast.error("Please upload a photo");
      return;
    }
    
    if (!audio) {
      toast.error("Please record at least 30 seconds of audio");
      return;
    }
    
    if (!script.trim()) {
      toast.error("Please enter a script for the video");
      return;
    }
    
    // Track submission event
    posthog.capture("Submitted for Generation");
    
    setIsSubmitting(true);
    onSubmit(photo, audio, script);
  };
  
  const isReadyToSubmit = photo && audio && script.trim() && recordingDuration >= 30 && !isSubmitting;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col max-w-lg mx-auto px-4 py-6 space-y-8"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Video</h1>
        <p className="text-gray-600">Upload a photo and record your voice to generate a talking video</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Upload Photo</label>
          <Card className="p-4 border-dashed border-2 border-indigo-300 hover:border-indigo-500 transition-colors flex flex-col items-center justify-center">
            {photoPreview ? (
              <div className="w-full mb-4">
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded-full mx-auto" 
                />
              </div>
            ) : (
              <div className="text-center text-gray-400 mb-4">
                <p>JPG or PNG file only</p>
              </div>
            )}
            <Input 
              id="photo" 
              type="file"
              accept="image/jpeg,image/jpg,image/png" 
              onChange={handlePhotoChange}
              className="w-full"
            />
          </Card>
        </div>
        
        {/* Audio Recording */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Record Audio (minimum 30 seconds)</label>
          <Card className={`p-6 border-2 ${isRecording ? 'border-red-500 bg-red-50' : 'border-indigo-300'} transition-colors`}>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center mb-4">
                {isRecording ? (
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-full animate-ping bg-red-400 opacity-75"></div>
                    <MicOff className="h-12 w-12 text-red-500 relative z-10" />
                  </div>
                ) : (
                  <Mic className="h-12 w-12 text-indigo-500" />
                )}
              </div>
              
              <div className="text-xl font-mono mb-4">
                {Math.floor(recordingDuration / 60)}:
                {(recordingDuration % 60).toString().padStart(2, '0')}
              </div>
              
              <Button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                className="w-full"
              >
                {isRecording ? "Stop Recording" : audio ? "Record Again" : "Start Recording"}
              </Button>
              
              {recordingDuration > 0 && !isRecording && (
                <p className="mt-2 text-sm text-gray-500">
                  {recordingDuration >= 30 
                    ? "✅ Recording complete" 
                    : "⚠️ Recording too short, please record at least 30 seconds"}
                </p>
              )}
            </div>
          </Card>
        </div>
        
        {/* Script Input */}
        <div className="space-y-2">
          <label htmlFor="script" className="block text-sm font-medium text-gray-700">
            Script (in English)
          </label>
          <Textarea
            id="script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Enter the text you want your avatar to say..."
            className="min-h-[100px]"
          />
        </div>
        
        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700"
          disabled={!isReadyToSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Video"
          )}
        </Button>
      </form>
    </motion.div>
  );
};

export default UploadScreen;
