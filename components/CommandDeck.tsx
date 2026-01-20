import React, { useState, useEffect, useRef, useCallback } from 'react';
import Gauge from './Gauge';
import PowerStream from './PowerStream';
import { UPSData, SystemNode, SequenceCountdownMap, Device, ActiveTriggerInfo } from '../types';
import { COLORS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

// --- Icons ---
const IconTemp = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>;
const IconAmps = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>;
const IconZap = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
const IconClock = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const IconEyeOff = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;
const IconActivity = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const IconAlert = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const IconInfo = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

interface Props {
  data: UPSData;
  enableAudibleAlarms: boolean;
  activeCountdowns?: SequenceCountdownMap;
  deviceList?: Device[];
  onHelp?: (context: string) => void;
}

const CommandDeck: React.FC<Props> = ({ data, enableAudibleAlarms, activeCountdowns = {}, deviceList = [], onHelp }) => {
  const [stealthMode, setStealthMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SystemNode | null>(null);
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const lastBeepTime = useRef<number>(0);

  const isCrisis = data.status === 'ON_BATTERY' || data.status === 'LOW_BATTERY' || data.status === 'OVERLOAD';
  const isOverheat = data.batteryTemp > 40;
  const isShutdownActive = Object.keys(activeCountdowns).length > 0;

  const toggleStealth = () => {
    setStealthMode(!stealthMode);
  };

  // Audible Alarm Logic for Overheat
  const playAlarmSound = useCallback(() => {
    if (!enableAudibleAlarms) return;
    
    // Throttle beep to once every 2 seconds
    const now = Date.now();
    if (now - lastBeepTime.current < 2000) return;
    lastBeepTime.current = now;

    // Simple Oscillator Beep
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.value = 880; // A5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, [enableAudibleAlarms]);

  useEffect(() => {
    if (isOverheat) {
        playAlarmSound();
        const interval = setInterval(playAlarmSound, 2000);
        return () => clearInterval(interval);
    }
  }, [isOverheat, playAlarmSound]);

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const getDeviceName = (id: string) => {
      // Check for hard-cut outlet group names
      if (id.startsWith('OUTLET_GRP_')) {
          const num = id.replace('OUTLET_GRP_', '');
          return `Outlet Bank #${num} (Hard Cut)`;
      }
      return deviceList.find(d => d.id === id)?.name || id;
  };

  const renderModalContent = () => {
    if (!selectedNode) return null;

    switch (selectedNode) {
        case 'GRID':
            return (
                <>
                    <div className="text-neon-green font-mono text-xl mb-4 border-b border-neon-green/30 pb-2">UTILITY GRID FEED</div>
                    <div className="space-y-4">
                        <DetailRow label="INPUT VOLTAGE" value={`${data.inputVoltage.toFixed(1)} V`} />
                        <DetailRow label="FREQUENCY" value={`${data.inputFrequency.toFixed(1)} Hz`} />
                        <div className="mt-4 p-2 bg-gray-900 rounded border border-gray-700 text-xs font-mono text-gray-400">
                            Grid stability within normal operating parameters.
                        </div>
                    </div>
                </>
            );
        case 'UPS':
            return (
                <>
                    <div className="text-neon-cyan font-mono text-xl mb-4 border-b border-neon-cyan/30 pb-2">{data.modelName || 'APC SMART-UPS'}</div>
                    <div className="space-y-4">
                        <DetailRow label="FIRMWARE" value={data.firmwareVersion || 'Unknown'} />
                        <DetailRow label="INTERNAL TEMP" value={`${data.batteryTemp}°C`} color={isOverheat ? COLORS.red : 'white'} />
                        <DetailRow label="OUTPUT VOLTAGE" value={`${data.outputVoltage.toFixed(1)} V`} />
                        <DetailRow label="SYSTEM STATUS" value={data.status} color={isCrisis ? COLORS.red : COLORS.cyan} />
                    </div>
                </>
            );
        case 'BATTERY':
            const swRuntime = Math.floor(data.runtimeRemaining * 0.85);
            const chargingStatus = data.status === 'ON_BATTERY' || data.status === 'LOW_BATTERY' 
                ? 'DISCHARGING' 
                : (data.batteryCapacity < 100 ? 'CHARGING' : 'FLOAT CHARGE');

            return (
                <>
                    <div className="text-neon-orange font-mono text-xl mb-4 border-b border-neon-orange/30 pb-2">BATTERY ARRAY</div>
                    <div className="space-y-4">
                        <DetailRow label="CYCLE STATUS" value={chargingStatus} color={chargingStatus === 'DISCHARGING' ? COLORS.red : COLORS.green} />
                        <DetailRow label="ARRAY VOLTAGE" value={`${data.batteryVoltage.toFixed(1)} VDC`} />
                        <DetailRow label="CAPACITY" value={`${data.batteryCapacity}%`} />
                        
                        {data.batteryNeedsReplacement && (
                            <div className="bg-red-900/40 border border-red-500 p-2 rounded flex items-center gap-2 animate-pulse">
                                <IconAlert />
                                <span className="text-red-400 font-mono text-xs font-bold">REPLACEMENT REQUIRED</span>
                            </div>
                        )}

                        <div className="pt-2 border-t border-gray-800/50 mt-2">
                            <DetailRow label="HW RUNTIME (UPS)" value={formatTime(data.runtimeRemaining)} color={COLORS.orange} />
                            <DetailRow label="SW RUNTIME (EST)" value={`~${formatTime(swRuntime)}`} color={COLORS.cyan} />
                        </div>

                        <div className="mt-4 p-3 bg-gray-900/80 rounded border border-gray-700 text-[10px] font-mono text-gray-400 flex gap-2">
                             <div className="shrink-0 mt-0.5 text-neon-cyan"><IconInfo /></div>
                             <div>
                                 <strong className="text-gray-300">Why two estimates?</strong>
                                 <br/>
                                 <span className="text-neon-orange">HW Runtime</span> is reported directly by the UPS firmware based on battery voltage tables.
                                 <br/>
                                 <span className="text-neon-cyan">SW Runtime</span> applies a 15% safety margin to account for battery aging and sudden load spikes.
                             </div>
                        </div>

                        <DetailRow label="REPLACEMENT DATE" value={data.batteryReplaceDate || 'Unknown'} />
                    </div>
                </>
            );
        case 'LOAD':
            return (
                <>
                    <div className="text-neon-cyan font-mono text-xl mb-4 border-b border-neon-cyan/30 pb-2">CRITICAL LOAD</div>
                    <div className="space-y-4">
                        <DetailRow label="REAL POWER" value={`${data.realPowerW.toFixed(2)} W`} />
                        <DetailRow label="APPARENT POWER" value={`${data.apparentPowerVA.toFixed(2)} VA`} />
                        <DetailRow label="OUTPUT CURRENT" value={`${data.outputAmps.toFixed(2)} A`} />
                        <DetailRow label="LOAD FACTOR" value={`${data.loadPercentage.toFixed(2)}%`} />
                    </div>
                </>
            );
    }
  };

  return (
    <div className={`w-full flex flex-col p-4 md:p-6 gap-4 md:gap-6 relative transition-all duration-500 
        ${stealthMode ? 'opacity-50 grayscale' : ''}
        md:h-full md:overflow-hidden overflow-y-auto min-h-full pb-24 md:pb-6
    `}>
      
      {/* Top Header Status - Fixed Height */}
      <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 min-h-min">
        <div className="flex gap-4 w-full md:w-auto">
            <div className={`p-3 rounded border ${isCrisis ? 'border-neon-orange bg-neon-orange/10 text-neon-orange' : 'border-neon-green bg-neon-green/10 text-neon-green'} flex items-center justify-center shrink-0`}>
                <IconActivity />
            </div>
            <div className="flex-1">
                <h2 className="text-neon-cyan text-base md:text-xl font-mono tracking-widest border-b border-neon-cyan/30 pb-1 mb-2 flex items-center gap-2">
                    SYSTEM STATUS
                    {onHelp && (
                        <button onClick={() => onHelp('dashboard_overview')} className="w-4 h-4 rounded-full border border-neon-cyan/50 text-neon-cyan flex items-center justify-center text-[10px] hover:bg-neon-cyan hover:text-black transition-colors" title="Help">?</button>
                    )}
                </h2>
                <div className={`text-2xl md:text-4xl font-mono font-bold ${isCrisis ? 'text-neon-orange animate-pulse' : 'text-neon-green'}`}>
                    {data.status}
                </div>
                <div className="text-gray-400 font-mono text-xs md:text-sm mt-1 flex gap-4">
                    <span>IN: {data.inputVoltage}V</span>
                    <span className="text-gray-600">|</span>
                    <span>OUT: {data.outputVoltage}V</span>
                </div>
            </div>
        </div>
        
        <button 
            onClick={toggleStealth}
            className={`border px-4 py-2 font-mono text-xs hover:bg-neon-cyan/20 transition-colors flex items-center gap-2 uppercase tracking-wider self-end md:self-auto
                ${stealthMode ? 'bg-neon-cyan text-black border-neon-cyan' : 'text-neon-cyan border-neon-cyan'}
            `}
        >
            {stealthMode ? <IconEyeOff /> : <IconEye />}
            STEALTH {stealthMode ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* OVERHEAT WARNING BANNER */}
      <AnimatePresence>
          {isOverheat && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="shrink-0 w-full bg-red-600/20 border border-red-500 text-red-100 px-4 py-2 flex items-center justify-center gap-3 font-mono text-sm animate-pulse"
              >
                  <IconAlert />
                  <span className="font-bold tracking-widest">CRITICAL ALERT: BATTERY TEMPERATURE HIGH ({data.batteryTemp}°C)</span>
                  <IconAlert />
              </motion.div>
          )}
      </AnimatePresence>

      {/* FLOATING SHUTDOWN SEQUENCE ICON */}
      <AnimatePresence>
          {isShutdownActive && (
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                onClick={() => setShowShutdownModal(true)}
                className="absolute top-24 right-4 md:right-8 z-40 bg-red-600/90 text-white w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-[0_0_30px_rgba(255,0,0,0.6)] border-2 border-red-400 hover:scale-105 transition-transform group cursor-pointer"
              >
                 <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75 pointer-events-none"></span>
                 <IconAlert width={24} height={24} />
                 <span className="text-[10px] font-mono font-bold mt-0.5 leading-none">SHED</span>
                 
                 <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border border-red-600">
                    {Object.keys(activeCountdowns).length}
                 </span>
              </motion.button>
          )}
      </AnimatePresence>

      {/* SHUTDOWN SEQUENCE MODAL */}
      <AnimatePresence>
          {isShutdownActive && showShutdownModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-md bg-black/80 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full max-w-4xl bg-[#0f0f0f] border-2 border-red-500 rounded-lg shadow-[0_0_50px_rgba(220,38,38,0.3)] flex flex-col max-h-[80vh] overflow-hidden"
                >
                     <div className="p-4 md:p-6 border-b border-red-900/50 flex justify-between items-center bg-red-950/20 shrink-0">
                         <div>
                             <h3 className="text-red-500 font-mono text-xl font-bold tracking-widest flex items-center gap-2">
                                 <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                                 ACTIVE LOAD SHEDDING
                             </h3>
                             <p className="text-red-300 font-mono text-xs mt-1">AUTOMATED SEQUENCE IN PROGRESS</p>
                         </div>
                         <button onClick={() => setShowShutdownModal(false)} className="text-red-400 hover:text-white border border-red-900 hover:bg-red-900 px-3 py-1 rounded transition-colors text-xs font-mono">
                            ✕ CLOSE VIEW
                         </button>
                     </div>
                     
                     <div className="p-4 md:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 custom-scrollbar">
                        {Object.entries(activeCountdowns).map(([id, i]) => {
                           const info = i as ActiveTriggerInfo;
                           const isTimer = info.rule.type === 'TIMER';
                           const label = isTimer ? 'T-MINUS' : 'WAITING FOR';
                           const displayValue = isTimer ? `${info.currentValue}s` : `${info.rule.threshold}%`;
                           const subValue = isTimer ? null : `Current: ${info.currentValue}%`;
                           
                           // Determine Alert State (Red or Black)
                           // Timer: Red if <= 5 seconds
                           // Battery: Red if Current Capacity is close to or below threshold (target + 2%)
                           const isCritical = isTimer 
                                ? info.currentValue <= 5 
                                : info.currentValue <= (info.rule.threshold + 2);

                           return (
                               <div key={id} className={`p-4 rounded border flex justify-between items-center transition-all ${
                                   isCritical ? 'bg-red-600 text-black border-red-900 animate-pulse' : 'bg-black/60 border-red-900/50 text-white'
                               }`}>
                                  <div className="flex flex-col min-w-0 pr-2">
                                      <span className="text-[10px] opacity-70 font-mono tracking-wider">TARGET DEVICE</span>
                                      <span className="text-sm font-bold font-mono truncate w-full" title={getDeviceName(id)}>{getDeviceName(id)}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                      <span className="text-[10px] opacity-70 font-mono">{label}</span>
                                      <div className="text-2xl font-mono font-bold leading-none">
                                          {displayValue}
                                      </div>
                                      {subValue && <div className="text-[9px] font-mono mt-1 opacity-80">{subValue}</div>}
                                  </div>
                               </div>
                           );
                        })}
                     </div>
                     
                     <div className="p-4 border-t border-red-900/50 bg-red-950/10 text-center shrink-0">
                         <p className="text-red-400 text-xs font-mono animate-pulse">SYSTEM WILL SHUTDOWN DEVICES AS RULES ARE MET</p>
                     </div>
                </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* Middle Section */}
      <div className="flex flex-col md:flex-1 md:min-h-0 items-center justify-center relative gap-4 md:gap-0">
        
        {/* Crisis Clock (Total UPS Runtime) */}
        <AnimatePresence>
            {isCrisis && (
                <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.9 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.9 }}
                    className="shrink-0 w-full max-w-2xl mx-auto z-30 mb-4"
                >
                    <div className="bg-red-950/40 border-2 border-red-600 rounded-lg p-2 md:p-4 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.3)] backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #ff0000 10px, #ff0000 20px)' }}></div>
                        <div className="flex items-center gap-3 text-red-500 mb-1 relative z-10">
                            <IconClock className="w-4 h-4 md:w-5 md:h-5 animate-spin-slow" />
                            <span className="text-xs md:text-sm font-mono font-bold tracking-[0.2em] uppercase">Battery Runtime Remaining</span>
                        </div>
                        <div className="text-4xl md:text-6xl font-mono font-bold text-white tracking-wider tabular-nums drop-shadow-[0_0_15px_rgba(255,0,0,0.6)] relative z-10">
                            {Math.floor(data.runtimeRemaining / 60)}:{(data.runtimeRemaining % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Visualizer Row */}
        <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-8 md:flex-1 md:min-h-0">
            <div className="shrink-0 relative flex items-center justify-center">
                <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48">
                    <Gauge value={data.batteryCapacity} label="BATTERY CAP" colorStart={COLORS.red} colorEnd={COLORS.green} isRight={false} />
                </div>
            </div>

            <div className="w-full h-[250px] md:h-full md:flex-1 md:min-h-0 min-w-0 relative flex flex-col items-center justify-center">
                <div className="flex-1 w-full min-h-0 relative flex items-center justify-center">
                    <PowerStream status={data.status} batteryLevel={data.batteryCapacity} onSelectNode={setSelectedNode} />
                </div>
            </div>

            <div className="shrink-0 relative flex items-center justify-center">
                <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48">
                    <Gauge value={data.loadPercentage} label="SYSTEM LOAD" colorStart={COLORS.cyan} colorEnd={COLORS.orange} isRight={true} />
                </div>
            </div>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 border-t border-gray-800 pt-4 mt-auto md:mt-0">
        <MetricCard label="BATTERY TEMP" value={`${data.batteryTemp}°C`} color={isOverheat ? COLORS.red : data.batteryTemp > 35 ? COLORS.orange : COLORS.cyan} icon={<IconTemp />} className={isOverheat ? 'animate-pulse border-red-500 bg-red-900/30' : ''} />
        <MetricCard label="OUTPUT AMPS" value={`${data.outputAmps.toFixed(2)}A`} icon={<IconAmps />} />
        <MetricCard label="REAL POWER" value={`${data.realPowerW.toFixed(2)}W`} icon={<IconZap />} />
        <MetricCard label="RUNTIME EST." value={`${Math.floor(data.runtimeRemaining/60)}m`} icon={<IconClock />} />
      </div>

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedNode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/60 p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-black border border-neon-cyan p-6 md:p-8 rounded-lg shadow-[0_0_50px_rgba(0,240,255,0.1)] w-full max-w-md relative">
                    <button onClick={() => setSelectedNode(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white p-2">✕</button>
                    {renderModalContent()}
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailRow: React.FC<{ label: string, value: string, color?: string }> = ({ label, value, color = 'white' }) => (
    <div className="flex justify-between items-center border-b border-gray-800 pb-1">
        <span className="text-xs text-gray-500 font-mono tracking-widest">{label}</span>
        <span className="font-mono font-bold" style={{ color }}>{value}</span>
    </div>
);

const MetricCard: React.FC<{ label: string, value: string, color?: string, icon?: React.ReactNode, className?: string }> = ({ label, value, color = COLORS.cyan, icon, className = '' }) => (
    <div className={`bg-gray-900/50 p-2 md:p-3 rounded border border-gray-800 flex items-center justify-between hover:border-neon-cyan/50 transition-colors group ${className}`}>
        <div className="min-w-0">
            <div className="text-gray-500 text-[9px] md:text-[10px] font-mono mb-0.5 tracking-wider truncate">{label}</div>
            <div className="text-lg md:text-xl font-mono font-bold truncate" style={{ color }}>{value}</div>
        </div>
        {icon && <div className="text-gray-700 group-hover:text-neon-cyan transition-colors transform scale-75 md:scale-90 shrink-0">{icon}</div>}
    </div>
);

export default CommandDeck;