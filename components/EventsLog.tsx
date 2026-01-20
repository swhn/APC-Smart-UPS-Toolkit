
import React, { useState } from 'react';
import { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const EventsLog: React.FC<Props> = ({ logs, onClearLogs }) => {
  const [filter, setFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS'>('ALL');

  const filteredLogs = logs.filter(log => filter === 'ALL' || log.severity === filter).reverse(); // Most recent first

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-500 border-red-500/50 bg-red-950/20';
      case 'WARNING': return 'text-orange-500 border-orange-500/50 bg-orange-950/20';
      case 'SUCCESS': return 'text-green-500 border-green-500/50 bg-green-950/20';
      default: return 'text-neon-cyan border-gray-800 bg-gray-900/10';
    }
  };

  return (
    <div className="h-full p-4 md:p-8 flex flex-col gap-6 max-w-6xl mx-auto overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
            <h2 className="text-xl font-mono text-neon-cyan">SYSTEM AUDIT LOG</h2>
            <p className="text-xs text-gray-500 font-mono mt-1">Detailed chronology of automated actions and user modifications.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={onClearLogs} 
                className="px-4 py-2 border border-gray-700 hover:border-red-500 text-gray-500 hover:text-red-500 text-xs font-mono rounded transition-colors"
            >
                CLEAR HISTORY
            </button>
            <button className="px-4 py-2 bg-neon-cyan text-black text-xs font-bold font-mono rounded hover:bg-white transition-colors">
                EXPORT CSV
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 pb-2 overflow-x-auto">
         {['ALL', 'INFO', 'SUCCESS', 'WARNING', 'CRITICAL'].map(f => (
             <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-1 text-[10px] font-mono border rounded-full transition-colors whitespace-nowrap
                    ${filter === f 
                        ? 'bg-gray-800 text-white border-gray-500 shadow-sm' 
                        : 'bg-transparent text-gray-600 border-transparent hover:border-gray-800'}
                `}
             >
                 {f}
             </button>
         ))}
      </div>

      {/* Log Table Container */}
      <div className="flex-1 bg-[#0a0a0a] border border-gray-800 rounded-lg overflow-hidden flex flex-col shadow-inner">
        <div className="grid grid-cols-12 bg-[#111] text-gray-500 text-[10px] font-mono font-bold uppercase p-3 border-b border-gray-800 tracking-wider">
            <div className="col-span-3 md:col-span-2">TIMESTAMP</div>
            <div className="col-span-2 md:col-span-1 text-center">LEVEL</div>
            <div className="col-span-2 md:col-span-1 text-center">SOURCE</div>
            <div className="col-span-5 md:col-span-8">MESSAGE DETAIL</div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
            {filteredLogs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-700 font-mono text-xs opacity-50">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    NO LOG ENTRIES FOUND
                </div>
            )}
            {filteredLogs.map((log, index) => (
                <div 
                    key={log.id} 
                    className={`grid grid-cols-12 items-center p-3 text-xs font-mono border-b border-gray-900 hover:bg-white/5 transition-colors group
                        ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}
                    `}
                >
                    <div className="col-span-3 md:col-span-2 text-gray-500 group-hover:text-white transition-colors">{log.timestamp}</div>
                    
                    <div className="col-span-2 md:col-span-1 flex justify-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getSeverityStyles(log.severity)}`}>
                            {log.severity}
                        </span>
                    </div>
                    
                    <div className="col-span-2 md:col-span-1 flex justify-center">
                        <span className="text-[9px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                            {log.source}
                        </span>
                    </div>
                    
                    <div className="col-span-5 md:col-span-8 text-gray-300 break-words pl-2 border-l border-gray-800 group-hover:border-gray-600 transition-colors">
                        {log.message}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default EventsLog;
