import React from 'react';

interface StereoMeterProps {
  left: number;  // 0.0 - 1.0
  right: number; // 0.0 - 1.0
}

export const StereoMeter: React.FC<StereoMeterProps> = ({ left, right }) => {
  // Convert linear 0-1 to dB for visualization if needed, or just map linearly
  // A simple linear mapping is often sufficient for basic visual feedback
  
  const getBarColor = (level: number) => {
    if (level > 0.9) return 'bg-red-500';
    if (level > 0.7) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  return (
    <div className="flex flex-col gap-1 w-full h-32 bg-gray-900 rounded-lg p-2 shadow-inner border border-gray-700">
      {/* Left Channel */}
      <div className="flex-1 bg-gray-800 rounded relative overflow-hidden">
        <div 
          className={`absolute bottom-0 left-0 w-full transition-all duration-75 ease-out ${getBarColor(left)}`}
          style={{ height: `${Math.min(100, left * 100)}%` }}
        />
      </div>
      
      {/* Right Channel */}
      <div className="flex-1 bg-gray-800 rounded relative overflow-hidden">
        <div 
          className={`absolute bottom-0 left-0 w-full transition-all duration-75 ease-out ${getBarColor(right)}`}
          style={{ height: `${Math.min(100, right * 100)}%` }}
        />
      </div>
    </div>
  );
};
