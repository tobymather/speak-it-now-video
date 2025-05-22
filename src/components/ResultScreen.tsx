import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface ResultScreenProps {
  videoUrl: string;
  onReset: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ videoUrl, onReset }) => {
  const handleDownload = async () => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download video:', err);
      alert('Failed to download video. Please try again.');
    }
  };
  
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My AI Video',
          text: 'Check out this AI-generated video I created!',
          url: videoUrl,
        });
      } else {
        // Fallback: Copy URL to clipboard
        await navigator.clipboard.writeText(videoUrl);
        alert('Video URL copied to clipboard!');
      }
    } catch (err) {
      console.error('Failed to share video:', err);
      alert('Failed to share video. Please try copying the URL manually.');
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="result-screen"
    >
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your AI Video is Ready!</h2>
        
        <div className="video-container mb-6">
          <video
            src={videoUrl}
            controls
            className="w-full rounded-lg shadow-lg"
            poster="/video-placeholder.jpg"
          />
        </div>
        
        <div className="flex flex-col space-y-4">
          <Button
            onClick={handleDownload}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Download Video
          </Button>
          
          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full"
          >
            Share Video
          </Button>
          
          <Button
            onClick={onReset}
            variant="ghost"
            className="w-full text-gray-600"
          >
            Create Another Video
          </Button>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>Your video will be available for 24 hours.</p>
          <p>Download it now to keep it permanently.</p>
        </div>
      </Card>
    </motion.div>
  );
};
