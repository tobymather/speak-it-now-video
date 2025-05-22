import React, { useEffect, useState } from 'react';
import { generateVideo, checkVideoStatus } from '../lib/heygen';
import type { VideoResult } from '../lib/heygen';
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

interface ProgressScreenProps {
  avatarId: string;
  script: string;
  voiceId?: string;
  audioAssetId?: string;
  progress: number;
  state: 'idle' | 'uploading' | 'training' | 'voicing' | 'rendering' | 'done';
  onError: (error: string) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  avatarId,
  script,
  voiceId,
  audioAssetId,
  progress,
  state,
  onError,
}) => {
  const [status, setStatus] = useState<string>('Initializing...');
  const [videoId, setVideoId] = useState<string | null>(null);
  
  // Update status based on state
  useEffect(() => {
    switch (state) {
      case 'uploading':
        setStatus('Uploading assets...');
        break;
      case 'training':
        setStatus('Training avatar...');
        break;
      case 'voicing':
        setStatus('Processing voice...');
        break;
      case 'rendering':
        setStatus('Generating video...');
        break;
      case 'done':
        setStatus('Video ready!');
        break;
      default:
        setStatus('Initializing...');
    }
  }, [state]);

  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout;
    
    const startVideoGeneration = async () => {
      try {
        setStatus('Generating video...');
        
        // Generate video
        const result = await generateVideo(avatarId, script, voiceId, audioAssetId);
        if (!isMounted) return;
        
        if (result.data.status === 'failed') {
          throw new Error(result.data.error_msg || 'Video generation failed');
        }
        
        setVideoId(result.data.video_id);
        setStatus('Processing video...');
        
        // Start polling for video status
        pollInterval = setInterval(async () => {
          try {
            const statusResult = await checkVideoStatus(result.data.video_id);
            if (!isMounted) return;
            
            if (statusResult.data.status === 'completed' && statusResult.data.video_url) {
              clearInterval(pollInterval);
              setStatus('Video ready!');
            } else if (statusResult.data.status === 'failed') {
              throw new Error(statusResult.data.error_msg || 'Video processing failed');
            }
          } catch (err) {
            if (isMounted) {
              clearInterval(pollInterval);
              onError(err instanceof Error ? err.message : 'Failed to check video status');
            }
          }
        }, 5000); // Poll every 5 seconds
      } catch (err) {
        if (isMounted) {
          onError(err instanceof Error ? err.message : 'Failed to generate video');
        }
      }
    };
    
    startVideoGeneration();
    
    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [avatarId, script, voiceId, audioAssetId, onError]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-4 py-16 text-center"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {status}
      </h2>
      <p className="text-gray-600 mb-8">
        This may take a few minutes. Please don't close this window.
      </p>
      
      <div className="mb-2">
        <Progress value={progress} className="h-2" />
      </div>
      <p className="text-sm text-gray-500">{progress}% complete</p>
      
      <div className="status-message">
        {status === 'Initializing...' && (
          <p>Preparing to generate your video...</p>
        )}
        {status === 'Generating video...' && (
          <p>Creating your video with the provided script and avatar...</p>
        )}
        {status === 'Processing video...' && (
          <p>Processing and optimizing your video...</p>
        )}
        {status === 'Video ready!' && (
          <p>Your video is ready to view!</p>
        )}
      </div>
      
      <div className="mt-12 flex justify-center space-x-16">
        <StatusStep
          label="Upload"
          isActive={status === 'Initializing...'}
          isComplete={['Processing video...', 'Video ready!'].includes(status)}
        />
        <StatusStep
          label="Train"
          isActive={status === 'Processing video...'}
          isComplete={['Video ready!'].includes(status)}
        />
        <StatusStep
          label="Voice"
          isActive={status === 'Processing video...'}
          isComplete={['Video ready!'].includes(status)}
        />
        <StatusStep
          label="Render"
          isActive={status === 'Video ready!'}
          isComplete={false}
        />
      </div>
    </motion.div>
  );
};

interface StatusStepProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

const StatusStep: React.FC<StatusStepProps> = ({ label, isActive, isComplete }) => {
  let bgColor = "bg-gray-200";
  
  if (isActive) {
    bgColor = "bg-indigo-600";
  } else if (isComplete) {
    bgColor = "bg-green-500";
  }
  
  return (
    <div className="flex flex-col items-center">
      <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white font-medium mb-2`}>
        {isComplete ? "✓" : ""}
      </div>
      <span className={`text-sm ${isActive ? "text-indigo-600 font-medium" : "text-gray-500"}`}>
        {label}
      </span>
    </div>
  );
};
