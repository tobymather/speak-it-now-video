
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Share, Download } from "lucide-react";
import { motion } from "framer-motion";
import posthog from "posthog-js";

interface ResultScreenProps {
  videoUrl: string;
  onCreateAnother: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ videoUrl, onCreateAnother }) => {
  // Track viewing the result
  useEffect(() => {
    posthog.capture("Viewed Result");
  }, []);
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My AI Video",
          text: "Check out this AI video I created!",
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };
  
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = "my-ai-video.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Video is Ready!</h1>
        <p className="text-gray-600 mt-2">Watch, share, or download your AI-generated video</p>
      </div>
      
      <Card className="overflow-hidden mb-6">
        <div className="aspect-video">
          <video
            className="w-full h-full"
            src={videoUrl}
            controls
            autoPlay
            poster="/placeholder.svg"
          />
        </div>
      </Card>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={handleShare}
          className="flex-1 gap-2"
          variant="outline"
        >
          <Share className="h-4 w-4" />
          Share
        </Button>
        
        <Button 
          onClick={handleDownload}
          className="flex-1 gap-2"
          variant="outline"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
        
        <Button
          onClick={onCreateAnother}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Create Another
        </Button>
      </div>
    </motion.div>
  );
};

export default ResultScreen;
