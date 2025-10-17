import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Wifi, WifiOff, DollarSign, BarChart3, RefreshCw } from 'lucide-react';

interface ExchangePrice {
  exchange: string;
  price: number;
  volume: number;
  timestamp: number;
}

interface ArbitrageOpp {
  symbol: string;
  type: string;
  buyExchange: string;
  buyPrice: number;
  sellExchange: string;
  sellPrice: number;
  spreadPercent: number;
  profitUSDT: number;
  volume: number;
}

const SYMBOLS = [
  { display: 'BTC/USDT', binance: 'btcusdt', bybit: 'BTCUSDT', okx: 'BTC-USDT', mexc: 'BTCUSDT', kraken: 'BTC/USDT', coinbase: 'BTC-USDT' },
  { display: 'ETH/USDT', binance: 'ethusdt', bybit: 'ETHUSDT', okx: 'ETH-USDT', mexc: 'ETHUSDT', kraken: 'ETH/USDT', coinbase: 'ETH-USDT' },
  { display: 'BNB/USDT', binance: 'bnbusdt', bybit: 'BNBUSDT', okx: 'BNB-USDT', mexc: 'BNBUSDT', kraken: 'BNB/USDT', coinbase: 'BNB-USDT' },
  { display: 'SOL/USDT', binance: 'solusdt', bybit: 'SOLUSDT', okx: 'SOL-USDT', mexc: 'SOLUSDT', kraken: 'SOL/USDT', coinbase: 'SOL-USDT' },
  { display: 'XRP/USDT', binance: 'xrpusdt', bybit: 'XRPUSDT', okx: 'XRP-USDT', mexc: 'XRPUSDT', kraken: 'XRP/USDT', coinbase: 'XRP-USDT' },
  { display: 'ADA/USDT', binance: 'adausdt', bybit: 'ADAUSDT', okx: 'ADA-USDT', mexc: 'ADAUSDT', kraken: 'ADA/USDT', coinbase: 'ADA-USDT' },
  { display: 'DOGE/USDT', binance: 'dogeusdt', bybit: 'DOGEUSDT', okx: 'DOGE-USDT', mexc: 'DOGEUSDT', kraken: 'DOGE/USDT', coinbase: 'DOGE-USDT' },
  { display: 'AVAX/USDT', binance: 'avaxusdt', bybit: 'AVAXUSDT', okx: 'AVAX-USDT', mexc: 'AVAXUSDT', kraken: 'AVAX/USDT', coinbase: 'AVAX-USDT' },
  { display: 'MATIC/USDT', binance: 'maticusdt', bybit: 'MATICUSDT', okx: 'MATIC-USDT', mexc: 'MATICUSDT', kraken: 'MATIC/USDT', coinbase: 'MATIC-USDT' },
  { display: 'DOT/USDT', binance: 'dotusdt', bybit: 'DOTUSDT', okx: 'DOT-USDT', mexc: 'DOTUSDT', kraken: 'DOT/USDT', coinbase: 'DOT-USDT' },
  { display: 'LINK/USDT', binance: 'linkusdt', bybit: 'LINKUSDT', okx: 'LINK-USDT', mexc: 'LINKUSDT', kraken: 'LINK/USDT', coinbase: 'LINK-USDT' },
  { display: 'UNI/USDT', binance: 'uniusdt', bybit: 'UNIUSDT', okx: 'UNI-USDT', mexc: 'UNIUSDT', kraken: 'UNI/USDT', coinbase: 'UNI-USDT' },
  { display: 'LTC/USDT', binance: 'ltcusdt', bybit: 'LTCUSDT', okx: 'LTC-USDT', mexc: 'LTCUSDT', kraken: 'LTC/USDT', coinbase: 'LTC-USDT' },
  { display: 'ATOM/USDT', binance: 'atomusdt', bybit: 'ATOMUSDT', okx: 'ATOM-USDT', mexc: 'ATOMUSDT', kraken: 'ATOM/USDT', coinbase: 'ATOM-USDT' },
  { display: 'TRX/USDT', binance: 'trxusdt', bybit: 'TRXUSDT', okx: 'TRX-USDT', mexc: 'TRXUSDT', kraken: 'TRX/USDT', coinbase: 'TRX-USDT' }
];

const CrossExchangeArbitrage = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpp[]>([]);
  const [prices, setPrices] = useState<Map<string, ExchangePrice[]>>(new Map());
  const [connections, setConnections] = useState({
    binance: false,
    bybit: false,
    okx: false,
    mexc: false,
    kraken: false,
    coinbase: false
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Binance WebSocket
  useEffect(() => {
    const streams = SYMBOLS.map(s => `${s.binance}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    
    console.log('Connecting to Binance:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Binance WebSocket connected');
      setConnections(prev => ({ ...prev, binance: true }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.data) {
          const ticker = data.data;
          const symbolConfig = SYMBOLS.find(s => s.binance === ticker.s.toLowerCase());
          
          if (symbolConfig) {
            console.log(`Binance ${symbolConfig.display}: ${ticker.c}`);
            updatePrice(symbolConfig.display, {
              exchange: 'Binance',
              price: parseFloat(ticker.c),
              volume: parseFloat(ticker.v),
              timestamp: ticker.E
            });
          }
        }
      } catch (e) {
        console.error('Binance parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Binance WebSocket error:', error);
      setConnections(prev => ({ ...prev, binance: false }));
    };

    ws.onclose = (event) => {
      console.log('Binance WebSocket closed:', event.code, event.reason);
      setConnections(prev => ({ ...prev, binance: false }));
    };

    return () => {
      console.log('Fechando conexão Binance');
      ws.close();
    };
  }, []);

  // Bybit WebSocket
  useEffect(() => {
    const wsUrl = 'wss://stream.bybit.com/v5/public/spot';
    console.log('Connecting to Bybit:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Bybit WebSocket connected');
      setConnections(prev => ({ ...prev, bybit: true }));

      const subscribeMsg = {
        op: 'subscribe',
        args: SYMBOLS.map(s => `tickers.${s.bybit}`)
      };
      console.log('Bybit subscribing:', subscribeMsg);
      ws.send(JSON.stringify(subscribeMsg));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.op === 'subscribe') {
          console.log('Bybit subscription confirmed:', data);
          return;
        }
        
        if (data.topic && data.topic.startsWith('tickers.')) {
          const ticker = data.data;
          const symbolConfig = SYMBOLS.find(s => s.bybit === ticker.symbol);
          
          if (symbolConfig && ticker.lastPrice) {
            console.log(`Bybit ${symbolConfig.display}: ${ticker.lastPrice}`);
            updatePrice(symbolConfig.display, {
              exchange: 'Bybit',
              price: parseFloat(ticker.lastPrice),
              volume: parseFloat(ticker.volume24h || 0),
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {
        console.error('Bybit parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Bybit WebSocket error:', error);
      setConnections(prev => ({ ...prev, bybit: false }));
    };

    ws.onclose = (event) => {
      console.log('Bybit WebSocket closed:', event.code, event.reason);
      setConnections(prev => ({ ...prev, bybit: false }));
    };

    return () => {
      console.log('Fechando conexão Bybit');
      ws.close();
    };
  }, []);

  // OKX WebSocket
  useEffect(() => {
    const wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
    console.log('Connecting to OKX:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ OKX WebSocket connected');
      setConnections(prev => ({ ...prev, okx: true }));

      const subscribeMsg = {
        op: 'subscribe',
        args: SYMBOLS.map(s => ({
          channel: 'tickers',
          instId: s.okx
        }))
      };
      console.log('OKX subscribing:', subscribeMsg);
      ws.send(JSON.stringify(subscribeMsg));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === 'subscribe') {
          console.log('OKX subscription confirmed:', data);
          return;
        }
        
        if (data.data && data.data.length > 0) {
          data.data.forEach((ticker: any) => {
            const symbolConfig = SYMBOLS.find(s => s.okx === ticker.instId);
            
            if (symbolConfig && ticker.last) {
              console.log(`OKX ${symbolConfig.display}: ${ticker.last}`);
              updatePrice(symbolConfig.display, {
                exchange: 'OKX',
                price: parseFloat(ticker.last),
                volume: parseFloat(ticker.vol24h || 0),
                timestamp: Date.now()
              });
            }
          });
        }
      } catch (e) {
        console.error('OKX parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ OKX WebSocket error:', error);
      setConnections(prev => ({ ...prev, okx: false }));
    };

    ws.onclose = (event) => {
      console.log('OKX WebSocket closed:', event.code, event.reason);
      setConnections(prev => ({ ...prev, okx: false }));
    };

    return () => {
      console.log('Fechando conexão OKX');
      ws.close();
    };
  }, []);

  // MEXC WebSocket
  useEffect(() => {
    const wsUrl = 'wss://wbs.mexc.com/ws';
    console.log('Connecting to MEXC:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ MEXC WebSocket connected');
      setConnections(prev => ({ ...prev, mexc: true }));
      
      const subscribeMsg = {
        method: 'SUBSCRIPTION',
        params: SYMBOLS.map(s => `spot@public.deals.v3.api@${s.mexc}`)
      };
      console.log('MEXC subscribing:', subscribeMsg);
      ws.send(JSON.stringify(subscribeMsg));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.c === 'spot@public.deals.v3.api' && data.d && data.d.deals) {
          const deals = data.d.deals;
          if (deals.length > 0) {
            const lastDeal = deals[deals.length - 1];
            const symbolName = data.s;
            const symbolConfig = SYMBOLS.find(s => `spot@public.deals.v3.api@${s.mexc}` === symbolName);
            
            if (symbolConfig && lastDeal.p) {
              console.log(`MEXC ${symbolConfig.display}: ${lastDeal.p}`);
              updatePrice(symbolConfig.display, {
                exchange: 'MEXC',
                price: parseFloat(lastDeal.p),
                volume: parseFloat(lastDeal.v || 0),
                timestamp: Date.now()
              });
            }
          }
        }
      } catch (e) {
        console.error('MEXC parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ MEXC WebSocket error:', error);
      setConnections(prev => ({ ...prev, mexc: false }));
    };

    ws.onclose = (event) => {
      console.log('MEXC WebSocket closed:', event.code, event.reason);
      setConnections(prev => ({ ...prev, mexc: false }));
    };

    return () => {
      console.log('Fechando conexão MEXC');
      ws.close();
    };
  }, []);

  // Kraken WebSocket
  useEffect(() => {
    const wsUrl = 'wss://ws.kraken.com';
    console.log('Connecting to Kraken:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Kraken WebSocket connected');
      setConnections(prev => ({ ...prev, kraken: true }));

      const subscribeMsg = {
        event: 'subscribe',
        pair: SYMBOLS.map(s => s.kraken),
        subscription: { name: 'ticker' }
      };
      console.log('Kraken subscribing:', subscribeMsg);
      ws.send(JSON.stringify(subscribeMsg));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (Array.isArray(data) && data.length > 3) {
          const ticker = data[1];
          const pair = data[3];
          
          if (ticker && ticker.c && ticker.c[0]) {
            const symbolConfig = SYMBOLS.find(s => s.kraken === pair);
            
            if (symbolConfig) {
              console.log(`Kraken ${symbolConfig.display}: ${ticker.c[0]}`);
              updatePrice(symbolConfig.display, {
                exchange: 'Kraken',
                price: parseFloat(ticker.c[0]),
                volume: parseFloat(ticker.v[1] || 0),
                timestamp: Date.now()
              });
            }
          }
        }
      } catch (e) {
        console.error('Kraken parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Kraken WebSocket error:', error);
      setConnections(prev => ({ ...prev, kraken: false }));
    };

    ws.onclose = (event) => {
      console.log('Kraken WebSocket closed:', event.code, event.reason);
      setConnections(prev => ({ ...prev, kraken: false }));
    };

    return () => {
      console.log('Fechando conexão Kraken');
      ws.close();
    };
  }, []);

  // Coinbase WebSocket
  useEffect(() => {
    const wsUrl = 'wss://ws-feed.exchange.coinbase.com';
    console.log('Connecting to Coinbase:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Coinbase WebSocket connected');
      setConnections(prev => ({ ...prev, coinbase: true }));

      const subscribeMsg = {
        type: 'subscribe',
        product_ids: SYMBOLS.map(s => s.coinbase),
        channels: ['ticker']
      };
      console.log('Coinbase subscribing:', subscribeMsg);
      ws.send(JSON.stringify(subscribeMsg));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'ticker' && data.product_id && data.price) {
          const symbolConfig = SYMBOLS.find(s => s.coinbase === data.product_id);
          
          if (symbolConfig) {
            console.log(`Coinbase ${symbolConfig.display}: ${data.price}`);
            updatePrice(symbolConfig.display, {
              exchange: 'Coinbase',
              price: parseFloat(data.price),
              volume: parseFloat(data.volume_24h || 0),
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {
        console.error('Coinbase parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Coinbase WebSocket error:', error);
      setConnections(prev => ({ ...prev, coinbase: false }));
    };

    ws.onclose = (event) => {
      console.log('Coinbase WebSocket closed:', event.code, event.reason);
      setConnections(prev => ({ ...prev, coinbase: false }));
    };

    return () => {
      console.log('Fechando conexão Coinbase');
      ws.close();
    };
  }, []);

  const updatePrice = (symbol: string, newPrice: ExchangePrice) => {
    setPrices(prev => {
      const newPrices = new Map(prev);
      const existing = newPrices.get(symbol) || [];
      
      const filtered = existing.filter(p => p.exchange !== newPrice.exchange);
      filtered.push(newPrice);
      
      newPrices.set(symbol, filtered);
      
      console.log(`💰 ${symbol} atualizado: ${filtered.length} exchanges`, 
        filtered.map(p => `${p.exchange}=$${p.price.toFixed(2)}`).join(', '));
      
      return newPrices;
    });
    
    setLastUpdate(new Date());
  };

  useEffect(() => {
    if (prices.size === 0) {
      console.log('⚠️ Nenhum preço disponível ainda');
      return;
    }

    console.log(`📊 Calculando oportunidades com ${prices.size} símbolos...`);
    
    setIsRefreshing(true);
    const timer = setTimeout(() => {
      calculateOpportunities();
      setIsRefreshing(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [prices]);

  const calculateOpportunities = () => {
    const opps: ArbitrageOpp[] = [];

    prices.forEach((exchangePrices, symbol) => {
      if (exchangePrices.length < 2) {
        console.log(`${symbol}: Apenas ${exchangePrices.length} exchange(s), precisa de 2+`);
        return;
      }

      const validPrices = exchangePrices.filter(p => p.price > 0 && !isNaN(p.price));
      
      if (validPrices.length < 2) {
        console.log(`${symbol}: Preços inválidos`);
        return;
      }

      const sorted = [...validPrices].sort((a, b) => a.price - b.price);
      const lowest = sorted[0];
      const highest = sorted[sorted.length - 1];
      
      const spreadPercent = ((highest.price - lowest.price) / lowest.price) * 100;
      
      console.log(`${symbol}: ${lowest.exchange} $${lowest.price.toFixed(2)} → ${highest.exchange} $${highest.price.toFixed(2)} = ${spreadPercent.toFixed(3)}%`);
      
      if (spreadPercent > 0.001) {
        opps.push({
          symbol,
          type: 'Spot-Spot',
          buyExchange: lowest.exchange,
          buyPrice: lowest.price,
          sellExchange: highest.exchange,
          sellPrice: highest.price,
          spreadPercent,
          profitUSDT: highest.price - lowest.price,
          volume: Math.min(lowest.volume, highest.volume)
        });
      }
    });

    console.log(`✅ Total de oportunidades: ${opps.length}`);

    opps.sort((a, b) => b.spreadPercent - a.spreadPercent);
    setOpportunities(opps);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value < 1 ? 4 : 2,
      maximumFractionDigits: value < 1 ? 4 : 2
    }).format(value);
  };

  const formatVolume = (value: number) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const getSpreadColor = (spread: number) => {
    if (spread >= 2) return 'text-green-400';
    if (spread >= 1) return 'text-green-500';
    if (spread >= 0.5) return 'text-yellow-500';
    return 'text-orange-400';
  };

  const getExchangeBadgeColor = (exchange: string) => {
    switch (exchange) {
      case 'Binance': return 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50';
      case 'Bybit': return 'bg-orange-900/30 text-orange-400 border-orange-700/50';
      case 'OKX': return 'bg-blue-900/30 text-blue-400 border-blue-700/50';
      case 'MEXC': return 'bg-green-900/30 text-green-400 border-green-700/50';
      case 'Kraken': return 'bg-purple-900/30 text-purple-400 border-purple-700/50';
      case 'Coinbase': return 'bg-indigo-900/30 text-indigo-400 border-indigo-700/50';
      default: return 'bg-gray-900/30 text-gray-400 border-gray-700/50';
    }
  };

  const stats = useMemo(() => {
    return {
      totalOpportunities: opportunities.length,
      maxSpread: opportunities.length > 0 ? opportunities[0].spreadPercent : 0,
      avgSpread: opportunities.length > 0
        ? opportunities.reduce((sum, o) => sum + o.spreadPercent, 0) / opportunities.length
        : 0,
      totalProfit: opportunities.reduce((sum, o) => sum + o.profitUSDT, 0)
    };
  }, [opportunities]);

  const isConnected = Object.values(connections).some(c => c);
  const connectedCount = Object.values(connections).filter(c => c).length;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-900 rounded-2xl p-6 mb-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                📊 Arbitragem Cross-Exchange
              </h1>
              <p className="text-slate-400 text-sm">
                Oportunidades Spot × Spot • Dados Reais WebSocket
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-3 mb-2">
                  {Object.entries(connections).map(([exchange, connected]) => (
                    <div key={exchange} className="flex items-center gap-1">
                      {connected ? (
                        <Wifi className="w-3 h-3 text-green-400" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-red-400" />
                      )}
                      <span className="text-xs text-slate-400 capitalize">{exchange}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  {lastUpdate.toLocaleTimeString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
                <RefreshCw className={`w-4 h-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-xs text-slate-400">
                  {connectedCount}/6 conectadas
                </span>
              </div>
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">
              ⚠️ Nenhuma exchange conectada. Aguarde a conexão WebSocket...
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Oportunidades</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalOpportunities}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <p className="text-slate-400 text-sm mb-1">Lucro Máx %</p>
            <p className="text-3xl font-bold text-green-400">
              {stats.maxSpread.toFixed(2)}%
            </p>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <p className="text-slate-400 text-sm mb-1">Lucro Médio %</p>
            <p className="text-3xl font-bold text-yellow-400">
              {stats.avgSpread.toFixed(2)}%
            </p>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              <span>Lucro Total</span>
            </div>
            <p className="text-3xl font-bold text-blue-400">
              {formatCurrency(stats.totalProfit)}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Par</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Tipo</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Exchange 1</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Exchange 2</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Lucro %</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Lucro USDT</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      {isConnected ? '📊 Aguardando dados das exchanges...' : '🔌 Conectando às exchanges...'}
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opp, idx) => (
                    <tr 
                      key={idx}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold">
                            {opp.symbol.split('/')[0].slice(0, 2)}
                          </div>
                          <span className="font-bold text-white">{opp.symbol}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-900/30 text-green-400 text-xs font-medium border border-green-700/50">
                          {opp.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border mb-1 ${getExchangeBadgeColor(opp.buyExchange)}`}>
                            {opp.buyExchange}
                          </div>
                          <div className="text-slate-300 font-mono">{formatCurrency(opp.buyPrice)}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border mb-1 ${getExchangeBadgeColor(opp.sellExchange)}`}>
                            {opp.sellExchange}
                          </div>
                          <div className="text-slate-300 font-mono">{formatCurrency(opp.sellPrice)}</div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TrendingUp className={`w-4 h-4 ${getSpreadColor(opp.spreadPercent)}`} />
                          <span className={`text-lg font-bold ${getSpreadColor(opp.spreadPercent)}`}>
                            +{opp.spreadPercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-green-400 font-semibold">
                          +{formatCurrency(opp.profitUSDT)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-slate-400 text-sm">
                          {formatVolume(opp.volume)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            💡 Compre na Exchange 1 (menor preço) e venda na Exchange 2 (maior preço)
          </p>
          <p className="mt-2 text-xs text-slate-500">
            ⚠️ Considere: Taxas de saque ({'>'}0.0005 BTC), depósito, tempo de transferência (10-30min) e slippage
          </p>
          <p className="mt-1 text-xs text-green-400">
            ✅ Dados em tempo real via WebSocket (Binance, Bybit, OKX)
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrossExchangeArbitrage;