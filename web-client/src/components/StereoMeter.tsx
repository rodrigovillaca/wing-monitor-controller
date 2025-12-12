import React from 'react';

interface StereoMeterProps {
  left: number;  // 0.0 - 1.0
  right: number; // 0.0 - 1.0
}

export const StereoMeter: React.FC<StereoMeterProps> = ({ left, right }) => {
  // Helper to determine color based on level
  const getBarColor = (level: number) => {
    if (level > 0.9) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]';
    if (level > 0.7) return 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
    return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
  };

  return (
    <div className="w-full flex flex-col gap-3 bg-black/40 p-4 rounded-xl border border-gray-800 backdrop-blur-sm">
      {/* Left Channel */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-gray-500 w-4">L</span>
        <div className="flex-1 h-3 bg-gray-900 rounded-full overflow-hidden relative shadow-inner">
          {/* Background Grid/Ticks */}
          <div className="absolute inset-0 w-full h-full opacity-20" 
               style={{ backgroundImage: 'linear-gradient(90deg, transparent 95%, #555 95%)', backgroundSize: '10% 100%' }} 
          />
          
          {/* Meter Bar */}
          <div 
            className={`h-full rounded-full transition-all duration-75 ease-out ${getBarColor(left)}`}
            style={{ width: `${Math.min(100, left * 100)}%` }}
          />
        </div>
      </div>
      
      {/* Right Channel */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-gray-500 w-4">R</span>
        <div className="flex-1 h-3 bg-gray-900 rounded-full overflow-hidden relative shadow-inner">
          {/* Background Grid/Ticks */}
          <div className="absolute inset-0 w-full h-full opacity-20" 
               style={{ backgroundImage: 'linear-gradient(90deg, transparent 95%, #555 95%)', backgroundSize: '10% 100%' }} 
          />
          
          {/* Meter Bar */}
          <div 
            className={`h-full rounded-full transition-all duration-75 ease-out ${getBarColor(right)}`}
            style={{ width: `${Math.min(100, right * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
