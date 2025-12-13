import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const knobRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert 0-100 value to rotation degrees (-135 to 135)
  const rotation = (value / 100) * 270 - 135;

  const displayValue = useMemo(() => {
    if (displayUnit === 'percent') {
      return `${Math.round(value)}%`;
    }
    if (value === 0) return '-∞ dB';
    let db;
    if (value >= 75) {
      db = ((value - 75) / 25) * 10;
    } else {
      db = (value / 75) * 90 - 90;
    }
    return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
  }, [value, displayUnit]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    // Pre-fill with current numeric value
    if (displayUnit === 'percent') {
      setInputValue(Math.round(value).toString());
    } else {
      if (value === 0) {
        setInputValue('-inf');
      } else if (value >= 75) {
        const db = ((value - 75) / 25) * 10;
        setInputValue(db.toFixed(1));
      } else {
        const db = (value / 75) * 90 - 90;
        setInputValue(db.toFixed(1));
      }
    }
    // Focus input on next render
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitValue = () => {
    setIsEditing(false);
    let newValue = value;
    const cleanInput = inputValue.trim().toLowerCase();

    if (cleanInput === '-inf' || cleanInput === '-infinity') {
      newValue = 0;
    } else if (cleanInput.endsWith('%')) {
      const num = parseFloat(cleanInput.replace('%', ''));
      if (!isNaN(num)) newValue = Math.max(0, Math.min(100, num));
    } else if (cleanInput.endsWith('db')) {
      const num = parseFloat(cleanInput.replace('db', ''));
      if (!isNaN(num)) {
        // Convert dB to 0-100
        if (num >= 0) {
          newValue = 75 + (num / 10) * 25;
        } else {
          newValue = ((num + 90) / 90) * 75;
        }
        newValue = Math.max(0, Math.min(100, newValue));
      }
    } else {
      // No unit, assume current displayUnit
      const num = parseFloat(cleanInput);
      if (!isNaN(num)) {
        if (displayUnit === 'percent') {
          newValue = Math.max(0, Math.min(100, num));
        } else {
          // Assume dB
          if (num >= 0) {
            newValue = 75 + (num / 10) * 25;
          } else {
            newValue = ((num + 90) / 90) * 75;
          }
          newValue = Math.max(0, Math.min(100, newValue));
        }
      }
    }
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitValue();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

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
        {Array.from({ length: 13 }).map((_, i) => {
          const deg = (i / 12) * 270 - 135;
          // Calculate if this tick is "active" (covered by the knob's current position)
          // The knob rotation goes from -135 to +135.
          // If current rotation >= tick rotation, it's active.
          // Add a small buffer for exact matches if needed, but >= should work.
          const isActive = rotation >= deg;
          
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-[2px] h-1/2 origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${deg}deg)`
              }}
            >
              {/* The tick line itself */}
              <div 
                className={cn(
                  "w-full h-[12%] mt-[18%] transition-all duration-200",
                  isActive 
                    ? "bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.8)]" 
                    : "bg-gray-600"
                )} 
              />
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
          <span style={{ transform: 'rotate(135deg)', marginTop: '2px' }}>-∞</span>
        </div>

        {/* 0 dB at 75% (67.5deg) */}
        <div 
          className="absolute left-1/2 top-1/2 h-1/2 w-0 origin-bottom flex flex-col items-center justify-start"
          style={{
            transform: 'translate(-50%, -100%) rotate(67.5deg)'
          }}
        >
          <span style={{ transform: 'rotate(-67.5deg)', marginTop: '2px' }}>0</span>
        </div>

        {/* +10 dB at 100% (135deg) */}
        <div 
          className="absolute left-1/2 top-1/2 h-1/2 w-0 origin-bottom flex flex-col items-center justify-start"
          style={{
            transform: 'translate(-50%, -100%) rotate(135deg)'
          }}
        >
          <span style={{ transform: 'rotate(-135deg)', marginTop: '2px' }}>+10</span>
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
                     inset 0 0 ${value * 0.5}px rgba(6, 182, 212, ${value * 0.008})`
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Indicator Line */}
        <div className="absolute top-[5%] w-[4px] h-[25%] bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)] z-20">
          <div className="w-full h-full bg-white/50 rounded-full blur-[1px]" />
        </div>
        
        {/* Center Cap */}
        <div className="w-1/3 h-1/3 rounded-full bg-neu-base shadow-inner" />
      </div>
      
      {/* Value Display */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commitValue}
          onKeyDown={handleKeyDown}
          className="absolute bottom-[-15%] w-[80px] text-center bg-black/50 text-accent font-rajdhani font-bold text-xl border border-accent/50 rounded outline-none z-50"
          autoFocus
        />
      ) : (
        <div 
          className="absolute bottom-[-15%] font-rajdhani font-bold text-xl text-accent tracking-wider cursor-text hover:text-cyan-300 transition-colors"
          onDoubleClick={handleDoubleClick}
          title="Double click to edit"
        >
          {displayValue}
        </div>
      )}
    </div>
  );
}
