import React from 'react';
import { cn } from '@/lib/utils';

interface NeuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  ledColor?: 'cyan' | 'amber' | 'red';
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

export function NeuButton({ 
  active = false, 
  ledColor = 'cyan', 
  label, 
  subLabel,
  icon,
  className,
  ...props 
}: NeuButtonProps) {
  return (
    <button
      className={cn(
        "neu-btn relative flex flex-col items-center justify-center p-4 min-w-[100px] min-h-[100px]",
        active && "active",
        className
      )}
      {...props}
    >
      {/* LED Indicator */}
      <div className={cn(
        "led-indicator absolute top-3 right-3",
        active && `on-${ledColor}`
      )} />
      
      {/* Icon */}
      {icon && <div className="mb-2 text-foreground/80">{icon}</div>}
      
      {/* Label */}
      <span className="font-rajdhani font-bold text-lg uppercase tracking-wider text-foreground">
        {label}
      </span>
      
      {/* Sub Label */}
      {subLabel && (
        <span className="font-rajdhani text-xs text-muted-foreground mt-1">
          {subLabel}
        </span>
      )}
    </button>
  );
}
