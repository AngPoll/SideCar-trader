
export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  indicators?: Indicators;
}

export interface Indicators {
  sma20: number;
  sma50: number;
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochRsi: {
    k: number;
    d: number;
  };
  velocity?: number; 
  impulse?: number;  
}

export interface StockState extends PriceData {
  indicators: Indicators;
}

export type SignalType = 'BUY' | 'SELL' | 'NEUTRAL';

export type Timeframe = '1D';

export interface Trigger {
  id: string;
  timestamp: number;
  symbol: string;
  type: SignalType;
  price: number;
  targetPrice?: number;
  stopLoss?: number;
  potentialGain?: number;
  reason: string;
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  isAiAudited: boolean;
  aiVerdict?: 'STRIKE NOW' | 'WAIT' | 'DISREGARD';
  aiProbability?: number;
  aiReasoning?: string;
  decay?: number; 
  velocityAtEntry?: number;
}

export interface PerformanceMetrics {
  total: number;
  wins: number;
  losses: number;
  score: number;
}

export interface TickerInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdate?: number;
  isPaused?: boolean;
}

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'STALE' | 'DISCONNECTED' | 'ERROR';
