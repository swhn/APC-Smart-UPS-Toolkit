
import React from 'react';

// --- Shared UI Components for Industrial Settings ---

const MiniHelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={(e) => { e.preventDefault(); onClick(); }}
        className="ml-2 w-4 h-4 rounded-full border border-gray-600 text-gray-500 flex items-center justify-center text-[9px] hover:text-neon-cyan hover:border-neon-cyan transition-colors z-10"
        title="More Info"
        type="button"
    >
        ?
    </button>
);

export const SectionHeader: React.FC<{ title: string; subtitle?: string; onHelp?: () => void }> = ({ title, subtitle, onHelp }) => (
    <div className="mb-6 border-b border-gray-800 pb-2 flex justify-between items-start">
        <div>
            <h3 className="text-white font-mono text-sm font-bold tracking-wider">{title}</h3>
            {subtitle && <p className="text-[10px] text-gray-500 font-mono mt-1">{subtitle}</p>}
        </div>
        {onHelp && (
            <button onClick={onHelp} className="w-5 h-5 rounded-full border border-gray-600 text-gray-500 flex items-center justify-center text-[10px] hover:text-neon-cyan hover:border-neon-cyan transition-colors" title="Help">
                ?
            </button>
        )}
    </div>
);

export const InputField: React.FC<{ 
    label: string; 
    value: any; 
    onChange: (val: string) => void; 
    type?: string; 
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    onHelp?: () => void;
}> = ({ label, value, onChange, type = "text", placeholder, disabled = false, className = "", onHelp }) => (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
        <div className="flex items-center mb-0.5">
            <label className="text-[10px] text-gray-500 font-mono tracking-wider font-bold">{label}</label>
            {onHelp && <MiniHelpButton onClick={onHelp} />}
        </div>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-black border border-gray-700 text-white px-3 py-2 font-mono text-sm focus:outline-none focus:border-neon-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
    </div>
);

export const SelectField: React.FC<{
    label: string;
    value: string | number;
    onChange: (val: string) => void;
    options: { label: string; value: string | number }[];
    disabled?: boolean;
    onHelp?: () => void;
}> = ({ label, value, onChange, options, disabled, onHelp }) => (
    <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center mb-0.5">
            <label className="text-[10px] text-gray-500 font-mono tracking-wider font-bold">{label}</label>
            {onHelp && <MiniHelpButton onClick={onHelp} />}
        </div>
        <div className="relative">
            <select 
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                className="w-full bg-black border border-gray-700 text-white px-3 py-2 font-mono text-sm focus:outline-none focus:border-neon-cyan appearance-none disabled:opacity-50"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <div className="absolute right-3 top-2.5 pointer-events-none text-gray-500 text-[10px]">▼</div>
        </div>
    </div>
);

export const ToggleItem: React.FC<{ 
    label: string; 
    description?: string; 
    enabled: boolean; 
    onToggle: () => void; 
    children?: React.ReactNode;
    disabled?: boolean;
    onHelp?: () => void;
}> = ({ label, description, enabled, onToggle, children, disabled, onHelp }) => (
    <div className={`bg-gray-900/30 p-4 border border-gray-800 rounded transition-colors ${enabled ? 'border-neon-cyan/30' : ''}`}>
        <div className="flex justify-between items-start mb-2">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <div className={`text-xs font-bold font-mono ${enabled ? 'text-white' : 'text-gray-400'}`}>{label}</div>
                    {onHelp && <MiniHelpButton onClick={onHelp} />}
                </div>
                {description && <div className="text-[10px] text-gray-500 font-mono">{description}</div>}
            </div>
             <button 
                onClick={onToggle} 
                disabled={disabled}
                className={`w-10 h-5 shrink-0 rounded-full relative transition-colors ${enabled ? 'bg-neon-cyan' : 'bg-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
                 <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${enabled ? 'left-[22px]' : 'left-[2px]'}`}></div>
             </button>
        </div>
        {children && <div className={`mt-3 pt-3 border-t border-gray-800 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>{children}</div>}
    </div>
);

export const SaveButton: React.FC<{ onClick: () => void; disabled?: boolean; label?: string }> = ({ onClick, disabled, label = "SAVE CHANGES" }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className="w-full bg-neon-cyan text-black px-4 py-3 text-xs font-bold font-mono hover:bg-white transition-colors border border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
    >
        {label}
    </button>
);
