
import React, { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface ProgressScreenProps {
  status: 'uploading' | 'training' | 'voicing' | 'rendering';
  progress: number;
}

const ProgressScreen: React.FC<ProgressScreenProps> = ({ status, progress }) => {
  const [progressAnimation, setProgressAnimation] = useState(0);
  
  useEffect(() => {
    // Animate progress bar smoothly
    const timer = setTimeout(() => {
      setProgressAnimation(progress);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [progress]);
  
  const getStatusDescription = () => {
    switch (status) {
      case 'uploading':
        return "Uploading your photo and audio...";
      case 'training':
        return "Training your avatar with AI...";
      case 'voicing':
        return "Processing your voice sample...";
      case 'rendering':
        return "Rendering your final video...";
      default:
        return "Processing...";
    }
  };
  
  const steps = [
    { id: 'uploading', label: 'Uploading' },
    { id: 'training', label: 'Training' },
    { id: 'voicing', label: 'Voicing' },
    { id: 'rendering', label: 'Rendering' },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-lg mx-auto px-4 py-12 flex flex-col items-center"
    >
      <h1 className="text-2xl font-bold mb-8 text-center">Creating Your Video</h1>
      
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="mb-6">
            <Progress value={progressAnimation} className="h-2" />
          </div>
          
          <div className="grid grid-cols-4 gap-1 mb-6">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={`flex flex-col items-center ${status === step.id ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}
              >
                <div 
                  className={`h-3 w-3 rounded-full mb-2 ${
                    steps.findIndex(s => s.id === status) >= steps.findIndex(s => s.id === step.id)
                      ? 'bg-indigo-600'
                      : 'bg-gray-200'
                  }`}
                />
                <span className="text-xs">{step.label}</span>
              </div>
            ))}
          </div>
          
          <p className="text-center text-gray-700">{getStatusDescription()}</p>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>This may take a few minutes. Please don't close this window.</p>
      </div>
    </motion.div>
  );
};

export default ProgressScreen;
