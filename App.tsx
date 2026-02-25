import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Search, Zap, Loader2, Menu, Activity, Terminal, Wifi, WifiOff, RefreshCw, 
  Trash2, BookOpen, Power, Play, ChevronRight, ChevronLeft, X, Clock, History, 
  Volume2, VolumeX, Key, AlertCircle, Timer, Gauge, Activity as PulseIcon, 
  Waves as WaveIcon, TrendingUp, TrendingDown, Target, Zap as Bolt, XCircle, PauseCircle, PlayCircle,
  Cpu, Link as LinkIcon
} from 'lucide-react';
import { PriceData, Trigger, TickerInfo, ConnectionStatus, StockState, SignalType, PerformanceMetrics } from './types';
import { fetchInitialData, getIndicators, fetchRealtimePrice, getUsageRPM, canRequest } from './finance';
import { realtimeManager, simplifySymbol, normalizeForTwelveData } from './realtime';
import { getTradingAdvice } from './services/gemini';
import StockChart from './components/StockChart';
import IndicatorPanel from './components/IndicatorPanel';
import TriggerSidebar from './components/TriggerSidebar';
import StrategyGuide from './components/StrategyGuide';

const VAULT_KEY = 'sidecar_trader_v115_hydra_plus';
const PERFORMANCE_KEY = 'hydra_perf_v1';
const PROFIT_TARGET_PERCENT = 1.0; 
const STOP_LOSS_PERCENT = 0.4; 

const BUY_PING = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
const SELL_PING = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

interface MarketState {
  symbol: string;
  price: number;
  history: PriceData[];
  lastUpdate: number;
  source: 'WS' | 'REST';
  pulse: boolean;
  isLoadingHistory: boolean;
  tickCount: number; 
}

const getMarketStatus = (symbol: string) => {
  const s = symbol.toUpperCase();
  if (s.includes('/') || s.includes('BTC') || s.includes('ETH')) return { isOpen: true, status: 'OPEN', message: 'Crypto 24/7' };
  const now = new Date();
  const est = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short' }).formatToParts(now);
  const hour = parseInt(est.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(est.find(p => p.type === 'minute')?.value || '0');
  const day = est.find(p => p.type === 'weekday')?.value;
  const total = hour * 60 + minute;
  if (day === 'Sat' || day === 'Sun') return { isOpen: false, status: 'CLOSED', message: 'Market Closed' };
  if (total < 240) return { isOpen: false, status: 'CLOSED', message: 'Pre-Session' };
  if (total < 570) return { isOpen: true, status: 'PRE', message: 'Pre-Market' };
  if (total < 960) return { isOpen: true, status: 'OPEN', message: 'Regular Session' };
  if (total < 1200) return { isOpen: true, status: 'POST', message: 'After-Hours' };
  return { isOpen: false, status: 'CLOSED', message: 'Market Closed' };
};

const DEFAULT_TICKERS: TickerInfo[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin', price: 0, change: 0, changePercent: 0, isPaused: false },
  { symbol: 'ETH/USD', name: 'Ethereum', price: 0, change: 0, changePercent: 0, isPaused: false },
  { symbol: 'APP', name: 'AppLovin', price: 0, change: 0, changePercent: 0, isPaused: false },
  { symbol: 'APLD', name: 'Applied Digital', price: 0, change: 0, changePercent: 0, isPaused: false }
];

const App: React.FC = () => {
  const [activeTickers, setActiveTickers] = useState<TickerInfo[]>(() => {
    try {
      const saved = localStorage.getItem(VAULT_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_TICKERS;
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics>(() => {
    try {
      const saved = localStorage.getItem(PERFORMANCE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { total: 0, wins: 0, losses: 0, score: 0 };
  });

  const [isAiLinked, setIsAiLinked] = useState<boolean>(false);

  useEffect(() => {
    const checkAiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsAiLinked(hasKey);
      }
    };
    checkAiKey();
    const interval = setInterval(checkAiKey, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectAi = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsAiLinked(true); // Assume success per SDK guidance to avoid race condition
    }
  };

  const activeTickersRef = useRef(activeTickers);
  useEffect(() => { activeTickersRef.current = activeTickers; }, [activeTickers]);

  const [tickerPrices, setTickerPrices] = useState<Record<string, number>>({});
  const [tickerUpdateTimes, setTickerUpdateTimes] = useState<Record<string, number>>({});
  const [tickerBeats, setTickerBeats] = useState<Record<string, 'UP' | 'DOWN' | 'NEUTRAL'>>({});

  const [selectedSymbol, setSelectedSymbol] = useState(activeTickers[0]?.symbol || 'BTC/USD');
  const [marketData, setMarketData] = useState<MarketState>({
    symbol: activeTickers[0]?.symbol || 'BTC/USD', 
    price: 0, 
    history: [], 
    lastUpdate: Date.now(), 
    source: 'WS', 
    pulse: false, 
    isLoadingHistory: true,
    tickCount: 0
  });

  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const triggersRef = useRef<Trigger[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<Record<string, string>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [msSinceLastTick, setMsSinceLastTick] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTickerSidebar, setShowTickerSidebar] = useState(true);
  const [alertFlash, setAlertFlash] = useState<'BUY' | 'SELL' | null>(null);

  const buyAudioRef = useRef<HTMLAudioElement | null>(null);
  const sellAudioRef = useRef<HTMLAudioElement | null>(null);
  const sentryBuffersRef = useRef<Record<string, PriceData[]>>({});
  const lastTriggerTimeRef = useRef<Record<string, number>>({});
  const selectedSymbolRef = useRef(selectedSymbol);
  const impulseBufferRef = useRef<Record<string, { price: number, time: number }[]>>({});
  const pendingPollsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    buyAudioRef.current = new Audio(BUY_PING);
    sellAudioRef.current = new Audio(SELL_PING);
    if (buyAudioRef.current) buyAudioRef.current.volume = 0.5;
    if (sellAudioRef.current) sellAudioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
    impulseBufferRef.current[selectedSymbol] = [];
    setAiAdvice(prev => ({ ...prev, [selectedSymbol]: 'Hydra Kinetic Monitoring...' }));
  }, [selectedSymbol]);

  useEffect(() => {
    localStorage.setItem(VAULT_KEY, JSON.stringify(activeTickers));
    activeTickers.forEach(t => {
      if (!t.isPaused) realtimeManager.subscribe(t.symbol);
      else realtimeManager.unsubscribe(t.symbol);
    });
  }, [activeTickers]);

  useEffect(() => {
    localStorage.setItem(PERFORMANCE_KEY, JSON.stringify(metrics));
  }, [metrics]);

  const playDirectionalPing = useCallback((type: SignalType) => {
    if (isMuted || type === 'NEUTRAL') return;
    const sound = type === 'BUY' ? buyAudioRef.current : sellAudioRef.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }, [isMuted]);

  const updatePerformance = useCallback((win: boolean) => {
    setMetrics(prev => {
      const newWins = prev.wins + (win ? 1 : 0);
      const newLosses = prev.losses + (win ? 0 : 1);
      const newTotal = newWins + newLosses;
      const newScore = newTotal > 0 ? Math.round((newWins / newTotal) * 100) : 0;
      return { total: newTotal, wins: newWins, losses: newLosses, score: newScore };
    });
  }, []);

  const checkForSignals = useCallback(async (tick: PriceData, symbol: string) => {
    const now = Date.now();
    const lastTrigger = lastTriggerTimeRef.current[symbol] || 0;
    if (now - lastTrigger < 5000) return; 

    const history = sentryBuffersRef.current[symbol] || [];
    const microBuffer = impulseBufferRef.current[symbol] || [];
    
    microBuffer.push({ price: tick.close, time: now });
    const activeMicro = microBuffer.filter(b => b.time >= now - 5000).slice(-20);
    impulseBufferRef.current[symbol] = activeMicro;

    if (activeMicro.length < 5) return; 

    const oldestTick = activeMicro[0];
    const priceDiff = tick.close - oldestTick.price;
    const currentVelocity = (priceDiff / oldestTick.price) * 100;

    const isSignificantVelocity = Math.abs(currentVelocity) > 0.015; 
    const last3 = activeMicro.slice(-3);
    const isDirectional = last3.every((t, i) => i === 0 || (currentVelocity > 0 ? t.price >= last3[i-1].price : t.price <= last3[i-1].price));

    const ind = tick.indicators || getIndicators(history);
    const isRsiValid = currentVelocity > 0 ? ind.rsi < 65 : ind.rsi > 35;

    if (isSignificantVelocity && isDirectional && isRsiValid) {
      const isUp = currentVelocity > 0;
      const stopLossFactor = STOP_LOSS_PERCENT / 100;
      
      const newTrigger: Trigger = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: now,
        symbol,
        type: isUp ? 'BUY' : 'SELL',
        price: tick.close,
        status: 'PENDING',
        potentialGain: PROFIT_TARGET_PERCENT,
        targetPrice: isUp ? tick.close * (1 + (PROFIT_TARGET_PERCENT / 100)) : tick.close * (1 - (PROFIT_TARGET_PERCENT / 100)),
        stopLoss: isUp ? tick.close * (1 - stopLossFactor) : tick.close * (1 + stopLossFactor),
        reason: Math.abs(currentVelocity) > 0.04 ? 'MOMENTUM BURST' : 'POTENTIAL 1% STRIKE',
        strength: Math.abs(currentVelocity) > 0.05 ? 'STRONG' : 'MODERATE',
        decay: 1.0,
        velocityAtEntry: currentVelocity,
        isAiAudited: false
      };
      
      lastTriggerTimeRef.current[symbol] = now;
      triggersRef.current = [newTrigger, ...triggersRef.current].slice(0, 80); 
      setTriggers([...triggersRef.current]);
      
      setIsAiLoading(true);
      const advice = await getTradingAdvice(symbol, { ...tick, indicators: ind } as StockState, [newTrigger]);
      
      const isApproved = advice.includes('STRIKE NOW');
      const aiVerdict: Trigger['aiVerdict'] = isApproved ? 'STRIKE NOW' : (advice.includes('WAIT') ? 'WAIT' : 'DISREGARD');
      const probMatch = advice.match(/(\d+)%/);
      const aiProbability = probMatch ? parseInt(probMatch[1]) : undefined;

      let aiReasoning = advice;
      const tacticalIndex = advice.indexOf('### 🔍 TACTICAL COLOR');
      if (tacticalIndex !== -1) {
        aiReasoning = advice.substring(tacticalIndex).replace('### 🔍 TACTICAL COLOR', '').trim();
      }

      triggersRef.current = triggersRef.current.map(t => {
        if (t.id === newTrigger.id) {
          return { ...t, isAiAudited: true, aiVerdict, aiProbability, aiReasoning };
        }
        return t;
      });
      setTriggers([...triggersRef.current]);
      setAiAdvice(prev => ({ ...prev, [symbol]: advice }));
      setIsAiLoading(false);

      if (isApproved) {
        playDirectionalPing(newTrigger.type);
        if (symbol === selectedSymbolRef.current) {
          setAlertFlash(newTrigger.type);
          setTimeout(() => setAlertFlash(null), 400);
        }
      }
    }
  }, [isMuted, playDirectionalPing]);

  const processTick = useCallback((tick: PriceData, symbol: string, source: 'WS' | 'REST' = 'WS') => {
    const ticker = activeTickersRef.current.find(t => normalizeForTwelveData(t.symbol) === normalizeForTwelveData(symbol));
    if (ticker?.isPaused) return;

    const sId = simplifySymbol(symbol);
    const s = selectedSymbolRef.current;
    const isCurrentlySelected = sId === simplifySymbol(s);
    const now = Date.now();
    
    setTickerUpdateTimes(prev => ({ ...prev, [sId]: now }));
    
    setTickerPrices(prev => {
        const lastPrice = prev[sId] || 0;
        if (lastPrice !== 0 && tick.close !== lastPrice) {
            setTickerBeats(b => ({ ...b, [sId]: tick.close > lastPrice ? 'UP' : 'DOWN' }));
        }
        return { ...prev, [sId]: tick.close };
    });

    triggersRef.current = triggersRef.current.map(t => {
      if (t.status !== 'PENDING') return t;
      const ageMs = now - t.timestamp;
      const newDecay = Math.max(0, 1 - (ageMs / 300000)); 
      let newStatus: Trigger['status'] = t.status;
      if (simplifySymbol(t.symbol) === sId) {
        if (t.type === 'BUY') {
          if (tick.close >= t.targetPrice!) {
            newStatus = 'SUCCESS';
            updatePerformance(true);
          }
          else if (tick.close <= t.stopLoss!) {
            newStatus = 'FAILED';
            updatePerformance(false);
          }
        } else if (t.type === 'SELL') {
          if (tick.close <= t.targetPrice!) {
            newStatus = 'SUCCESS';
            updatePerformance(true);
          }
          else if (tick.close >= t.stopLoss!) {
            newStatus = 'FAILED';
            updatePerformance(false);
          }
        }
      }
      return { ...t, status: newStatus, decay: newDecay };
    });
    setTriggers([...triggersRef.current]);

    const currentBuffer = sentryBuffersRef.current[symbol] || [];
    const lastItem = currentBuffer[currentBuffer.length - 1];
    const ind = getIndicators([...currentBuffer, tick]);
    const tickWithIndicators = { ...tick, indicators: ind };

    if (lastItem && Math.floor(lastItem.timestamp/60000) === Math.floor(tick.timestamp/60000)) {
      currentBuffer[currentBuffer.length-1] = { 
        ...tickWithIndicators,
        timestamp: lastItem.timestamp,
        high: Math.max(lastItem.high, tick.close), 
        low: Math.min(lastItem.low, tick.close) 
      };
    } else {
      currentBuffer.push(tickWithIndicators);
    }
    sentryBuffersRef.current[symbol] = currentBuffer.slice(-600);

    checkForSignals(tickWithIndicators, symbol);

    if (isCurrentlySelected) {
      setMarketData(prev => ({ 
        ...prev, 
        symbol: s, 
        price: tick.close, 
        history: sentryBuffersRef.current[s], 
        lastUpdate: now, 
        source, 
        pulse: true, 
        isLoadingHistory: false,
        tickCount: prev.tickCount + 1
      }));
      setTimeout(() => setMarketData(prev => ({ ...prev, pulse: false })), 50);
    }
  }, [checkForSignals, updatePerformance]);

  const handleSync = useCallback(async (manual: boolean = false) => {
    const s = selectedSymbol; 
    if (manual) setIsSyncing(true);
    
    try {
      setMarketData(prev => ({ 
        ...prev, 
        symbol: s,
        isLoadingHistory: true,
        history: prev.symbol === s ? prev.history : [] 
      }));
      
      const data = await fetchInitialData(s, '1D', true);
      
      if (selectedSymbolRef.current === s) {
        if (data && data.length > 0) {
          const enrichedHistory: PriceData[] = [];
          for (let i = 0; i < data.length; i++) {
            const slice = data.slice(0, i + 1);
            enrichedHistory.push({ ...data[i], indicators: getIndicators(slice) });
          }
          const existingTicks = (sentryBuffersRef.current[s] || []).filter(t => t.timestamp > enrichedHistory[enrichedHistory.length-1].timestamp);
          const finalHistory = [...enrichedHistory, ...existingTicks];
          
          sentryBuffersRef.current[s] = finalHistory;
          setMarketData(prev => ({ 
            ...prev, 
            history: finalHistory.slice(-500), 
            isLoadingHistory: false, 
            price: finalHistory[finalHistory.length - 1].close,
            tickCount: prev.tickCount + 1
          }));
        } else {
          setMarketData(prev => ({ ...prev, isLoadingHistory: false }));
        }
      }
    } catch (e) {
      setMarketData(prev => ({ ...prev, isLoadingHistory: false }));
    } finally {
      if (manual) setIsSyncing(false);
    }
  }, [selectedSymbol]);

  useEffect(() => { handleSync(); }, [handleSync]);

  useEffect(() => {
    realtimeManager.connect(setConnectionStatus as any);
    const cleanup = realtimeManager.onTick((tick, sym) => processTick(tick, sym, 'WS'));
    
    const scanner = setInterval(() => {
      const now = Date.now();
      const sId = selectedSymbolRef.current;
      const sIdSimple = simplifySymbol(sId);
      const lastSelectedUpdate = tickerUpdateTimes[sIdSimple] || 0;
      setMsSinceLastTick(now - lastSelectedUpdate);

      const isWsLagging = (now - lastSelectedUpdate) >= 1400;
      const isWsStale = connectionStatus === 'STALE';

      if (!pendingPollsRef.current.has(sId)) {
        if ((isWsLagging || isWsStale) && getMarketStatus(sId).isOpen && canRequest(false)) {
            pendingPollsRef.current.add(sId);
            fetchRealtimePrice(sId).then(r => {
                pendingPollsRef.current.delete(sId);
                if (r && r.price > 0) processTick({ timestamp: Date.now(), open: r.price, high: r.price, low: r.price, close: r.price, volume: 0 }, sId, 'REST');
            }).catch(() => pendingPollsRef.current.delete(sId));
        }
      }

      if (getUsageRPM() < 15) {
        const inactive = activeTickersRef.current.filter(t => !t.isPaused && simplifySymbol(t.symbol) !== sIdSimple);
        const oldest = inactive
          .map(t => ({ symbol: t.symbol, elapsed: now - (tickerUpdateTimes[simplifySymbol(t.symbol)] || 0) }))
          .filter(e => e.elapsed >= 90000 && !pendingPollsRef.current.has(e.symbol))
          .sort((a, b) => b.elapsed - a.elapsed)[0];

        if (oldest && canRequest(false)) {
          pendingPollsRef.current.add(oldest.symbol);
          fetchRealtimePrice(oldest.symbol).then(r => {
            pendingPollsRef.current.delete(oldest.symbol);
            if (r && r.price > 0) processTick({ timestamp: Date.now(), open: r.price, high: r.price, low: r.price, close: r.price, volume: 0 }, oldest.symbol, 'REST');
          }).catch(() => pendingPollsRef.current.delete(oldest.symbol));
        }
      }
    }, 400); 

    return () => { cleanup(); clearInterval(scanner); realtimeManager.disconnect(); };
  }, [processTick, connectionStatus]);

const indicators = useMemo(() => {
  if (marketData.history.length === 0) return null;
  const last = marketData.history[marketData.history.length - 1];
  return last.indicators ?? getIndicators(marketData.history);
}, [marketData.history]);
  const mkt = getMarketStatus(selectedSymbol);

  const handleDeleteTicker = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = activeTickers.filter(t => simplifySymbol(t.symbol) !== simplifySymbol(symbol));
    setActiveTickers(filtered);
    realtimeManager.unsubscribe(symbol);
  };

  const handleTogglePause = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTickers(prev => prev.map(t => simplifySymbol(t.symbol) === simplifySymbol(symbol) ? { ...t, isPaused: !t.isPaused } : t));
  };

  const handleAddTicker = () => {
    const s = normalizeForTwelveData(searchQuery.trim());
    if (!s) return;
    if (!activeTickers.find(t => simplifySymbol(t.symbol) === simplifySymbol(s))) {
      setActiveTickers(prev => [...prev, { symbol: s, name: s, price: 0, change: 0, changePercent: 0, isPaused: false }]);
      realtimeManager.subscribe(s);
    }
    setSearchQuery('');
  };

  const statusConfig = useMemo(() => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return { color: 'bg-green-500', shadow: 'shadow-[0_0_10px_rgba(34,197,94,0.6)]', text: 'text-green-400' };
      case 'CONNECTING':
        return { color: 'bg-yellow-500', shadow: 'shadow-[0_0_10px_rgba(234,179,8,0.6)]', text: 'text-yellow-400' };
      case 'STALE':
      case 'DISCONNECTED':
      case 'ERROR':
      default:
        return { color: 'bg-red-500', shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.6)]', text: 'text-red-400' };
    }
  }, [connectionStatus]);

  return (
    <div className={`flex h-screen w-full bg-[#0b0f19] text-slate-200 overflow-hidden font-inter select-none transition-all duration-300 ${alertFlash === 'BUY' ? 'ring-[8px] ring-green-500/40 shadow-[0_0_100px_rgba(34,197,94,0.4)]' : alertFlash === 'SELL' ? 'ring-[8px] ring-red-500/40 shadow-[0_0_100px_rgba(239,68,68,0.4)]' : ''}`}>
      <aside className={`bg-[#0f172a] border-r border-slate-800 flex flex-col transition-all duration-300 z-[60] ${showTickerSidebar ? 'w-64' : 'w-16'}`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <WaveIcon className="w-5 h-5 text-cyan-400" />
            {showTickerSidebar && <h1 className="font-black text-sm uppercase text-white tracking-tighter">Hydra v11.5</h1>}
          </div>
          <button onClick={() => setShowTickerSidebar(!showTickerSidebar)} className="p-1 hover:bg-slate-800 rounded transition-colors"><ChevronLeft className={`w-4 h-4 transition-transform ${!showTickerSidebar ? 'rotate-180' : ''}`} /></button>
        </div>
        {showTickerSidebar && (
          <div className="p-3"><input type="text" placeholder="Add Symbol..." className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-[10px] focus:outline-none focus:border-cyan-500 uppercase font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTicker()} /></div>
        )}
        <nav className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
          {activeTickers.map((t) => {
            const sid = simplifySymbol(t.symbol);
            const livePrice = tickerPrices[sid] || 0;
            const lastUpd = tickerUpdateTimes[sid] || 0;
            const isTicking = lastUpd > 0 && (Date.now() - lastUpd) < 8000;
            const beat = tickerBeats[sid];

            return (
              <div key={t.symbol} className="group relative mb-1">
                <button 
                  onClick={() => setSelectedSymbol(normalizeForTwelveData(t.symbol))} 
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left uppercase font-bold text-[10px] ${simplifySymbol(selectedSymbol) === sid ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800'} ${t.isPaused ? 'opacity-40 grayscale' : ''}`}
                >
                  <div className="flex flex-col truncate">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full transition-all duration-75 ${t.isPaused ? 'bg-slate-600' : (!isTicking ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : (beat === 'UP' ? 'bg-green-400 scale-125 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-red-400 scale-125 shadow-[0_0_8px_rgba(248,113,113,0.8)]'))}`} />
                      <span>{t.symbol}</span>
                    </div>
                    {showTickerSidebar && <span className="text-[8px] mono font-black opacity-80">${t.isPaused ? 'PAUSED' : (livePrice > 0 ? livePrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '---.--')}</span>}
                  </div>
                </button>
                {showTickerSidebar && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleTogglePause(t.symbol, e)} title={t.isPaused ? "Resume" : "Pause"} className="p-1 text-slate-500 hover:text-cyan-400">{t.isPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}</button>
                    <button onClick={(e) => handleDeleteTicker(t.symbol, e)} title="Delete" className="p-1 text-slate-500 hover:text-red-400"><XCircle className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col bg-[#0b0f19] relative">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-[#0f172a] z-20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tighter text-white">{selectedSymbol}</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-black/20 px-2 py-0.5 rounded border border-white/5" title={`WS Status: ${connectionStatus}`}>
                  <div className={`w-2 h-2 rounded-full ${statusConfig.color} ${statusConfig.shadow} animate-pulse`} />
                  <span className={`text-[9px] font-black tracking-widest ${statusConfig.text}`}>
                    {connectionStatus}
                  </span>
                  {msSinceLastTick >= 4000 && <span className="text-[7px] text-slate-600 mono">{(msSinceLastTick/1000).toFixed(0)}s ago</span>}
                </div>
                
                <button 
                  onClick={handleConnectAi}
                  className={`flex items-center gap-2 bg-black/20 px-2 py-0.5 rounded border transition-all ${isAiLinked ? 'border-cyan-500/30' : 'border-yellow-500 animate-pulse'}`}
                  title={isAiLinked ? "Neural Link Active" : "Neural Link Missing - Click to Connect"}
                >
                  <Cpu className={`w-3 h-3 ${isAiLinked ? 'text-cyan-400' : 'text-yellow-500'}`} />
                  <span className={`text-[9px] font-black tracking-widest ${isAiLinked ? 'text-cyan-400' : 'text-yellow-500'}`}>
                    {isAiLinked ? 'NEURAL LINK ACTIVE' : 'CONNECT NEURAL LINK'}
                  </span>
                </button>
              </div>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${mkt.isOpen ? 'text-green-400' : 'text-red-400'}`}>{mkt.message}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end px-3 py-1 rounded border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] mono font-black text-cyan-400">{getUsageRPM()} RPM</span>
              <span className="text-[6px] font-black uppercase tracking-tighter text-slate-500">TwelveData Core</span>
            </div>
            <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-lg border transition-all ${isMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-cyan-600/10 border-cyan-500 text-cyan-400'}`}>{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
            <button onClick={() => handleSync(true)} disabled={isSyncing} className="p-2 bg-slate-800 border border-slate-700 rounded-lg transition-all hover:bg-slate-700 active:scale-95 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="h-[480px] rounded-2xl overflow-hidden border border-slate-800 relative bg-[#0a0d14] shadow-2xl">
                {marketData.isLoadingHistory && marketData.history.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0f19] z-50">
                    <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/50">Engine Ignition...</span>
                  </div>
                ) : (
                  <StockChart 
                    key={selectedSymbol} 
                    data={marketData.history} 
                    symbol={selectedSymbol} 
                    currentTurboPrice={marketData.price} 
                    tickCount={marketData.tickCount}
                  />
                )}
              </div>
              {indicators && <IndicatorPanel indicators={indicators} price={marketData.price} />}
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col h-[520px] overflow-hidden shadow-2xl">
                <TriggerSidebar triggers={triggers} metrics={metrics} currentPrice={marketData.price} />
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl flex-1 p-4 overflow-y-auto custom-scrollbar shadow-2xl relative">
                <div className="flex items-center gap-2 mb-3 text-cyan-400 uppercase font-black text-[10px] tracking-widest border-b border-slate-800 pb-2"><Terminal className="w-4 h-4" /> Neural Analysis</div>
                <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  {isAiLoading ? (
                    <div className="flex items-center gap-2 text-cyan-500/50">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="italic">Scanning kinetic impulses...</span>
                    </div>
                  ) : (
                    <>
                      {aiAdvice[selectedSymbol]?.includes("NEURAL_LINK_REQUIRED") ? (
                        <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                          <AlertCircle className="w-8 h-8 text-yellow-500 mb-2" />
                          <p className="text-yellow-500 font-bold mb-4 uppercase tracking-tighter text-[10px]">Neural Link Missing or Invalid</p>
                          <button 
                            onClick={handleConnectAi}
                            className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded font-black text-[9px] uppercase tracking-widest transition-all"
                          >
                            Authenticate Neural Link
                          </button>
                        </div>
                      ) : (
                        aiAdvice[selectedSymbol] || 'Monitoring micro-impulses for 1% wave ignition...'
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
