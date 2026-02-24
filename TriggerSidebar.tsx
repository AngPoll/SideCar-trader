import React from 'react';
import { Indicators } from '../types';
import { Waves, Zap, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity, BarChart3, Binary, Flame } from 'lucide-react';

interface IndicatorPanelProps {
  indicators: Indicators;
  price: number;
}

const IndicatorPanel: React.FC<IndicatorPanelProps> = (props) => {
  const { indicators, price } = props;

  const getRsiColor = (rsi: number) => {
    if (rsi > 70) return 'text-red-400';
    if (rsi < 30) return 'text-green-400';
    return 'text-slate-200';
  };

  const bbRange = indicators.bollinger.upper - indicators.bollinger.lower;
  const bbRelative = bbRange === 0 ? 50 : ((price - indicators.bollinger.lower) / bbRange) * 100;
  const bbPos = Math.min(100, Math.max(0, bbRelative));

  const isBullishPressure = bbPos > 50;
  
  const pressureRaw = isBullishPressure 
    ? (bbPos - 50) / 50 
    : (50 - bbPos) / 50;
  
  const wavePressure = Math.max(0, pressureRaw * 100);
  const isWarmingUp = wavePressure > 8;
  const isExtreme = wavePressure > 70;

  const bbWidth = indicators.bollinger.middle === 0 ? 0 : bbRange / indicators.bollinger.middle;
  const isSqueezing = bbWidth > 0 && bbWidth < 0.01;
  const isHighVolatility = bbWidth > 0.04; 

  return (
    <div className="flex flex-col gap-4">
      {/* Primary Indicators Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-3 rounded-lg border flex flex-col transition-all duration-300 ${isWarmingUp ? (isBullishPressure ? 'bg-green-600/10 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'bg-red-600/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]') : 'bg-slate-800/40 border-slate-700'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
               <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Whale Pressure</p>
               {isHighVolatility && <Flame className="w-2.5 h-2.5 text-orange-400 animate-pulse" />}
            </div>
            {isBullishPressure ? <ArrowUpRight className={`w-3.5 h-3.5 ${wavePressure > 20 ? 'text-green-400' : 'text-slate-500'}`} /> : <ArrowDownRight className={`w-3.5 h-3.5 ${wavePressure > 20 ? 'text-red-400' : 'text-slate-500'}`} />}
          </div>
          <p className={`text-xl font-black mono transition-colors duration-300 ${isExtreme ? (isBullishPressure ? 'text-green-300 animate-pulse' : 'text-red-300 animate-pulse') : isWarmingUp ? (isBullishPressure ? 'text-green-400' : 'text-red-400') : 'text-slate-400'}`}>
            {isBullishPressure ? '+' : '-'}{wavePressure.toFixed(0)}%
          </p>
          <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${isWarmingUp ? (isBullishPressure ? 'bg-green-400' : 'bg-red-400') : 'bg-slate-600'}`}
              style={{ width: `${wavePressure}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700 flex flex-col">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Momentum Index</p>
          <div className="flex justify-between items-end">
            <p className={`text-xl font-black mono ${getRsiColor(indicators.rsi)}`}>
              {indicators.rsi.toFixed(1)}
            </p>
            <span className="text-[8px] font-black text-slate-600 uppercase mb-1">Vol-Adjusted</span>
          </div>
          <div className="w-full bg-slate-700/50 h-1 rounded-full mt-2 overflow-hidden flex">
            <div className={`h-full ${indicators.rsi > 70 ? 'bg-red-400' : indicators.rsi < 30 ? 'bg-green-400' : 'bg-blue-500/80'}`} style={{ width: `${indicators.rsi}%` }} />
          </div>
        </div>

        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700 flex flex-col">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Trend Matrix</p>
          <div className="space-y-1 mt-1">
            <div className="flex justify-between text-[10px] mono">
              <span className="text-slate-500 uppercase">SMA20</span>
              <span className={price > indicators.sma20 ? 'text-green-400' : 'text-red-400'}>${indicators.sma20.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] mono">
              <span className="text-slate-500 uppercase">SMA50</span>
              <span className={price > indicators.sma50 ? 'text-green-400' : 'text-red-400'}>${indicators.sma50.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className={`p-3 rounded-lg border flex flex-col transition-all duration-300 ${isHighVolatility ? 'bg-orange-600/5 border-orange-500/40 shadow-[inset_0_0_10px_rgba(251,146,60,0.05)]' : isSqueezing ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-slate-800/40 border-slate-700'}`}>
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Kinetic Mode</p>
            {isHighVolatility ? <Zap className="w-3 h-3 text-orange-400 animate-bounce" /> : isSqueezing ? <Zap className="w-3 h-3 text-yellow-400 animate-pulse" /> : null}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-slate-700/40 h-3 rounded relative overflow-hidden">
               <div 
                 className={`absolute top-0 bottom-0 w-1 ${isHighVolatility ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]' : 'bg-white shadow-[0_0_5px_white]'} transition-all duration-500`}
                 style={{ left: `${bbPos}%` }}
               />
            </div>
          </div>
          <p className={`text-[8px] mt-2 font-black uppercase text-center tracking-tighter ${isHighVolatility ? 'text-orange-400' : 'text-slate-600'}`}>
            {isHighVolatility ? '🔥 Whale Expansion' : isSqueezing ? '⚠️ Squeeze' : 'Normal Tape'}
          </p>
        </div>
      </div>

      {/* Advanced Indicators Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MACD Gauge */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 flex flex-col h-32">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Whale Divergence (MACD)</p>
            </div>
            <span className={`text-[10px] font-black mono ${indicators.macd.histogram > 0 ? 'text-green-400' : 'text-red-400'}`}>
              Hist: {indicators.macd.histogram > 0 ? '+' : ''}{indicators.macd.histogram.toFixed(4)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-600 uppercase font-black">MACD (12, 26)</span>
              <span className="text-xs font-bold mono text-blue-300">{indicators.macd.value.toFixed(4)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-600 uppercase font-black">Signal (9)</span>
              <span className="text-xs font-bold mono text-purple-400">{indicators.macd.signal.toFixed(4)}</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center bg-black/20 rounded border border-white/5 relative overflow-hidden px-4">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700/50" />
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${indicators.macd.histogram > 0 ? 'bg-green-500/60 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`} 
              style={{ 
                width: `${Math.min(50, Math.abs(indicators.macd.histogram) * 1000)}%`, 
                marginLeft: indicators.macd.histogram > 0 ? '0' : `-${Math.min(50, Math.abs(indicators.macd.histogram) * 1000)}%`,
                transform: indicators.macd.histogram > 0 ? 'translateX(0)' : 'translateX(0)' 
              }} 
            />
          </div>
        </div>

        {/* Stochastic RSI Gauge */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 flex flex-col h-32">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Binary className="w-3.5 h-3.5 text-cyan-400" />
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Kinetic Stoch RSI</p>
            </div>
            <div className="flex gap-2">
               <span className={`text-[10px] font-black mono ${indicators.stochRsi.k > 80 ? 'text-red-400' : indicators.stochRsi.k < 20 ? 'text-green-400' : 'text-cyan-400'}`}>
                 K:{indicators.stochRsi.k.toFixed(1)}
               </span>
               <span className="text-[10px] font-black mono text-slate-400">
                 D:{indicators.stochRsi.d.toFixed(1)}
               </span>
            </div>
          </div>
          <div className="relative h-12 bg-black/20 rounded-md border border-white/5 overflow-hidden mt-1">
            <div className="absolute top-0 left-0 right-0 h-1/4 bg-red-500/5 border-b border-red-500/10" />
            <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-green-500/5 border-t border-green-500/10" />
            
            <div className="absolute top-0 bottom-0 left-[20%] w-px bg-slate-700/30" />
            <div className="absolute top-0 bottom-0 left-[80%] w-px bg-slate-700/30" />
            
            <div 
              className="absolute h-full w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-700 z-10"
              style={{ left: `${indicators.stochRsi.k}%` }}
            />
            <div 
              className="absolute h-full w-0.5 bg-white/40 transition-all duration-1000 z-0"
              style={{ left: `${indicators.stochRsi.d}%` }}
            />

            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none opacity-30">
               <span className="text-[7px] font-black text-slate-500">OS</span>
               <span className="text-[7px] font-black text-slate-500">50</span>
               <span className="text-[7px] font-black text-slate-500">OB</span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-auto">
             <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Speed Oscillator (14, 14, 3, 3)</span>
             <span className={`text-[8px] font-bold italic ${indicators.stochRsi.k > 80 ? 'text-red-400' : indicators.stochRsi.k < 20 ? 'text-green-400' : 'text-slate-400'}`}>
               {indicators.stochRsi.k > 80 ? 'Overbought' : indicators.stochRsi.k < 20 ? 'Oversold' : 'Neutral'}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorPanel;
