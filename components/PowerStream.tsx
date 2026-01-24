
import React from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '../constants';
import { SystemNode } from '../types';

interface PowerStreamProps {
  status: 'ONLINE' | 'ON_BATTERY' | 'CALIBRATING' | 'OVERLOAD' | 'LOW_BATTERY' | 'UNKNOWN';
  batteryLevel: number;
  onSelectNode: (node: SystemNode) => void;
}

// --- SVG Icons (Local Components) ---

const SvgIconGrid = ({ color }: { color: string }) => (
  <g stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
    {/* Power Plant / Pylon Symbol */}
    <path d="M12 2L4 22h16L12 2z" strokeWidth="2" />
    <path d="M4 12h16" />
    <path d="M12 2v20" />
    <path d="M8 17l4-5 4 5" />
    {/* Glow Halo */}
    <circle cx="12" cy="12" r="14" stroke={color} strokeWidth="0.5" opacity="0.3" strokeDasharray="2 2" />
  </g>
);

const SvgIconUPS = ({ color, isOverload }: { color: string, isOverload: boolean }) => (
  <g>
     {/* Main Chassis */}
     <rect x="5" y="2" width="14" height="20" rx="1" fill="#1a1a1a" stroke={color} strokeWidth="1.5" />
     
     {/* LCD Screen Area */}
     <rect x="7" y="4" width="10" height="6" rx="0.5" fill="#000" stroke={color} strokeWidth="0.5" />
     <path d="M8 7h8" stroke={color} strokeWidth="1" opacity="0.6" />
     
     {/* Status LEDs */}
     <circle cx="9" cy="12" r="0.5" fill={color} />
     <circle cx="12" cy="12" r="0.5" fill={color} opacity="0.5" />
     <circle cx="15" cy="12" r="0.5" fill={color} opacity="0.5" />

     {/* Ventilation Grilles */}
     <line x1="7" y1="15" x2="17" y2="15" stroke={color} strokeWidth="1" opacity="0.7" />
     <line x1="7" y1="17" x2="17" y2="17" stroke={color} strokeWidth="1" opacity="0.7" />
     <line x1="7" y1="19" x2="17" y2="19" stroke={color} strokeWidth="1" opacity="0.7" />
     
     {isOverload && (
         <rect x="3" y="0" width="18" height="24" rx="2" stroke="red" strokeWidth="2" fill="none" opacity="0.5">
            <animate attributeName="opacity" values="0.8;0;0.8" dur="0.5s" repeatCount="indefinite" />
         </rect>
     )}
  </g>
);

const SvgIconLoad = ({ color }: { color: string }) => (
  <g stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
    {/* Server Rack Symbol */}
    <rect x="3" y="2" width="18" height="7" rx="1" fill="#1a1a1a" />
    <rect x="3" y="10" width="18" height="7" rx="1" fill="#1a1a1a" />
    <rect x="3" y="18" width="18" height="5" rx="1" fill="#1a1a1a" />
    
    {/* Blinkers */}
    <circle cx="18" cy="5.5" r="1" fill={color} />
    <circle cx="18" cy="13.5" r="1" fill={color} />
    <line x1="5" y1="5.5" x2="12" y2="5.5" strokeWidth="1" opacity="0.5" />
    <line x1="5" y1="13.5" x2="12" y2="13.5" strokeWidth="1" opacity="0.5" />
  </g>
);

const SvgIconBattery = ({ color, level }: { color: string, level: number }) => {
    // Drawing a battery cell 24x40 roughly
    const maxFillHeight = 34; // height of the inner area
    const currentFill = (Math.max(0, Math.min(100, level)) / 100) * maxFillHeight;
    const yFillStart = 38 - currentFill; // Bottom y=38

    return (
        <g>
            {/* Battery Terminal */}
            <path d="M10 0 h4 v2 h-4 z" fill={color} opacity="0.8" />
            
            {/* Battery Body Outline */}
            <rect x="2" y="2" width="20" height="38" rx="2" stroke={color} strokeWidth="2" fill="none" />
            
            {/* Fill Level */}
            <rect 
                x="5" 
                y={yFillStart} 
                width="14" 
                height={currentFill} 
                fill={color} 
                opacity="0.6"
                className="transition-all duration-500 ease-out"
            />

            {/* Level Text */}
            <text x="12" y="24" fill="white" textAnchor="middle" fontSize="8" fontFamily="monospace" fontWeight="bold" style={{ textShadow: '0 0 3px black' }}>
                {Math.round(level)}%
            </text>
        </g>
    );
};

// --- Particle Animation ---

const FlowParticle = ({ path, color, delay, duration = 2, flicker = false }: { path: string, color: string, delay: number, duration?: number, flicker?: boolean }) => (
    <motion.circle
        r="4"
        fill={color}
        initial={{ opacity: 0 }}
        animate={{ 
            opacity: flicker ? [0, 1, 0.2, 1, 0.4, 1, 0] : [0, 1, 1, 0]
        }}
        transition={{
            duration: duration,
            repeat: Infinity,
            ease: "linear",
            delay: delay,
            times: flicker ? [0, 0.2, 0.3, 0.5, 0.6, 0.8, 1] : [0, 0.1, 0.9, 1]
        }}
    >
        {/* SVG Animation for movement along path */}
        <animateMotion 
            dur={`${duration}s`}
            begin={`${delay}s`}
            repeatCount="indefinite"
            path={path}
            fill="freeze"
            keyPoints="0;1"
            keyTimes="0;1"
            calcMode="linear"
        />
    </motion.circle>
);

const PowerStream: React.FC<PowerStreamProps> = ({ status, batteryLevel, onSelectNode }) => {
  const isUnknown = status === 'UNKNOWN';
  const isOnBattery = status === 'ON_BATTERY' || status === 'LOW_BATTERY';
  const isOnline = status === 'ONLINE' || status === 'CALIBRATING';
  const isOverload = status === 'OVERLOAD';
  
  const gridColor = (isOnBattery || isUnknown) ? COLORS.gray : COLORS.green;
  const flowColor = isOverload ? COLORS.red : (isOnBattery ? COLORS.orange : (isUnknown ? COLORS.gray : COLORS.cyan));
  const batteryColor = batteryLevel < 30 ? COLORS.red : (isOnBattery ? COLORS.orange : (isUnknown ? COLORS.gray : COLORS.cyan));

  // --- Layout Geometry (ViewBox 600x320) ---
  const GRID = { x: 80, y: 60 };
  const UPS = { x: 300, y: 60 };
  const LOAD = { x: 520, y: 60 };
  const BATT = { x: 300, y: 260 };

  // Path Definitions
  const pathGridToUps = `M 108 60 L 260 60`; 
  const pathUpsToLoad = `M 340 60 L 492 60`;
  const pathUpsToBattery = `M 300 100 L 300 216`;
  const pathBatteryToUps = `M 300 216 L 300 100`;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 600 320" 
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      >
        <defs>
            <filter id="glow-line" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
            {/* Softer hover glow for nodes instead of scaling */}
            <filter id="hover-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
             <marker id="arrowhead-grid" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={gridColor} />
            </marker>
            <marker id="arrowhead-flow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={flowColor} />
            </marker>
        </defs>

        {/* --- Background Wiring (Inactive) --- */}
        <path d={pathGridToUps} stroke="#333" strokeWidth="2" strokeDasharray="6 6" fill="none" />
        <path d={pathUpsToLoad} stroke="#333" strokeWidth="2" strokeDasharray="6 6" fill="none" />
        <path d={pathUpsToBattery} stroke="#333" strokeWidth="2" strokeDasharray="6 6" fill="none" />

        {/* --- Active Wiring & Animation --- */}

        {/* Grid Feed */}
        {isOnline && (
            <>
                <path d={pathGridToUps} stroke={gridColor} strokeWidth="4" filter="url(#glow-line)" opacity="0.6" markerEnd="url(#arrowhead-grid)" />
                <FlowParticle path={pathGridToUps} color={gridColor} delay={0} />
                <FlowParticle path={pathGridToUps} color={gridColor} delay={1} />
            </>
        )}

        {/* UPS Output */}
        <path d={pathUpsToLoad} stroke={flowColor} strokeWidth="4" filter="url(#glow-line)" opacity="0.6" markerEnd="url(#arrowhead-flow)" />
        <FlowParticle path={pathUpsToLoad} color={flowColor} delay={0} flicker={isOnBattery} />
        <FlowParticle path={pathUpsToLoad} color={flowColor} delay={1} flicker={isOnBattery} />

        {/* Battery Charging (Down) */}
        {isOnline && (
            <>
                <path d={pathUpsToBattery} stroke={COLORS.green} strokeWidth="4" filter="url(#glow-line)" opacity="0.6" />
                <FlowParticle path={pathUpsToBattery} color={COLORS.green} delay={0.5} />
            </>
        )}

        {/* Battery Discharging (Up) */}
        {isOnBattery && (
            <>
                <path d={pathBatteryToUps} stroke={COLORS.orange} strokeWidth="4" filter="url(#glow-line)" opacity="0.6" />
                <FlowParticle path={pathBatteryToUps} color={COLORS.orange} delay={0.5} flicker={true} duration={1.5} />
            </>
        )}

        {/* --- Nodes (Interactive Groups) --- */}
        
        {/* Grid Node */}
        <g 
            transform={`translate(${GRID.x}, ${GRID.y})`} 
            onClick={() => onSelectNode('GRID')}
            className="cursor-pointer group hover:brightness-125 transition-all"
        >
            <text x="0" y="-35" fill={gridColor} fontSize="14" fontFamily="monospace" textAnchor="middle" fontWeight="bold">UTILITY GRID</text>
            <g transform="translate(-24, -24) scale(2)">
                <SvgIconGrid color={gridColor} />
            </g>
            <rect x="-30" y="-30" width="60" height="60" fill="transparent" /> {/* Hitbox */}
        </g>

        {/* UPS Node */}
        <g 
            transform={`translate(${UPS.x}, ${UPS.y})`} 
            onClick={() => onSelectNode('UPS')}
            className="cursor-pointer group hover:brightness-125 transition-all"
        >
             <text x="0" y="-45" fill={flowColor} fontSize="16" fontFamily="monospace" textAnchor="middle" fontWeight="bold">SMART-UPS</text>
             
             {/* Subtle Active Pulse - Only visible when Active */}
             {(isOnline || isOnBattery) && (
                 <motion.circle
                    r="50"
                    fill={flowColor}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.15, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ pointerEvents: 'none' }}
                 />
             )}

             <g transform="translate(-36, -36) scale(3)">
                 <SvgIconUPS color={flowColor} isOverload={isOverload} />
             </g>
             <rect x="-40" y="-40" width="80" height="80" fill="transparent" />
        </g>

        {/* Load Node */}
        <g 
            transform={`translate(${LOAD.x}, ${LOAD.y})`} 
            onClick={() => onSelectNode('LOAD')}
            className="cursor-pointer group hover:brightness-125 transition-all"
        >
            <text x="0" y="-35" fill={COLORS.cyan} fontSize="14" fontFamily="monospace" textAnchor="middle" fontWeight="bold">CRITICAL LOAD</text>
            <g transform="translate(-24, -24) scale(2)">
                <SvgIconLoad color={COLORS.cyan} />
            </g>
            <rect x="-30" y="-30" width="60" height="60" fill="transparent" />
        </g>

        {/* Battery Node */}
        <g 
            transform={`translate(${BATT.x}, ${BATT.y})`} 
            onClick={() => onSelectNode('BATTERY')}
            className="cursor-pointer group hover:brightness-125 transition-all"
        >
            <g transform="translate(-24, -40) scale(2)">
                <SvgIconBattery color={batteryColor} level={batteryLevel} />
            </g>
            <text x="0" y="55" fill={batteryColor} fontSize="14" fontFamily="monospace" textAnchor="middle" fontWeight="bold">BATTERY ARRAY</text>
            <rect x="-30" y="-45" width="60" height="90" fill="transparent" />
        </g>

      </svg>
    </div>
  );
};

export default PowerStream;
