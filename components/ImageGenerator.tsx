import React, { useState } from 'react';
import { generateUPSImage } from '../services/geminiService';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKeySelection = async () => {
      if (window.aistudio) {
          try {
              await window.aistudio.openSelectKey();
              setError(null);
          } catch (e) {
              console.error("Key selection failed", e);
          }
      }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setError(null);
    setGeneratedImage(null);

    // Proactive check for API Key
    if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await handleKeySelection();
        }
    }

    setLoading(true);
    try {
        const result = await generateUPSImage(prompt, size);
        setGeneratedImage(result);
    } catch (e: any) {
        if (e.message?.includes('403') || e.status === 403 || e.message?.includes('PERMISSION_DENIED')) {
            setError("Access Denied: High-Quality Image generation requires a paid API Key.");
            // Automatically prompt to fix the key if we can't detect it proactively
            if (window.aistudio) {
                 await handleKeySelection();
            }
        } else {
            setError("Simulation failed. Neural net unresponsive.");
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded p-4 md:p-6 h-full flex flex-col overflow-y-auto pb-24 md:pb-6">
       <div className="flex justify-between items-center mb-4">
           <h3 className="text-neon-orange font-mono text-sm">VISUAL SIMULATOR (GEMINI 3 PRO)</h3>
           <button 
               onClick={handleKeySelection}
               className="text-[10px] text-gray-500 hover:text-neon-cyan border border-gray-800 hover:border-neon-cyan px-2 py-1 rounded transition-colors"
           >
               [CONFIG API KEY]
           </button>
       </div>
       
       <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input 
                type="text" 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe scenario (e.g., 'Server rack fire')"
                className="flex-1 bg-black border border-gray-700 text-white px-3 py-2 font-mono text-sm focus:border-neon-orange outline-none"
            />
            <div className="flex gap-4">
                <select 
                    value={size}
                    onChange={e => setSize(e.target.value as any)}
                    className="bg-black border border-gray-700 text-white px-3 py-2 font-mono text-sm w-1/2 md:w-auto"
                >
                    <option value="1K">1K RES</option>
                    <option value="2K">2K RES</option>
                    <option value="4K">4K RES</option>
                </select>
                <button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex-1 md:flex-none bg-neon-orange/20 text-neon-orange border border-neon-orange px-4 py-2 font-mono text-sm hover:bg-neon-orange hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'RENDERING...' : 'SIMULATE'}
                </button>
            </div>
       </div>

       {error && (
           <div className="mb-4 bg-red-900/20 border border-red-500 p-3 text-red-500 text-xs font-mono flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
               <span>{error}</span>
               <button onClick={handleKeySelection} className="underline hover:text-white whitespace-nowrap">SELECT NEW KEY</button>
           </div>
       )}

       <div className="flex-1 bg-black border border-gray-800 rounded flex items-center justify-center overflow-hidden relative min-h-[300px]">
            {generatedImage ? (
                <img src={generatedImage} alt="Generated" className="max-h-full max-w-full object-contain" />
            ) : (
                <div className="text-gray-600 font-mono text-xs flex flex-col items-center gap-2 p-4 text-center">
                    <span>{loading ? 'PROCESSING NEURAL GRAPHICS...' : 'NO VISUAL DATA'}</span>
                    {!loading && !error && (
                        <div className="text-[10px] text-gray-700 text-center max-w-xs">
                            Note: Requires Paid Google Cloud Project API Key for Gemini 3 Pro Image Generation.
                        </div>
                    )}
                </div>
            )}
            
            {loading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-neon-orange border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
       </div>
    </div>
  );
};

export default ImageGenerator;