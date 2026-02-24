import { PriceData, Indicators, Timeframe } from '../types';

const API_KEY = '8f3800e868104130bbfc2012f417da88';

let requestTimestampHistory: number[] = [];
let lastRequestTime = 0;

/**
 * Tracks API credits usage in a rolling 60-second window.
 */
const trackCredit = () => {
  const now = Date.now();
  requestTimestampHistory.push(now);
  lastRequestTime = now;
  const oneMinuteAgo = now - 60000;
  requestTimestampHistory = requestTimestampHistory.filter(t => t > oneMinuteAgo);
};

/**
 * Returns current Requests Per Minute (RPM) based on tracked history.
 */
export const getUsageRPM = () => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  requestTimestampHistory = requestTimestampHistory.filter(t => t > oneMinuteAgo);
  return requestTimestampHistory.length;
};

/**
 * Checks if a request can be made based on RPM and spacing.
 */
export const canRequest = (isPriority: boolean = false): boolean => {
  const rpm = getUsageRPM();
  const now = Date.now();
  
  if (rpm >= 50) return false;
  
  const spacing = isPriority ? 700 : 1000;
  if (now - lastRequestTime < spacing) return false;
  
  return true;
};

export const fetchInitialData = async (symbol: string, tf: Timeframe = '1D', isPriority: boolean = true): Promise<PriceData[] | null> => {
  if (!canRequest(isPriority)) return null;
  trackCredit(); 

  try {
    const apiSymbol = symbol.toUpperCase().replace(' ', '');
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(apiSymbol)}&interval=1min&outputsize=1000&apikey=${API_KEY}&timezone=UTC&order=ASC`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === 'error' || !data.values) return null;
    
    return data.values.map((v: any) => ({
      timestamp: new Date(v.datetime.replace(' ', 'T') + "Z").getTime(),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume) || 0
    })).filter((d: any) => !isNaN(d.close));
  } catch (error) {
    return null;
  }
};

export const fetchRealtimePrice = async (symbol: string): Promise<{ price: number, volume: number, isRateLimited?: boolean } | null> => {
  if (!canRequest(false)) return null;
  trackCredit(); 

  try {
    const apiSymbol = symbol.toUpperCase().replace(' ', '');
    const seed = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(apiSymbol)}&apikey=${API_KEY}&_v=${seed}&_t=${Date.now()}`;
    
    const response = await fetch(url);
    if (response.status === 429) return { price: 0, volume: 0, isRateLimited: true };

    const data = await response.json();
    if (data.status === 'error') return { price: 0, volume: 0, isRateLimited: true };

    const price = parseFloat(data.price);
    if (!isNaN(price) && price > 0) return { price, volume: 0 };
    
    return null;
  } catch (e) {
    return null;
  }
};

export const calculateSMA = (data: number[], period: number): number => {
  if (data.length < period) return data[data.length - 1] || 0;
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
};

export const calculateEMA = (data: number[], period: number): number => {
  if (data.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
};

export const calculateRSI = (data: number[], period: number = 14): number => {
  if (data.length <= period) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[data.length - i] - data[data.length - i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const getIndicators = (history: PriceData[]): Indicators => {
  const closes = history.map(d => d.close);
  if (closes.length < 50) return {
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    rsi: calculateRSI(closes, 14),
    macd: { value: 0, signal: 0, histogram: 0 },
    bollinger: { upper: 0, middle: 0, lower: 0 },
    stochRsi: { k: 50, d: 50 }
  };

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const rsiValue = calculateRSI(closes, 14);

  // MACD Calculation
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdValue = ema12 - ema26;
  
  // Signal line (9-period EMA of MACD)
  // To be accurate we'd need historical MACD values. We approximate using recent slices.
  const macdHistory: number[] = [];
  for (let i = Math.max(0, closes.length - 20); i < closes.length; i++) {
    const subCloses = closes.slice(0, i + 1);
    macdHistory.push(calculateEMA(subCloses, 12) - calculateEMA(subCloses, 26));
  }
  const signal = calculateEMA(macdHistory, 9);
  const histogram = macdValue - signal;

  // Bollinger Bands
  const bbSlice = closes.slice(-20);
  const avg = sma20;
  const stdDev = Math.sqrt(bbSlice.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / bbSlice.length);

  // Stochastic RSI (14, 14, 3, 3)
  const rsiHistory: number[] = [];
  for (let i = Math.max(0, closes.length - 30); i < closes.length; i++) {
    rsiHistory.push(calculateRSI(closes.slice(0, i + 1), 14));
  }
  
  const stochRsiWindow = rsiHistory.slice(-14);
  const minRsi = Math.min(...stochRsiWindow);
  const maxRsi = Math.max(...stochRsiWindow);
  const currentStochRsi = maxRsi === minRsi ? 0 : ((rsiValue - minRsi) / (maxRsi - minRsi)) * 100;

  return {
    sma20, sma50, rsi: rsiValue,
    macd: { value: macdValue, signal, histogram },
    bollinger: { upper: avg + (stdDev * 2), middle: avg, lower: avg - (stdDev * 2) },
    stochRsi: { k: currentStochRsi, d: calculateSMA(rsiHistory.slice(-3), 3) } // Simplified smoothing
  };
};
