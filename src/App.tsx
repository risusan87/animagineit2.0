import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Settings, 
  Download, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  Maximize2,
  RefreshCw,
  Tags,
  Sliders,
  Info,
  ServerCrash,
  ShieldAlert,
  Key,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GenerationParams {
  prompt: string;
  negative_prompt: string;
  guidance_scale: number;
  num_inference_steps: number;
  seed: string;
  aspect_ratio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
}

export default function App() {
  const [params, setParams] = useState<GenerationParams>({
    prompt: '1girl, solo, long hair, blue eyes, school uniform, cherry blossoms, masterpiece, high quality',
    negative_prompt: 'low quality, blurry, distorted, ugly, bad anatomy, text, watermark',
    guidance_scale: 7.0,
    num_inference_steps: 28,
    seed: '',
    aspect_ratio: '1:1',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [modalKeyInput, setModalKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/v1/status');
        if (response.ok) {
          setBackendStatus('available');
        } else {
          setBackendStatus('unavailable');
        }
      } catch (err) {
        setBackendStatus('unavailable');
      }
    };
    checkStatus();
  }, []);

  const handleGenerate = async () => {
    if (!params.prompt.trim()) {
      setError('Please enter some tags first.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const configRes = await fetch('/api/v1/config/modal-key');
      if (configRes.status === 404) {
        setShowConfigModal(true);
        setIsGenerating(false);
        return;
      }
      if (!configRes.ok) throw new Error('Failed to check configuration');
    } catch (err: any) {
      setError('Connection error while checking configuration.');
      setIsGenerating(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          negative_prompt: params.negative_prompt,
          num_inference_steps: params.num_inference_steps,
          guidance_scale: params.guidance_scale,
          num_images_per_prompt: 1,
          images: 1
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (Array.isArray(data) && data.length > 0) {
        setGeneratedImage(`data:image/png;base64,${data[0]}`);
      } else if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        // Fallback in case it's wrapped in an object
        setGeneratedImage(`data:image/png;base64,${data.images[0]}`);
      } else {
        throw new Error('No image returned from server');
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'An unexpected error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (backendStatus === 'checking') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-zinc-500 text-sm font-medium animate-pulse">Connecting to Animagine Engine...</p>
        </div>
      </div>
    );
  }

  if (backendStatus === 'unavailable') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900/50 border border-red-500/20 p-12 rounded-[2.5rem] text-center space-y-6 backdrop-blur-xl"
        >
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
            <ServerCrash className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Backend Unavailable</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We couldn't establish a connection with the image generation server. Please check your network or try again later.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `animagine-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight italic">AnimagineIt</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500/80 font-medium">Backend Connected</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8">
        {/* Controls Sidebar */}
        <aside className="space-y-6">
          <section className="space-y-4 bg-zinc-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Tags className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Prompt Tags</h2>
            </div>
            <div className="space-y-2">
              <textarea
                value={params.prompt}
                onChange={(e) => setParams({ ...params, prompt: e.target.value })}
                placeholder="1girl, solo, long hair, blue eyes, school uniform..."
                className="w-full h-40 bg-black/60 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all resize-none placeholder:text-zinc-700 leading-relaxed"
              />
              <p className="text-[10px] text-zinc-500 italic">Separate tags with commas for best results.</p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Negative Prompt</label>
              <textarea
                value={params.negative_prompt}
                onChange={(e) => setParams({ ...params, negative_prompt: e.target.value })}
                className="w-full h-20 bg-black/60 border border-white/10 rounded-2xl p-4 text-xs focus:outline-none focus:border-indigo-500/50 transition-all resize-none placeholder:text-zinc-700"
              />
            </div>
          </section>

          <section className="space-y-6 bg-zinc-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Parameters</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-zinc-400">Aspect Ratio</label>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase">{params.aspect_ratio}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(["1:1", "3:4", "4:3", "9:16", "16:9"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setParams({ ...params, aspect_ratio: ratio })}
                    className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                      params.aspect_ratio === ratio 
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                        : 'bg-black/40 border-white/5 text-zinc-500 hover:border-white/20'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-zinc-400">Guidance Scale</label>
                  <span className="text-xs font-mono text-indigo-400">{params.guidance_scale}</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="15" step="0.5"
                  value={params.guidance_scale}
                  onChange={(e) => setParams({ ...params, guidance_scale: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                  <span>1.0</span>
                  <span>7.5</span>
                  <span>15.0</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-zinc-400">Sampling Steps</label>
                  <span className="text-xs font-mono text-indigo-400">{params.num_inference_steps}</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="40" step="1"
                  value={params.num_inference_steps}
                  onChange={(e) => setParams({ ...params, num_inference_steps: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                  <span>10</span>
                  <span>28</span>
                  <span>40</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/10 active:scale-[0.98] group"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Imagining...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Generate Anime</span>
                </>
              )}
            </button>
          </section>
        </aside>

        {/* Preview Area */}
        <div className="relative min-h-[600px] bg-zinc-900/20 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col items-center justify-center p-8 backdrop-blur-sm">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full" />
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-8 left-8 right-8 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-sm z-10"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </motion.div>
            )}

            {isGenerating ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6 relative z-10"
              >
                <div className="relative">
                  <div className="w-24 h-24 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <Sparkles className="w-8 h-8 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-indigo-300 font-medium tracking-wide">Rendering your vision...</p>
                  <p className="text-zinc-500 text-xs italic">Applying anime aesthetic filters</p>
                </div>
              </motion.div>
            ) : generatedImage ? (
              <motion.div 
                key="image"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group w-full h-full flex items-center justify-center z-10"
              >
                <div className="relative p-2 bg-white/5 rounded-3xl border border-white/10 shadow-2xl">
                  <img 
                    src={generatedImage} 
                    alt="Generated Anime" 
                    className="max-w-full max-h-[75vh] rounded-2xl object-contain"
                  />
                  
                  <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                    <button 
                      onClick={handleDownload}
                      className="p-3 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-xl"
                      title="Download PNG"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      className="p-3 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-zinc-800 transition-all shadow-xl"
                      title="View Details"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-6 relative z-10"
              >
                <div className="w-24 h-24 bg-zinc-800/30 rounded-[2rem] flex items-center justify-center mx-auto border border-white/5 rotate-3 hover:rotate-0 transition-transform duration-500">
                  <ImageIcon className="w-10 h-10 text-zinc-700" />
                </div>
                <div className="space-y-2">
                  <p className="text-zinc-400 font-medium text-lg">Ready to Animagine?</p>
                  <p className="text-zinc-600 text-sm max-w-xs mx-auto">
                    Enter your favorite tags on the left and watch the magic happen.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
                  {['cyberpunk', 'fantasy', 'loli', 'shonen', 'waifu', 'scenery'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-zinc-500 uppercase tracking-widest">
                      #{tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3 text-zinc-500 text-sm">
          <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center">
            <Sparkles className="w-3 h-3" />
          </div>
          <span>AnimagineIt v1.0 • Powered by Backend Engine</span>
        </div>
        <div className="flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
          <span className="hover:text-indigo-400 cursor-pointer transition-colors">Gallery</span>
          <span className="hover:text-indigo-400 cursor-pointer transition-colors">Community</span>
          <span className="hover:text-indigo-400 cursor-pointer transition-colors">API</span>
        </div>
      </footer>

      {/* Configuration Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfigModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              {/* Decorative background */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                  <Key className="w-6 h-6 text-indigo-400" />
                </div>
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-8">
                <h3 className="text-xl font-bold text-white tracking-tight">Configure Modal Token</h3>
                <div className="text-zinc-400 text-sm space-y-3 leading-relaxed">
                  <p>To generate images, you need to link your Modal account:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-1 text-xs text-zinc-500">
                    <li>Create an account at <a href="https://modal.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">modal.com</a></li>
                    <li>Navigate to <span className="text-zinc-300">Settings &gt; API Tokens</span></li>
                    <li>Click <span className="text-zinc-300">"New Token"</span> to generate credentials</li>
                    <li>Copy the command provided (e.g., <code className="text-indigo-300/80 bg-indigo-500/5 px-1 rounded">modal token set ...</code>)</li>
                  </ol>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Token Command</label>
                  <input
                    type="text"
                    value={modalKeyInput}
                    onChange={(e) => setModalKeyInput(e.target.value)}
                    placeholder="modal token set --token-id ak-xxx --token-secret as-xxx"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-800"
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!modalKeyInput.trim()) return;
                    setIsSavingKey(true);
                    try {
                      const res = await fetch('/api/v1/config/modal-key', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ value: modalKeyInput.trim() }),
                      });
                      if (res.ok) {
                        setShowConfigModal(false);
                        handleGenerate();
                      } else {
                        throw new Error('Failed to save token');
                      }
                    } catch (err) {
                      alert('Error saving token. Please ensure the command is correct.');
                    } finally {
                      setIsSavingKey(false);
                    }
                  }}
                  disabled={isSavingKey || !modalKeyInput.trim()}
                  className="w-full py-4 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {isSavingKey ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Connect Account & Generate"
                  )}
                </button>
                
                <p className="text-[10px] text-center text-zinc-600">
                  Paste the entire command starting with <code className="text-zinc-500">modal token set...</code>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
