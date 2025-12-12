import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VolumeKnobProps {
  value: number; // 0-100
  onChange: (value: number) => void;
  size?: number;
  className?: string;
  displayUnit?: 'percent' | 'db';
  unityLevel?: number;
}

export function VolumeKnob({ 
  value, 
  onChange, 
  size, 
  className,
  displayUnit = 'percent',
  unityLevel = 100 
}: VolumeKnobProps) {
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

  // Use style for size if provided, otherwise rely on className or default
  const containerStyle = size ? { width: size, height: size } : undefined;

  return (
    <div 
      className={cn("knob-container select-none relative flex items-center justify-center aspect-square", className)}
      style={containerStyle}
    >
      {/* Tick Marks */}
      <div className="absolute inset-0 rounded-full pointer-events-none">
        {Array.from({ length: 11 }).map((_, i) => {
          const deg = (i / 10) * 270 - 135;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-[2px] h-1/2 origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${deg}deg)`
              }}
            >
              {/* The tick line itself, positioned at the top (outer edge) of the radius */}
              <div className="w-full h-[12%] bg-gray-400 mt-[15%]" />
            </div>
          );
        })}
      </div>

      {/* Static dB Labels */}
      <div className="absolute inset-0 pointer-events-none font-rajdhani text-xs text-muted-foreground font-medium">
        {/* -∞ dB at 0% (-135deg) */}
        <div 
          className="absolute left-1/2 top-1/2 h-1/2 w-0 origin-bottom flex flex-col items-center justify-start"
          style={{
            transform: 'translate(-50%, -100%) rotate(-135deg)'
          }}
        >
          <span style={{ transform: 'rotate(135deg)', marginTop: '-10px' }}>-∞</span>
        </div>

        {/* 0 dB at 75% (67.5deg) */}
        <div 
          className="absolute left-1/2 top-1/2 h-1/2 w-0 origin-bottom flex flex-col items-center justify-start"
          style={{
            transform: 'translate(-50%, -100%) rotate(67.5deg)'
          }}
        >
          <span style={{ transform: 'rotate(-67.5deg)', marginTop: '-10px' }}>0</span>
        </div>

        {/* +10 dB at 100% (135deg) */}
        <div 
          className="absolute left-1/2 top-1/2 h-1/2 w-0 origin-bottom flex flex-col items-center justify-start"
          style={{
            transform: 'translate(-50%, -100%) rotate(135deg)'
          }}
        >
          <span style={{ transform: 'rotate(-135deg)', marginTop: '-10px' }}>+10</span>
        </div>
      </div>

      {/* The Knob Dial */}
      <div
        ref={knobRef}
        data-testid="volume-knob"
        className="knob-dial flex items-center justify-center neu-convex !rounded-full cursor-pointer active:cursor-grabbing"
        style={{ 
          width: '70%', 
          height: '70%',
          transform: `rotate(${rotation}deg)`,
          boxShadow: `5px 5px 10px var(--neu-shadow-dark), 
                     -5px -5px 10px var(--neu-shadow-light), 
                     0 0 ${value * 0.8}px rgba(255, 255, 255, ${value * 0.006})`
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Indicator Line */}
        <div className="absolute top-[10%] w-[2%] h-[15%] bg-accent rounded-full shadow-[0_0_10px_var(--color-accent)]" />
        
        {/* Center Cap */}
        <div className="w-1/3 h-1/3 rounded-full bg-neu-base shadow-inner" />
      </div>
      
      {/* Value Display */}
      <div className="absolute bottom-[-15%] font-rajdhani font-bold text-2xl text-foreground">
        {displayUnit === 'percent' ? (
          `${Math.round(value)}%`
        ) : (
          (() => {
            if (value === 0) return '-∞ dB';
            // Piecewise mapping:
            // 75-100% -> 0 to +10 dB
            // 0-75%   -> -90 to 0 dB
            let db;
            if (value >= 75) {
              db = ((value - 75) / 25) * 10;
            } else {
              db = (value / 75) * 90 - 90;
            }
            return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
          })()
        )}
      </div>
    </div>
  );
}
