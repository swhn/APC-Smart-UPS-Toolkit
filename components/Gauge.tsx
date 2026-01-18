
import React from 'react';

interface GaugeProps {
  value: number; // 0 to 100
  label: string;
  colorStart: string;
  colorEnd: string;
  className?: string;
  isRight?: boolean;
}

const Gauge: React.FC<GaugeProps> = ({ value, label, colorStart, colorEnd, className, isRight = false }) => {
  const radius = 80;
  const stroke = 12;
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const circumference = normalizedValue / 100 * (Math.PI * radius); 
  
  // Define gradients
  const gradientId = `grad-${label.replace(/\s/g, '')}`;

  return (
    <div className={`relative flex flex-col items-center justify-center w-full h-full max-w-[200px] max-h-[200px] ${className}`}>
      <svg viewBox="0 0 200 200" className={`w-full h-full transform ${isRight ? '-scale-x-100' : ''}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
        </defs>
        
        {/* Background Track */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#333"
          strokeWidth={stroke}
          strokeDasharray={`${Math.PI * radius} ${Math.PI * radius}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          className="opacity-20"
          transform="rotate(90 100 100)"
        />

        {/* Value Arc */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeDasharray={`${Math.PI * radius} ${Math.PI * radius}`}
          strokeDashoffset={Math.PI * radius - circumference}
          strokeLinecap="round"
          transform="rotate(90 100 100)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Label Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl md:text-3xl font-mono font-bold text-white tracking-tighter">
          {Math.round(normalizedValue)}%
        </span>
        <span className="text-[10px] md:text-xs font-mono text-gray-400 uppercase tracking-widest mt-1">
          {label}
        </span>
      </div>
    </div>
  );
};

export default Gauge;
