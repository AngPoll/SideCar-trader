if (!indicators) return null;
import React, { useMemo, useEffect, useState } from 'react';
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine
} from 'recharts';
import { PriceData, Indicators } from '../types';

interface StockChartProps {
  data: (PriceData & { indicators?: Indicators })[];
  symbol: string;
  currentTurboPrice?: number;
  tickCount?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as PriceData & { indicators?: Indicators };
    const ind = data.indicators;
    const dateStr = new Intl.DateTimeFormat('en-US', { 
      timeZone: 'America/New_York', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: false 
    }).format(new Date(data.timestamp));

    return (
      <div className="bg-slate-900/95 border border-cyan-500/30 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[180px] space-y-2">
        <div className="text-[9px] text-slate-500 font-black uppercase border-b border-slate-800 pb-1 mb-1 tracking-widest">
          {dateStr} EST
        </div>
        
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400 font-bold uppercase">Price:</span>
          <span className="mono text-white font-black">${data.close.toFixed(2)}</span>
        </div>

        {ind && (
          <div className="pt-1 space-y-1.5">
            <div className="border-t border-slate-800 pt-1.5 flex flex-col gap-1">
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500 uppercase font-black">RSI:</span>
                <span className={`mono font-black ${ind.rsi > 70 ? 'text-red-400' : ind.rsi < 30 ? 'text-green-400' : 'text-cyan-400'}`}>
                  {ind.rsi.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500 uppercase font-black">MACD Hist:</span>
                <span className={`mono font-black ${ind.macd.histogram >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {ind.macd.histogram.toFixed(3)}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-1.5 flex flex-col gap-1">
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500 uppercase font-black">Stoch K:</span>
                <span className="mono font-black text-cyan-400">{ind.stochRsi.k.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500 uppercase font-black">Stoch D:</span>
                <span className="mono font-black text-slate-400">{ind.stochRsi.d.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-1.5 flex flex-col gap-1 text-[9px]">
              <div className="flex justify-between"><span className="text-slate-500 uppercase font-black">SMA20:</span><span className="mono text-yellow-400">${ind.sma20.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 uppercase font-black">SMA50:</span><span className="mono text-purple-400">${ind.sma50.toFixed(2)}</span></div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const StockChart: React.FC<StockChartProps> = ({ data, symbol, currentTurboPrice, tickCount = 0 }) => {
  const [pulse, setPulse] = useState(false);
  const lastPrice = currentTurboPrice || (data.length > 0 ? data[data.length - 1].close : 0);

  useEffect(() => {
    if (tickCount > 0) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 80);
      return () => clearTimeout(timer);
    }
  }, [tickCount]);

  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Slice history and prepare base data
    const sliced = data.slice(-150).map(d => ({
      ...d,
      displayTime: new Intl.DateTimeFormat('en-US', { 
        timeZone: 'America/New_York', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      }).format(new Date(d.timestamp)),
      sma20: d.indicators?.sma20,
      sma50: d.indicators?.sma50
    }));

    // LIVE INJECTION: If currentTurboPrice is newer than the last historical data point,
    // inject it as the final trailing point so the chart line "moves" in real-time.
    const lastBar = sliced[sliced.length - 1];
    if (currentTurboPrice && lastBar && Date.now() > lastBar.timestamp + 1000) {
      sliced.push({
        ...lastBar,
        timestamp: Date.now(),
        close: currentTurboPrice,
        displayTime: 'NOW',
        sma20: lastBar.indicators?.sma20,
        sma50: lastBar.indicators?.sma50
      } as any);
    }

    return sliced;
  }, [data, currentTurboPrice]);

  const domain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto'];
    const prices = chartData.map(p => p.close);
    const min = Math.min(...prices, lastPrice);
    const max = Math.max(...prices, lastPrice);
    const range = max - min;
    const padding = range === 0 ? min * 0.005 : range * 0.08; 
    return [min - padding, max + padding];
  }, [chartData, lastPrice]);

  return (
    <div className="w-full h-full bg-[#0d1117] flex flex-col p-4 relative overflow-hidden">
      <div className="flex justify-between items-start mb-4 z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="bg-cyan-600 px-2 py-0.5 rounded text-[10px] uppercase font-black text-white">{symbol}</span>
            <span className={`mono text-4xl font-black transition-all duration-75 select-none ${pulse ? 'text-white scale-[1.02] shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'text-cyan-400'}`}>
              ${lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Hydra-Wave Kinetic Engine v11.5</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 60, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="hydraGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3}/>
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} strokeOpacity={0.1} />
            <XAxis dataKey="displayTime" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} minTickGap={40} />
            <YAxis domain={domain} orientation="right" axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }} isAnimationActive={false} />
            <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
            
            <Area 
              type="monotone" 
              dataKey="close" 
              stroke="#06b6d4" 
              fillOpacity={1} 
              fill="url(#hydraGrad)" 
              strokeWidth={3} 
              isAnimationActive={false} 
            />
            <Line type="monotone" dataKey="sma20" stroke="#facc15" dot={false} strokeWidth={1.5} strokeOpacity={0.4} isAnimationActive={false} />
            <Line type="monotone" dataKey="sma50" stroke="#c084fc" dot={false} strokeWidth={1.5} strokeOpacity={0.4} isAnimationActive={false} />
            
            <ReferenceLine 
              y={lastPrice} 
              stroke="#ef4444" 
              strokeWidth={1.5} 
              strokeDasharray="3 3" 
              isAnimationActive={false}
              label={{ position: 'right', value: lastPrice.toFixed(2), fill: '#ef4444', fontSize: 11, fontWeight: 900 }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StockChart;
