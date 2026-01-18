
import React, { useState, useEffect } from 'react';
import { UPSData, SystemConfiguration } from '../types';
import { COLORS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  data: UPSData;
  config: SystemConfiguration;
  setStatus: (status: UPSData['status']) => void;
}

const DiagnosticsBay: React.FC<Props> = ({ data, config, setStatus }) => {
  const [calibStatus, setCalibStatus] = useState<'IDLE' | 'RUNNING' | 'COMPLETE' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState(0);

  // Auto-reset complete status after a few seconds
  useEffect(() => {
    if (calibStatus === 'COMPLETE') {
        const timer = setTimeout(() => {
            setCalibStatus('IDLE');
            setProgress(0);
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [calibStatus]);

  const handleStartCalibration = () => {
    // 1. Safety Checks
    if (data.batteryCapacity < 50) {
        setCalibStatus('ERROR');
        setTimeout(() => setCalibStatus('IDLE'), 3000);
        return;
    }
    if (data.status !== 'ONLINE') {
        setCalibStatus('ERROR');
        setTimeout(() => setCalibStatus('IDLE'), 3000);
        return;
    }

    // 2. Start Sequence
    setCalibStatus('RUNNING');
    setStatus('CALIBRATING');
    setProgress(0);

    let currentProgress = 0;
    const interval = setInterval(() => {
        currentProgress += 2; // Increments to reach 100 in ~50 steps * 100ms = 5 seconds
        setProgress(currentProgress);

        if (currentProgress >= 100) {
            clearInterval(interval);
            setCalibStatus('COMPLETE');
            setStatus('ONLINE');
        }
    }, 100);
  };

  const getButtonText = () => {
      switch(calibStatus) {
          case 'RUNNING': return `CALIBRATING SYSTEM... ${progress}%`;
          case 'COMPLETE': return 'CALIBRATION SUCCESSFUL';
          case 'ERROR': return 'ERROR: BATTERY TOO LOW OR SYSTEM UNSTABLE';
          default: return 'START NEW CALIBRATION';
      }
  };

  const getButtonClass = () => {
      switch(calibStatus) {
          case 'RUNNING': return 'bg-gray-800 border-neon-cyan text-neon-cyan cursor-wait';
          case 'COMPLETE': return 'bg-green-900 border-green-500 text-green-500';
          case 'ERROR': return 'bg-red-900 border-red-500 text-red-500';
          default: return 'border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black';
      }
  };

  // --- Dynamic Battery Topology Calculation ---
  // Prefer manual configuration overrides if enabled
  const override = config.batteryConfigOverride;
  const useOverride = override?.enabled;

  const nominalVoltage = useOverride ? override.nominalVoltage : data.batteryNominalVoltage;
  // If override, total = 1 (internal) + manual external. If not, use SNMP reported count.
  const totalPacks = useOverride ? (1 + (override.manualExternalPacks || 0)) : data.batteryPackCount;

  // Standard lead-acid blocks are usually 12V. 
  // We calculate the number of "Logical Blocks" (12V chunks) per pack.
  // Example: 48V System = 4 blocks per pack.
  // 192V System = 16 blocks per pack.
  const logicalBlocksPerPack = Math.max(1, Math.round(nominalVoltage / 12));
  
  // CORRECTION: Packs are in PARALLEL. Voltage does not divide by pack count.
  // Total Bus Voltage applies to every string equally.
  // We only divide by the number of blocks in a SINGLE series string.
  const estimatedBlockVoltage = data.batteryVoltage / logicalBlocksPerPack;

  const renderBatteryPack = (packIndex: number) => {
      const isExternal = packIndex > 0;
      
      return (
          <div key={packIndex} className="bg-black/40 border border-gray-700 rounded p-4 relative">
               <div className="absolute -top-2 left-4 px-2 bg-gray-900 text-[10px] font-mono text-gray-500 border border-gray-700 uppercase">
                   {isExternal ? `EXT PACK ${packIndex} (PARALLEL)` : 'INTERNAL STRING (MAIN)'}
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2 mt-2">
                   {Array.from({length: logicalBlocksPerPack}).map((_, blockIdx) => (
                       <div 
                          key={blockIdx}
                          className={`h-12 border rounded relative flex items-center justify-center overflow-hidden
                            ${data.batteryTemp > 40 ? 'bg-red-900/20 border-red-500' : 'bg-gray-800 border-gray-600'}
                            ${calibStatus === 'RUNNING' && Math.random() > 0.5 ? 'animate-pulse' : ''}
                          `}
                       >
                           <div className="text-[10px] font-mono text-white z-10">
                               {estimatedBlockVoltage.toFixed(2)}V
                           </div>
                           
                           {/* Visual Fill Level based on estimated capacity (simplified) */}
                           <div 
                                className="absolute bottom-0 left-0 right-0 bg-neon-cyan/20 z-0 transition-all duration-1000"
                                style={{ height: `${data.batteryCapacity}%` }}
                           />
                       </div>
                   ))}
               </div>
          </div>
      );
  };

  // Temperature Thresholds for Visual Warning
  const isTempHigh = data.batteryTemp > 35;
  const isTempCritical = data.batteryTemp > 45;

  return (
    <div className="h-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto">
      
      {/* CRITICAL REPLACEMENT WARNING */}
      {data.batteryNeedsReplacement && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-1 lg:col-span-3 bg-red-900/40 border-2 border-red-500 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            >
                <div className="flex items-center gap-4 mb-3 md:mb-0">
                    <div className="p-3 bg-red-600 text-white rounded-full">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-mono font-bold text-red-100 tracking-wider">BATTERY REPLACEMENT REQUIRED</h2>
                        <p className="text-red-300 font-mono text-xs">SNMP Alert Active: Internal self-test failed. Replace battery modules immediately to ensure runtime availability.</p>
                    </div>
                </div>
                <div className="text-right w-full md:w-auto">
                    <div className="text-[10px] text-red-400 font-mono uppercase mb-1">Recommended Action</div>
                    <button className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white px-4 py-2 font-mono text-xs font-bold rounded transition-colors">
                        ORDER REPLACEMENT
                    </button>
                </div>
            </motion.div>
      )}

      {/* LEFT COL: Dynamic Battery Matrix */}
      <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded p-6 flex flex-col relative min-h-[400px]">
        
        {/* Header with High-Vis Temperature */}
        <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
            <div>
                <h3 className="text-neon-cyan font-mono text-sm mb-1 font-bold">BATTERY ARRAY TOPOLOGY</h3>
                <div className="text-gray-500 text-xs font-mono">BUS: {nominalVoltage}V DC | {totalPacks} PARALLEL STRING(S)</div>
            </div>
            
            {/* LARGE TEMPERATURE BADGE */}
            <div className={`flex flex-col items-end px-4 py-2 rounded border shadow-lg transition-all duration-500
                ${isTempCritical ? 'border-red-500 bg-red-900/40 text-red-500 animate-pulse' : 
                  isTempHigh ? 'border-orange-500 bg-orange-900/20 text-orange-500' : 
                  'border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan'}`}
            >
                 <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">Array Temp</span>
                 </div>
                 <div className="text-3xl font-mono font-bold leading-none">{data.batteryTemp}°C</div>
            </div>
        </div>
        
        <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
            {Array.from({length: totalPacks}).map((_, i) => renderBatteryPack(i))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800 text-[10px] text-gray-500 font-mono">
            * Block voltages estimated from DC Bus / Series Count. Parallel packs do not divide voltage.
        </div>
      </div>

      {/* RIGHT COL: Stats & Tools */}
      <div className="flex flex-col gap-6">
        
        {/* The Oracle */}
        <div className={`bg-black border rounded p-6 transition-colors duration-500 ${data.batteryNeedsReplacement ? 'border-red-500' : 'border-gray-800'}`}>
            <h3 className={`font-mono text-sm mb-4 ${data.batteryNeedsReplacement ? 'text-red-500' : 'text-neon-orange'}`}>THE ORACLE (PREDICTIVE HEALTH)</h3>
            <div className="flex justify-between items-end">
                <div>
                    <div className="text-gray-500 text-xs font-mono">ESTIMATED FAILURE</div>
                    <div className={`text-2xl md:text-3xl font-mono ${data.batteryNeedsReplacement ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {data.batteryNeedsReplacement ? 'IMMINENT' : 'OCT 2026'}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-gray-500 text-xs font-mono">HEALTH GRADE</div>
                    <div className={`text-4xl md:text-5xl font-mono font-bold ${data.batteryNeedsReplacement ? 'text-red-600' : 'text-neon-green'}`}>
                        {data.batteryNeedsReplacement ? 'F' : 'A-'}
                    </div>
                </div>
            </div>
            <div className="mt-4 h-1 w-full bg-gray-800 rounded overflow-hidden">
                <div 
                    className={`h-full w-[85%] rounded shadow-[0_0_10px_#39FF14] transition-all duration-1000 ${data.batteryNeedsReplacement ? 'bg-red-600 w-[10%]' : 'bg-neon-green'}`}
                ></div>
            </div>
        </div>

        {/* Calibration Wizard */}
        <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded p-6 flex flex-col min-h-[300px]">
            <h3 className="text-neon-cyan font-mono text-sm mb-4">CALIBRATION WIZARD</h3>
            <div className="space-y-4 flex-1">
                <div className={`flex items-center gap-4 transition-all ${progress > 10 ? 'opacity-100 text-white' : 'opacity-50 text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-sm ${progress > 10 ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan' : 'border-gray-600'}`}>1</div>
                    <div className="font-mono text-sm">SAFETY CHECK (LOAD > 15%)</div>
                    {progress > 10 && <span className="text-neon-cyan ml-auto">OK</span>}
                </div>
                <div className={`flex items-center gap-4 transition-all ${progress > 40 ? 'opacity-100 text-white' : 'opacity-50 text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-sm ${progress > 40 ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan' : 'border-gray-600'}`}>2</div>
                    <div className="font-mono text-sm">DISCHARGE CYCLE</div>
                    {progress > 40 && progress < 90 && <span className="text-neon-orange ml-auto animate-pulse">ACTIVE</span>}
                    {progress >= 90 && <span className="text-neon-cyan ml-auto">COMPLETE</span>}
                </div>
                <div className={`flex items-center gap-4 transition-all ${progress > 90 ? 'opacity-100 text-white' : 'opacity-50 text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-sm ${progress > 90 ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan' : 'border-gray-600'}`}>3</div>
                    <div className="font-mono text-sm">RUNTIME REPORT</div>
                    {progress >= 100 && <span className="text-neon-cyan ml-auto">SAVED</span>}
                </div>
            </div>
            
            <button 
                onClick={handleStartCalibration}
                disabled={calibStatus === 'RUNNING' || data.batteryNeedsReplacement}
                className={`w-full mt-4 border font-mono py-3 transition-all uppercase text-sm font-bold relative overflow-hidden ${
                    data.batteryNeedsReplacement ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : getButtonClass()
                }`}
            >
                <div className="relative z-10">{data.batteryNeedsReplacement ? 'CALIBRATION UNSAFE' : getButtonText()}</div>
                {calibStatus === 'RUNNING' && (
                    <div 
                        className="absolute left-0 top-0 h-full bg-neon-cyan/10 z-0 transition-all duration-100 ease-linear" 
                        style={{ width: `${progress}%` }} 
                    />
                )}
            </button>
        </div>

      </div>
    </div>
  );
};

export default DiagnosticsBay;
