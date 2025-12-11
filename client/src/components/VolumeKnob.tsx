import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VolumeKnobProps {
  value: number; // 0-100
  onChange: (value: number) => void;
  size?: number;
  className?: string;
}

export function VolumeKnob({ value, onChange, size = 200, className }: VolumeKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const knobRef = useRef<HTMLDivElement>(null);

  // Convert 0-100 value to rotation degrees (-135 to 135)
  const rotation = (value / 100) * 270 - 135;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
    document.body.style.cursor = 'grabbing';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaY = startY - e.clientY;
      const sensitivity = 0.5; // Adjust for speed
      const newValue = Math.min(100, Math.max(0, startValue + deltaY * sensitivity));
      
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startY, startValue, onChange]);

  return (
    <div 
      className={cn("knob-container select-none relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Tick Marks */}
      <div className="absolute inset-0 rounded-full">
        {Array.from({ length: 11 }).map((_, i) => {
          const deg = (i / 10) * 270 - 135;
          return (
            <div
              key={i}
              className="absolute w-1 h-3 bg-gray-400 origin-bottom"
              style={{
                left: '50%',
                top: '10px',
                transform: `translateX(-50%) rotate(${deg}deg) translateY(${size/2 - 20}px)`
              }}
            />
          );
        })}
      </div>

      {/* The Knob Dial */}
      <div
        ref={knobRef}
        data-testid="volume-knob"
        className="knob-dial flex items-center justify-center neu-convex !rounded-full"
        style={{ 
          width: size * 0.7, 
          height: size * 0.7,
          transform: `rotate(${rotation}deg)`
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Indicator Line */}
        <div className="absolute top-4 w-1.5 h-8 bg-accent rounded-full shadow-[0_0_10px_var(--color-accent)]" />
        
        {/* Center Cap */}
        <div className="w-1/3 h-1/3 rounded-full bg-neu-base shadow-inner" />
      </div>
      
      {/* Value Display */}
      <div className="absolute bottom-[-40px] font-rajdhani font-bold text-2xl text-foreground">
        {Math.round(value)}%
      </div>
    </div>
  );
}
