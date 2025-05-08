
import React from "react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

interface ProgressScreenProps {
  status: 'uploading' | 'training' | 'voicing' | 'rendering';
  progress: number;
}

const ProgressScreen: React.FC<ProgressScreenProps> = ({ status, progress }) => {
  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading your photo and voice...';
      case 'training':
        return 'Training your avatar...';
      case 'voicing':
        return 'Creating your AI voice...';
      case 'rendering':
        return 'Generating your video...';
      default:
        return 'Processing...';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-4 py-16 text-center"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {getStatusText()}
      </h2>
      <p className="text-gray-600 mb-8">
        This may take a few minutes. Please don't close this window.
      </p>
      
      <div className="mb-2">
        <Progress value={progress} className="h-2" />
      </div>
      <p className="text-sm text-gray-500">{progress}% complete</p>
      
      <div className="mt-12 flex justify-center space-x-16">
        <StatusStep
          label="Upload"
          isActive={status === 'uploading'}
          isComplete={['training', 'voicing', 'rendering'].includes(status)}
        />
        <StatusStep
          label="Train"
          isActive={status === 'training'}
          isComplete={['voicing', 'rendering'].includes(status)}
        />
        <StatusStep
          label="Voice"
          isActive={status === 'voicing'}
          isComplete={['rendering'].includes(status)}
        />
        <StatusStep
          label="Render"
          isActive={status === 'rendering'}
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

export default ProgressScreen;
