
import React from 'react';
import { BookOpen, Shield, Zap, CheckCircle2, X, Target, Cpu } from 'lucide-react';

interface StrategyGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const StrategyGuide: React.FC<StrategyGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Tactical Strategy Guide</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Standard Operating Procedures</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          {/* Sidecar Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <Zap className="w-5 h-5 fill-current" />
              <h3 className="text-lg font-bold uppercase tracking-tight">The Sidecar Strategy (The Sentry)</h3>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                <span className="text-blue-400 font-bold">Purpose:</span> Mathematical Detection & Entry Timing. This system scans for statistical extremes in <span className="text-white font-bold">Real-Time (WebSocket)</span>.
              </p>
              <div className="bg-black/30 p-3 rounded-lg border border-blue-500/20 text-[11px] mb-2">
                <span className="block font-bold text-blue-400 mb-1 uppercase tracking-widest">SOP: Engine Syncing</span>
                If switching assets rapidly, use the <span className="text-white font-bold">"Re-Sync Engine"</span> button. This clears the cache, re-fetches historical data (REST), and restarts the WS stream for zero-latency accuracy.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="block font-bold text-blue-400 mb-1 uppercase tracking-tighter">Buy Setup</span>
                  RSI &lt; 30 + Piercing Lower Bollinger Band. Target: Middle Band.
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="block font-bold text-red-400 mb-1 uppercase tracking-tighter">Sell Setup</span>
                  RSI &gt; 70 + Piercing Upper Bollinger Band. Target: Middle Band.
                </div>
              </div>
            </div>
          </section>

          {/* AI Strategy Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <Cpu className="w-5 h-5" />
              <h3 className="text-lg font-bold uppercase tracking-tight">The AI Scalp Strategy (The General)</h3>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                <span className="text-purple-400 font-bold">Purpose:</span> Validation & Trade Management. Gemini reviews the macro trend to filter out "math traps."
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-3 bg-black/30 p-3 rounded-lg border border-white/5">
                  <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-200">Institutional Bias:</span> Checks position relative to the <span className="text-yellow-400 mono">SMA 50</span>. AI avoids counter-trend scalps unless conviction is ultra-high.
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-black/30 p-3 rounded-lg border border-white/5">
                  <Target className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-200">Refined Targets:</span> Adjusts the raw math based on current volatility (Bollinger Width) to provide precise exits.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Golden Setup Section */}
          <section className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-500 p-1 rounded">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">The Golden Setup (Full Alignment)</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400">1</div>
                <span className="text-slate-200"><span className="font-bold text-white">Sidecar Trigger</span> appears in sidebar</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400">2</div>
                <span className="text-slate-200">Badge shows <span className="text-green-400 font-bold">"TREND ALIGNED"</span> (Price matches SMA50 bias)</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400">3</div>
                <span className="text-slate-200">AI Score is <span className="text-green-400 font-bold">&gt; 80%</span></span>
              </div>
            </div>
          </section>
        </div>
        
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 text-center">
           <button 
             onClick={onClose}
             className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all uppercase tracking-widest"
           >
             Acknowledge & Close
           </button>
        </div>
      </div>
    </div>
  );
};

export default StrategyGuide;
// --- Added for App.tsx compatibility ---
export function getIndicators(priceSeries: Array<{ t: number; close: number }>) {
  const closes = (priceSeries ?? []).map(p => p.close).filter(n => typeof n === "number");
  const lastClose = closes.length ? closes[closes.length - 1] : 0;

  // Minimal safe defaults so UI won't crash
  return {
    bollinger: {
      upper: null,
      middle: null,
      lower: null
    },
    rsi: null,
    macd: null,
    sma: null,
    ema: null,
    lastClose
  };
}
// --- Added for App.tsx compatibility ---
// Minimal implementations so the build succeeds.
// Replace with your real logic later.

export async function fetchInitialData(symbol: string) {
  // Return an empty “safe” structure
  return {
    symbol,
    prices: [] as Array<{ t: number; close: number }>,
    info: null
  };
}

export async function fetchRealtimePrice(symbol: string) {
  // No realtime source yet; return null
  return null as unknown as number | null;
}

export function getUsageRPM() {
  // Requests per minute (placeholder)
  return 0;
}

export function canRequest() {
  // Always allow (placeholder)
  return true;
}
