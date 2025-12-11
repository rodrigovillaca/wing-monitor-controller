import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  min?: number;
  max?: number;
}

export const Knob: React.FC<KnobProps> = ({ 
  value, 
  onChange, 
  size = 100, 
  min = 0, 
  max = 100 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const startValue = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaY = startY.current - e.clientY;
      const sensitivity = 0.5; // Pixels per unit
      const deltaValue = deltaY * sensitivity;
      
      let newValue = startValue.current + deltaValue;
      newValue = Math.max(min, Math.min(max, newValue));
      
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, onChange]);

  // Calculate rotation
  // Map 0-100 to -135 to +135 degrees
  const percentage = (value - min) / (max - min);
  const rotation = -135 + (percentage * 270);

  return (
    <div 
      className="relative rounded-full bg-gray-800 shadow-xl border-4 border-gray-700 cursor-ns-resize flex items-center justify-center"
      style={{ width: size, height: size }}
      onMouseDown={handleMouseDown}
    >
      {/* Indicator Dot */}
      <div 
        className="absolute w-full h-full rounded-full pointer-events-none"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
      </div>
      
      {/* Inner Cap */}
      <div 
        className="w-3/4 h-3/4 rounded-full bg-gradient-to-b from-gray-700 to-gray-900 shadow-inner"
      />
    </div>
  );
};
