
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onLogin: (username: string, password: string) => Promise<boolean>;
  lockoutEndTime: number | null;
  remainingAttempts: number;
}

const LoginScreen: React.FC<Props> = ({ onLogin, lockoutEndTime, remainingAttempts }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'CHECKING' | 'ERROR'>('IDLE');
  
  // Local countdown state for visual timer
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (lockoutEndTime) {
          const update = () => {
              const diff = Math.max(0, lockoutEndTime - Date.now());
              setTimeLeft(Math.ceil(diff / 1000));
          };
          update(); // Initial call
          interval = setInterval(update, 1000);
      } else {
          setTimeLeft(0);
      }
      return () => clearInterval(interval);
  }, [lockoutEndTime]);

  const isLockedOut = timeLeft > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;
    
    setStatus('CHECKING');
    
    // Simulate processing delay for effect
    await new Promise(resolve => setTimeout(resolve, 1000));

    const success = await onLogin(username, password);
    if (!success) {
      setStatus('ERROR');
      setPassword('');
    }
  };

  const formatCountdown = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-screen bg-[#080808] flex items-center justify-center overflow-hidden relative font-mono text-white selection:bg-neon-cyan selection:text-black">
      
      {/* --- Background Layers --- */}
      
      {/* 1. Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
               backgroundImage: `radial-gradient(circle at 2px 2px, #1a1a1a 1px, transparent 0)`,
               backgroundSize: '20px 20px' 
           }}>
      </div>

      {/* 2. SVG Circuit Traces */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
         <defs>
             <pattern id="pcb-traces" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
                 {/* Top Left Trace */}
                 <path d="M20 0 v 40 l 20 20 h 40" stroke="#00F0FF" strokeWidth="1" fill="none" opacity="0.1" />
                 <circle cx="80" cy="60" r="3" fill="#080808" stroke="#00F0FF" strokeWidth="1" opacity="0.3" />
                 
                 {/* Bottom Right Trace */}
                 <path d="M100 200 v -40 l -20 -20 h -40" stroke="#00F0FF" strokeWidth="1" fill="none" opacity="0.1" />
                 <circle cx="40" cy="140" r="3" fill="#080808" stroke="#00F0FF" strokeWidth="1" opacity="0.3" />
                 
                 {/* Random connectors */}
                 <path d="M0 100 h 30 l 10 10 v 30" stroke="#00F0FF" strokeWidth="1" fill="none" opacity="0.1" />
                 <path d="M200 80 h -30 l -10 -10 v -30" stroke="#00F0FF" strokeWidth="1" fill="none" opacity="0.1" />
             </pattern>
             
             <linearGradient id="glow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#00F0FF" stopOpacity="0.5" />
                <stop offset="100%" stopColor="transparent" />
             </linearGradient>
         </defs>
         
         <rect width="100%" height="100%" fill="url(#pcb-traces)" />
         
         {/* Large PCB decorative lines */}
         <path d="M100,50 L150,100 H300 L350,150" stroke="#1a1a1a" strokeWidth="2" fill="none" />
         <path d="M50,400 L100,350 H250 L300,300" stroke="#1a1a1a" strokeWidth="2" fill="none" />
         <circle cx="100" cy="50" r="4" fill="#111" stroke="#222" />
         <circle cx="350" cy="150" r="4" fill="#111" stroke="#222" />
      </svg>
      
      {/* 3. Main Login Module (PCB Component Style) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`z-10 bg-[#0c0c0c] border p-10 rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden group transition-colors duration-500
            ${isLockedOut ? 'border-red-900 shadow-[0_0_50px_rgba(255,0,0,0.1)]' : 'border-gray-800'}
        `}
      >
        {/* Top Metallic Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 opacity-50"></div>
        
        {/* Decorative Screws */}
        <div className="absolute top-3 left-3 text-gray-800 select-none">＋</div>
        <div className="absolute top-3 right-3 text-gray-800 select-none">＋</div>
        <div className="absolute bottom-3 left-3 text-gray-800 select-none">＋</div>
        <div className="absolute bottom-3 right-3 text-gray-800 select-none">＋</div>

        {/* Branding Area */}
        <div className="mb-10 text-center relative">
            <div className={`inline-flex items-center justify-center border p-4 rounded bg-[#080808] mb-4 shadow-[0_0_15px_rgba(0,240,255,0.05)]
                ${isLockedOut ? 'border-red-500/50' : 'border-neon-cyan/20'}
            `}>
                 {isLockedOut ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF003C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                 ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                        <line x1="6" y1="6" x2="6.01" y2="6"></line>
                        <line x1="6" y1="18" x2="6.01" y2="18"></line>
                    </svg>
                 )}
            </div>
            <h1 className="text-2xl font-bold tracking-widest text-white mb-1 drop-shadow-lg">APC SMART UPS</h1>
            <div className="flex items-center justify-center gap-2">
                <div className="h-px w-8 bg-gray-800"></div>
                <div className="text-[10px] text-neon-cyan font-bold tracking-[0.3em] uppercase">TOOLKIT</div>
                <div className="h-px w-8 bg-gray-800"></div>
            </div>
        </div>

        {isLockedOut ? (
             <div className="text-center space-y-4">
                 <h2 className="text-red-500 font-bold text-lg tracking-widest uppercase animate-pulse">SYSTEM COOLDOWN</h2>
                 <p className="text-xs text-gray-400">
                     Security Lock Active: Too many failed attempts.
                 </p>
                 <div className="text-4xl font-mono text-red-500 font-bold tracking-wider mt-4">
                     {formatCountdown(timeLeft)}
                 </div>
                 <div className="bg-red-900/20 border border-red-900 p-2 text-xs text-red-400 font-mono mt-4">
                     Please wait before retrying.
                 </div>
             </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                {/* Username Field - Styled like a chip slot */}
                <div className="relative group/input">
                    <label className="block text-[9px] text-gray-500 mb-1 tracking-widest uppercase font-bold pl-1 group-focus-within/input:text-neon-cyan transition-colors">OPERATOR ID</label>
                    <div className="relative flex items-center bg-[#050505] border border-gray-800 rounded focus-within:border-neon-cyan/50 transition-colors">
                        <div className="pl-3 text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <input 
                            type="text" 
                            value={username}
                            onChange={e => { setUsername(e.target.value); setStatus('IDLE'); }}
                            className="w-full bg-transparent border-none p-3 text-white text-sm focus:outline-none placeholder-gray-800 font-mono"
                            placeholder="ENTER ID"
                            autoFocus
                        />
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-800 group-focus-within/input:bg-neon-cyan transition-colors"></div>
                    </div>
                </div>
                
                {/* Password Field */}
                <div className="relative group/input">
                    <label className="block text-[9px] text-gray-500 mb-1 tracking-widest uppercase font-bold pl-1 group-focus-within/input:text-neon-cyan transition-colors">ACCESS KEY</label>
                    <div className="relative flex items-center bg-[#050505] border border-gray-800 rounded focus-within:border-neon-cyan/50 transition-colors">
                        <div className="pl-3 text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => { setPassword(e.target.value); setStatus('IDLE'); }}
                            className="w-full bg-transparent border-none p-3 text-white text-sm focus:outline-none placeholder-gray-800 font-mono tracking-widest"
                            placeholder="••••••••"
                        />
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-800 group-focus-within/input:bg-neon-cyan transition-colors"></div>
                    </div>
                </div>

                {remainingAttempts < 5 && status !== 'CHECKING' && (
                    <div className="text-[10px] text-orange-500 font-mono text-center bg-orange-900/10 py-1 rounded border border-orange-900/50">
                        ⚠ WARNING: {remainingAttempts} ATTEMPTS REMAINING
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={status === 'CHECKING'}
                    className={`w-full py-3.5 font-bold text-xs tracking-[0.2em] transition-all relative overflow-hidden rounded border 
                        ${status === 'ERROR' 
                            ? 'bg-red-900/20 border-red-500 text-red-500' 
                            : 'bg-gray-900 hover:bg-neon-cyan/10 border-gray-700 hover:border-neon-cyan text-gray-300 hover:text-neon-cyan'}
                    `}
                >
                    {status === 'CHECKING' ? 'INITIALIZING LINK...' : 
                    status === 'ERROR' ? 'CONNECTION REFUSED' : 'INITIALIZE UPLINK'}
                    
                    {/* Circuit trace animation on button hover */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 pointer-events-none transition-opacity">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent animate-pulse"></div>
                    </div>
                </button>
            </form>
        )}

        <div className="mt-8 border-t border-gray-900 pt-4 flex justify-between text-[9px] text-gray-700 font-mono">
            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-green-900 rounded-full"></div> SYS: ONLINE</span>
            <span>VER: 1.0.4 build 22</span>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
