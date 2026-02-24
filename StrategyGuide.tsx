
import React from 'react';
import { Trigger, SignalType, PerformanceMetrics } from '../types';
import { 
  TrendingUp, TrendingDown, Clock, ShieldAlert, ShieldCheck, 
  Shield, Trophy, Waves, Zap as Bolt, Activity, Activity as PulseIcon, ArrowUpRight, ArrowDownRight,
  Loader2, CheckCircle2, XCircle, AlertTriangle, Info, BrainCircuit, Target, Zap, BarChart4
} from 'lucide-react';

interface TriggerSidebarProps {
  triggers: Trigger[];
  metrics: PerformanceMetrics;
  currentPrice?: number;
}

const formatESTTrigger = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(timestamp));
};

const TriggerSidebar: React.FC<TriggerSidebarProps> = ({ triggers, metrics, currentPrice }) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Performance Scorecard Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2 text-slate-100 text-[11px] uppercase tracking-tighter">
            <BrainCircuit className="w-4 h-4 text-cyan-400" />
            Hydra Core Logic
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[8px] font-black uppercase text-slate-400">Tactical v11.5</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/40 border border-white/5 p-2 rounded-lg flex flex-col items-center">
            <span className="text-[8px] text-slate-500 font-black uppercase mb-1">Efficiency Score</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-black mono ${metrics.score >= 70 ? 'text-green-400' : metrics.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {metrics.score}%
              </span>
              <BarChart4 className="w-3 h-3 text-slate-600" />
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 p-2 rounded-lg flex flex-col items-center">
            <span className="text-[8px] text-slate-500 font-black uppercase mb-1">Win/Loss Ratio</span>
            <div className="flex items-baseline gap-1 text-slate-300 mono font-black text-sm">
              <span className="text-green-400">{metrics.wins}</span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-red-400">{metrics.losses}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-[#0f172a]/30">
        {triggers.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center opacity-20 text-center px-10">
            <Waves className="w-10 h-10 mb-3 animate-pulse text-cyan-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
              Scanning Market Geometry...<br/>Institutional Bias: CALIBRATING
            </p>
          </div>
        ) : (
          triggers.map((trigger) => {
            const isBuy = trigger.type === 'BUY';
            const isSuccess = trigger.status === 'SUCCESS';
            const isFailed = trigger.status === 'FAILED';
            const isPending = trigger.status === 'PENDING';
            
            const decayColor = isBuy ? 'bg-green-400' : 'bg-red-400';
            const isNearExit = (trigger.decay || 0) < 0.25;
            
            // AI Audit Styling
            const isAuditing = !trigger.isAiAudited;
            const isStrike = trigger.aiVerdict === 'STRIKE NOW';
            const isWait = trigger.aiVerdict === 'WAIT';
            const isDiscard = trigger.aiVerdict === 'DISREGARD';

            return (
              <div 
                key={trigger.id} 
                className={`p-3 rounded-lg border-l-4 border-y border-r transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${
                  isBuy ? 'border-l-green-500' : 'border-l-red-500'
                } ${
                  isSuccess ? 'bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 
                  isFailed ? 'bg-red-500/10 border-red-500/30 grayscale-[0.5]' : 
                  'bg-slate-900/40 border-slate-800'
                } ${isStrike && isPending ? 'ring-1 ring-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : ''}`}
              >
                {isPending && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800/50">
                    <div className={`h-full transition-all duration-1000 ${decayColor}`} style={{ width: `${(trigger.decay || 0) * 100}%` }} />
                  </div>
                )}

                <div className="flex justify-between items-start mb-2 pt-1.5">
                  <div className="flex items-center gap-2">
                    {isBuy ? <ArrowUpRight className="w-4 h-4 text-green-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                    <span className={`font-black text-[12px] uppercase ${isBuy ? 'text-green-400' : 'text-red-400'}`}>{trigger.symbol}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[7px] text-slate-500 mono font-black italic">{formatESTTrigger(trigger.timestamp)}</span>
                    {isSuccess && (
                      <div className="flex items-center gap-1 mt-1 bg-green-500/20 px-1.5 rounded text-green-400 border border-green-500/30">
                        <Trophy className="w-2.5 h-2.5" />
                        <span className="text-[8px] font-black uppercase">Win</span>
                      </div>
                    )}
                    {isFailed && (
                      <div className="flex items-center gap-1 mt-1 bg-red-500/20 px-1.5 rounded text-red-400 border border-red-500/30">
                        <XCircle className="w-2.5 h-2.5" />
                        <span className="text-[8px] font-black uppercase">Loss</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI AUDIT STATUS AREA */}
                {isPending && (
                  <div className="mb-3">
                    {isAuditing ? (
                      <div className="flex items-center gap-2 bg-slate-800/40 py-1 px-2 rounded border border-slate-700/50">
                        <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Neural Auditing...</span>
                      </div>
                    ) : isStrike ? (
                      <div className="flex items-center gap-2 bg-cyan-900/30 py-1.5 px-2 rounded border border-cyan-500/30 animate-pulse">
                        <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                        <span className="text-[9px] font-black uppercase text-cyan-400 tracking-widest">STRIKE NOW: TREND ALIGNED</span>
                      </div>
                    ) : isWait ? (
                      <div className="flex items-center gap-2 bg-yellow-900/20 py-1.5 px-2 rounded border border-yellow-500/30">
                        <Clock className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-[9px] font-black uppercase text-yellow-500 tracking-widest">CAUTION: VOLATILE STANDBY</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-red-900/10 py-1.5 px-2 rounded border border-red-500/20">
                        <XCircle className="w-3.5 h-3.5 text-red-500/50" />
                        <span className="text-[9px] font-black uppercase text-red-500/50 tracking-widest">DISCARDED: OVEREXTENDED</span>
                      </div>
                    )}
                  </div>
                )}

                {/* AI REASONING / INSIGHT BOX */}
                {trigger.isAiAudited && trigger.aiReasoning && isPending && (
                  <div className={`mb-3 p-2 rounded text-[10px] leading-relaxed border ${
                    isStrike ? 'bg-cyan-500/5 border-cyan-500/20 text-slate-200' : 
                    isWait ? 'bg-yellow-500/5 border-yellow-500/20 text-slate-300' : 
                    'bg-slate-800/20 border-slate-700/50 text-slate-500 line-through'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1 opacity-70">
                       <Info className="w-3 h-3" />
                       <span className="text-[8px] font-black uppercase tracking-tighter">AI Neural Insight</span>
                    </div>
                    {trigger.aiReasoning.length > 120 ? trigger.aiReasoning.substring(0, 120) + '...' : trigger.aiReasoning}
                  </div>
                )}

                <p className={`text-[10px] font-black mb-2 leading-tight uppercase tracking-tight ${isDiscard && isPending ? 'text-slate-600 line-through' : 'text-white'}`}>
                  {trigger.reason}
                </p>

                <div className={`grid grid-cols-3 gap-1 p-2 rounded-md border mb-3 shadow-inner ${
                  isSuccess ? 'bg-green-500/5 border-green-500/20' : 
                  isFailed ? 'bg-red-500/5 border-red-500/20' : 
                  'bg-black/40 border-white/5'
                }`}>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-500 font-black uppercase">Alpha</span>
                    <span className="mono text-[11px] font-black text-white">${trigger.price.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col border-l border-white/10 pl-2">
                    <span className="text-[7px] text-slate-400 font-black uppercase">Goal</span>
                    <span className={`mono text-[11px] font-black ${isSuccess ? 'text-green-400' : 'text-cyan-400'}`}>${trigger.targetPrice?.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col border-l border-white/10 pl-2">
                    <span className="text-[7px] text-slate-500 font-black uppercase">Risk</span>
                    <span className={`mono text-[11px] font-black ${isFailed ? 'text-red-400' : 'text-red-500/50'}`}>${trigger.stopLoss?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                  <div className={`flex items-center gap-1.5 ${isPending && isNearExit ? 'text-yellow-500 animate-pulse' : isSuccess ? 'text-green-500' : isFailed ? 'text-red-500' : 'text-slate-500'}`}>
                    {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : isFailed ? <XCircle className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                    <span>{isSuccess ? 'TARGET HIT' : isFailed ? 'STOP TRIGGERED' : isNearExit ? 'EXHAUSTION' : 'HYDRA-ACTIVE'}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(b => (
                      <div key={b} className={`w-1 h-2 rounded-full ${b <= (trigger.strength === 'STRONG' ? 3 : 2) ? (isBuy ? 'bg-green-400' : 'bg-red-400') : 'bg-slate-800'}`} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TriggerSidebar;
