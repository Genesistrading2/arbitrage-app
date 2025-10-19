import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, ExternalLink, Clock } from 'lucide-react';

interface ArbitrageOpp {
  time: string;
  symbol: string;
  symbolClean: string;
  exchange: string;
  spotPrice: number;
  futuresPrice: number;
  spotVolume: number;
  futuresVolume: number;
  spreadPercent: number;
  spreadDollar: number;
  spotUrl: string;
  futuresUrl: string;
}

const SpotFuturesArbitrage = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpp[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [minSpread, setMinSpread] = useState(0.5);
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>(['okx', 'mexc', 'gate', 'bitget', 'bingx', 'kucoin', 'htx']);
  const [arbitrageMode, setArbitrageMode] = useState<'spot-futures' | 'cross-exchange'>('spot-futures');

  const exchanges = [
    {
      name: 'okx',
      displayName: 'OKX',
      color: 'from-blue-500 to-blue-600',
      fetchSpot: async () => {
        const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
        const data = await res.json();
        const map = new Map();
        data.data?.forEach((t: any) => {
          if (t.instId.endsWith('-USDT')) {
            const symbol = t.instId.replace('-', '');
            map.set(symbol, {
              price: parseFloat(t.last),
              volume: parseFloat(t.volCcy24h || 0)
            });
          }
        });
        return map;
      },
      fetchFutures: async () => {
        const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP');
        const data = await res.json();
        const map = new Map();
        data.data?.forEach((t: any) => {
          if (t.instId.endsWith('-USDT-SWAP')) {
            const symbol = t.instId.replace('-USDT-SWAP', 'USDT');
            map.set(symbol, {
              price: parseFloat(t.last),
              volume: parseFloat(t.volCcy24h || 0)
            });
          }
        });
        return map;
      },
      getSpotUrl: (symbol: string) => `https://www.okx.com/pt-br/trade-spot/${symbol.replace('USDT', '-usdt').toLowerCase()}`,
      getFuturesUrl: (symbol: string) => `https://www.okx.com/pt-br/trade-swap/${symbol.replace('USDT', '-usdt-swap').toLowerCase()}`
    },
    {
      name: 'mexc',
      displayName: 'MEXC',
      color: 'from-green-500 to-green-600',
      fetchSpot: async () => {
        const res = await fetch('https://api.mexc.com/api/v3/ticker/24hr');
        const data = await res.json();
        const map = new Map();
        data.forEach((t: any) => {
          if (t.symbol.endsWith('USDT')) {
            map.set(t.symbol, {
              price: parseFloat(t.lastPrice),
              volume: parseFloat(t.quoteVolume || 0)
            });
          }
        });
        return map;
      },
      fetchFutures: async () => {
        const res = await fetch('https://contract.mexc.com/api/v1/contract/ticker');
        const data = await res.json();
        const map = new Map();
        if (data.data) {
          data.data.forEach((t: any) => {
            if (t.symbol.endsWith('_USDT')) {
              const symbol = t.symbol.replace('_', '');
              map.set(symbol, {
                price: parseFloat(t.lastPrice),
                volume: parseFloat(t.volume24 || 0)
              });
            }
          });
        }
        return map;
      },
      getSpotUrl: (symbol: string) => `https://www.mexc.com/pt-BR/exchange/${symbol.replace('USDT', '_USDT')}`,
      getFuturesUrl: (symbol: string) => `https://futures.mexc.com/pt-BR/exchange/${symbol.replace('USDT', '_USDT')}`
    },
    {
      name: 'gate',
      displayName: 'Gate.io',
      color: 'from-purple-500 to-purple-600',
      fetchSpot: async () => {
        const res = await fetch('https://api.gateio.ws/api/v4/spot/tickers');
        const data = await res.json();
        const map = new Map();
        data.forEach((t: any) => {
          if (t.currency_pair.endsWith('_USDT')) {
            const symbol = t.currency_pair.replace('_', '');
            map.set(symbol, {
              price: parseFloat(t.last),
              volume: parseFloat(t.quote_volume || 0)
            });
          }
        });
        return map;
      },
      fetchFutures: async () => {
        const res = await fetch('https://api.gateio.ws/api/v4/futures/usdt/tickers');
        const data = await res.json();
        const map = new Map();
        data.forEach((t: any) => {
          if (t.contract.endsWith('_USDT')) {
            const symbol = t.contract.replace('_', '');
            map.set(symbol, {
              price: parseFloat(t.last),
              volume: parseFloat(t.volume_24h_quote || 0)
            });
          }
        });
        return map;
      },
      getSpotUrl: (symbol: string) => `https://www.gate.io/pt/trade/${symbol.replace('USDT', '_USDT')}`,
      getFuturesUrl: (symbol: string) => `https://www.gate.io/pt/futures_trade/USDT/${symbol.replace('USDT', '_USDT')}`
    },
    {
      name: 'bitget',
      displayName: 'Bitget',
      color: 'from-cyan-500 to-cyan-600',
      fetchSpot: async () => {
        const res = await fetch('https://api.bitget.com/api/v2/spot/market/tickers');
        const data = await res.json();
        const map = new Map();
        if (data.data) {
          data.data.forEach((t: any) => {
            if (t.symbol.endsWith('USDT')) {
              map.set(t.symbol, {
                price: parseFloat(t.lastPr),
                volume: parseFloat(t.quoteVolume || 0)
              });
            }
          });
        }
        return map;
      },
      fetchFutures: async () => {
        const res = await fetch('https://api.bitget.com/api/v2/mix/market/tickers?productType=usdt-futures');
        const data = await res.json();
        const map = new Map();
        if (data.data) {
          data.data.forEach((t: any) => {
            if (t.symbol.endsWith('USDT')) {
              map.set(t.symbol, {
                price: parseFloat(t.lastPr),
                volume: parseFloat(t.quoteVolume || 0)
              });
            }
          });
        }
        return map;
      },
      getSpotUrl: (symbol: string) => `https://www.bitget.com/pt/spot/${symbol}`,
      getFuturesUrl: (symbol: string) => `https://www.bitget.com/pt/futures/usdt/${symbol}`
    },
    {
      name: 'bingx',
      displayName: 'BingX',
      color: 'from-indigo-500 to-indigo-600',
      fetchSpot: async () => {
        const res = await fetch('https://open-api.bingx.com/openApi/spot/v1/ticker/24hr');
        const data = await res.json();
        const map = new Map();
        if (data.data) {
          data.data.forEach((t: any) => {
            if (t.symbol.endsWith('USDT')) {
              map.set(t.symbol, {
                price: parseFloat(t.lastPrice),
                volume: parseFloat(t.quoteVolume || 0)
              });
            }
          });
        }
        return map;
      },
      fetchFutures: async () => {
        const res = await fetch('https://open-api.bingx.com/openApi/swap/v2/quote/ticker');
        const data = await res.json();
        const map = new Map();
        if (data.data) {
          data.data.forEach((t: any) => {
            if (t.symbol.endsWith('-USDT')) {
              const symbol = t.symbol.replace('-', '');
              map.set(symbol, {
                price: parseFloat(t.lastPrice),
                volume: parseFloat(t.volume || 0) * parseFloat(t.lastPrice)
              });
            }
          });
        }
        return map;
      },
      getSpotUrl: (symbol: string) => `https://bingx.com/pt-br/spot/${symbol}/`,
      getFuturesUrl: (symbol: string) => `https://bingx.com/pt-br/swap/${symbol.replace('USDT', '-USDT')}/`
    },
    {
      name: 'kucoin',
      displayName: 'KuCoin',
      color: 'from-teal-500 to-teal-600',
      fetchSpot: async () => {
        const res = await fetch('https://api.kucoin.com/api/v1/market/allTickers');
        const data = await res.json();
        const map = new Map();
        if (data.data?.ticker) {
          data.data.ticker.forEach((t: any) => {
            if (t.symbol.endsWith('-USDT')) {
              const symbol = t.symbol.replace('-', '');
              map.set(symbol, {
                price: parseFloat(t.last),
                volume: parseFloat(t.volValue || 0)
              });
            }
          });
        }
        return map;
      },
      fetchFutures: async () => {
        const res = await fetch('https://api-futures.kucoin.com/api/v1/ticker');
        const data = await res.json();
        const map = new Map();
        if (data.data) {
          data.data.forEach((t: any) => {
            if (t.symbol.endsWith('USDTM')) {
              const symbol = t.symbol.replace('M', '').replace('-', '');
              map.set(symbol, {
                price: parseFloat(t.price),
                volume: parseFloat(t.turnover || 0)
              });
            }
          });
        }
        return map;
      },
      getSpotUrl: (symbol: string) => `https://www.kucoin.com/pt/trade/${symbol.replace('USDT', '-USDT')}`,
      getFuturesUrl: (symbol: string) => `https://www.kucoin.com/pt/futures/trade/${symbol.replace('USDT', 'USDTM')}`
    },
    {
      name: 'htx',
      displayName: 'HTX',
      color: 'from-rose-500 to-rose-600',
      fetchSpot: async () => {
        const res = await fetch('https://api.huobi.pro/market/tickers');
        const data = await res.json();
        const map = new Map();
        if (data.data) {
          data.data.forEach((t: any) => {
            if (t.symbol.endsWith('usdt')) {
              const symbol = t.symbol.toUpperCase();
              map.set(symbol, {
                price: parseFloat(t.close),
                volume: parseFloat(t.vol || 0) * parseFloat(t.close)
              });
            }
          });
        }
        return map;
      },
      fetchFutures: async () => {
        const res = await fetch('https://api.hbdm.com/linear-swap-ex/market/detail/batch_merged');
        const data = await res.json();
        const map = new Map();
        if (data.data) {
          data.data.forEach((t: any) => {
            if (t.contract_code && t.contract_code.endsWith('-USDT')) {
              const symbol = t.contract_code.replace('-', '');
              map.set(symbol, {
                price: parseFloat(t.close),
                volume: parseFloat(t.amount || 0) * parseFloat(t.close)
              });
            }
          });
        }
        return map;
      },
      getSpotUrl: (symbol: string) => `https://www.htx.com/pt-br/trade/${symbol.toLowerCase().replace('usdt', '_usdt')}`,
      getFuturesUrl: (symbol: string) => `https://futures.htx.com/pt-br/linear_swap/exchange/${symbol.replace('USDT', '-USDT')}`
    }
  ];

  const fetchAllOpportunities = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const allOpps: ArbitrageOpp[] = [];

      if (arbitrageMode === 'spot-futures') {
        for (const exchange of exchanges) {
          if (!selectedExchanges.includes(exchange.name)) continue;

          try {
            const [spotMap, futuresMap] = await Promise.all([
              exchange.fetchSpot(),
              exchange.fetchFutures()
            ]);

            spotMap.forEach((spotData, symbol) => {
              const futuresData = futuresMap.get(symbol);

              if (futuresData && spotData.price > 0 && futuresData.price > 0) {
                const spread = ((futuresData.price - spotData.price) / spotData.price) * 100;
                const spreadDollar = futuresData.price - spotData.price;

                if (Math.abs(spread) >= minSpread) {
                  const symbolClean = symbol.replace('USDT', '').replace('_', '').replace('-', '');

                  allOpps.push({
                    time: now.toLocaleTimeString('pt-BR'),
                    symbol: symbol,
                    symbolClean: symbolClean,
                    exchange: exchange.displayName,
                    spotPrice: spotData.price,
                    futuresPrice: futuresData.price,
                    spotVolume: spotData.volume,
                    futuresVolume: futuresData.volume,
                    spreadPercent: spread,
                    spreadDollar: spreadDollar,
                    spotUrl: exchange.getSpotUrl(symbol),
                    futuresUrl: exchange.getFuturesUrl(symbol)
                  });
                }
              }
            });
          } catch (error) {
            console.error(`Erro ao buscar dados de ${exchange.name}:`, error);
          }
        }
      } else {
        const exchangeSpotData = new Map<string, Map<string, any>>();
        
        for (const exchange of exchanges) {
          if (!selectedExchanges.includes(exchange.name)) continue;
          try {
            const spotMap = await exchange.fetchSpot();
            exchangeSpotData.set(exchange.name, spotMap);
          } catch (error) {
            console.error(`Erro ao buscar dados de ${exchange.name}:`, error);
          }
        }

        const symbolsSet = new Set<string>();
        exchangeSpotData.forEach(spotMap => {
          spotMap.forEach((_, symbol) => symbolsSet.add(symbol));
        });

        symbolsSet.forEach(symbol => {
          const prices: Array<{exchange: string, price: number, volume: number, url: string}> = [];
          
          exchangeSpotData.forEach((spotMap, exchangeName) => {
            const data = spotMap.get(symbol);
            if (data && data.price > 0) {
              const exchange = exchanges.find(e => e.name === exchangeName);
              if (exchange) {
                prices.push({
                  exchange: exchange.displayName,
                  price: data.price,
                  volume: data.volume,
                  url: exchange.getSpotUrl(symbol)
                });
              }
            }
          });

          if (prices.length >= 2) {
            prices.sort((a, b) => a.price - b.price);
            const lowest = prices[0];
            const highest = prices[prices.length - 1];
            
            const spread = ((highest.price - lowest.price) / lowest.price) * 100;
            const spreadDollar = highest.price - lowest.price;

            if (Math.abs(spread) >= minSpread) {
              const symbolClean = symbol.replace('USDT', '').replace('_', '').replace('-', '');
              
              allOpps.push({
                time: now.toLocaleTimeString('pt-BR'),
                symbol: symbol,
                symbolClean: symbolClean,
                exchange: `${lowest.exchange} → ${highest.exchange}`,
                spotPrice: lowest.price,
                futuresPrice: highest.price,
                spotVolume: lowest.volume,
                futuresVolume: highest.volume,
                spreadPercent: spread,
                spreadDollar: spreadDollar,
                spotUrl: lowest.url,
                futuresUrl: highest.url
              });
            }
          }
        });
      }

      allOpps.sort((a, b) => Math.abs(b.spreadPercent) - Math.abs(a.spreadPercent));

      setOpportunities(allOpps);
      setLastUpdate(now);
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOpportunities();
    const interval = setInterval(fetchAllOpportunities, 50000);
    return () => clearInterval(interval);
  }, [minSpread, selectedExchanges, arbitrageMode]);

  const filteredOpps = opportunities.filter(opp => 
    opp.symbolClean.toLowerCase().includes(filter.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    if (value < 0.01) return `$${value.toFixed(6)}`;
    if (value < 1) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(2)}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getSpreadClass = (spread: number) => {
    const abs = Math.abs(spread);
    if (abs >= 5) return 'text-red-400 font-bold';
    if (abs >= 2) return 'text-orange-400 font-semibold';
    if (abs >= 1) return 'text-yellow-400';
    return 'text-green-400';
  };

  const toggleExchange = (exchange: string) => {
    setSelectedExchanges(prev => 
      prev.includes(exchange) 
        ? prev.filter(e => e !== exchange)
        : [...prev, exchange]
    );
  };

  const stats = {
    total: filteredOpps.length,
    avgSpread: filteredOpps.length > 0 
      ? filteredOpps.reduce((sum, o) => sum + Math.abs(o.spreadPercent), 0) / filteredOpps.length 
      : 0,
    maxSpread: filteredOpps.length > 0 
      ? Math.max(...filteredOpps.map(o => Math.abs(o.spreadPercent)))
      : 0,
    exchanges: selectedExchanges.length
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-2 sm:p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="bg-slate-900 rounded-xl p-3 sm:p-4 md:p-6 mb-4 md:mb-6 border border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Monitor de Arbitragem</h1>
                <p className="text-slate-400 text-xs sm:text-sm">
                  {arbitrageMode === 'spot-futures' ? 'Spot × Futuros' : 'Entre Exchanges'} • Tempo Real
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="text-right flex-1 sm:flex-none">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Última: </span>{lastUpdate.toLocaleTimeString('pt-BR')}
                </div>
                <div className="text-xs text-slate-500 mt-1 hidden sm:block">
                  Atualiza a cada 50s
                </div>
              </div>
              <button
                onClick={fetchAllOpportunities}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg transition-colors text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4">
              <div className="text-slate-400 text-xs sm:text-sm mb-1">Oportunidades</div>
              <div className="text-xl sm:text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4">
              <div className="text-slate-400 text-xs sm:text-sm mb-1">Exchanges</div>
              <div className="text-xl sm:text-3xl font-bold text-blue-400">{stats.exchanges}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4">
              <div className="text-slate-400 text-xs sm:text-sm mb-1">Spread Máx</div>
              <div className="text-xl sm:text-3xl font-bold text-orange-400">{stats.maxSpread.toFixed(2)}%</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4">
              <div className="text-slate-400 text-xs sm:text-sm mb-1">Spread Méd</div>
              <div className="text-xl sm:text-3xl font-bold text-yellow-400">{stats.avgSpread.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-3 sm:p-4 mb-4 md:mb-6 border border-slate-800">
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">Modo de Arbitragem</label>
            <div className="flex gap-2">
              <button
                onClick={() => setArbitrageMode('spot-futures')}
                className={`flex-1 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  arbitrageMode === 'spot-futures'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Spot × Futuros
              </button>
              <button
                onClick={() => setArbitrageMode('cross-exchange')}
                className={`flex-1 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  arbitrageMode === 'cross-exchange'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Entre Exchanges
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end mb-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-2">Buscar Moeda</label>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Ex: BTC, ETH, SOL..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 sm:px-4 py-2 outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-sm text-slate-400 mb-2">Spread Mín (%)</label>
              <input
                type="number"
                step="0.1"
                value={minSpread}
                onChange={(e) => setMinSpread(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 sm:px-4 py-2 outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-2">Exchanges</label>
            <div className="flex gap-2 flex-wrap">
              {exchanges.map(ex => (
                <button
                  key={ex.name}
                  onClick={() => toggleExchange(ex.name)}
                  className={`px-2 sm:px-4 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                    selectedExchanges.includes(ex.name)
                      ? `bg-gradient-to-r ${ex.color} text-white`
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {ex.displayName}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          {/* Versão Desktop - Tabela */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 text-slate-300 text-sm">
                  <th className="text-left p-4 font-semibold">Time</th>
                  <th className="text-left p-4 font-semibold">Moeda</th>
                  <th className="text-left p-4 font-semibold">Exchange</th>
                  <th className="text-left p-4 font-semibold">{arbitrageMode === 'spot-futures' ? 'Spot' : 'Menor'}</th>
                  <th className="text-left p-4 font-semibold">{arbitrageMode === 'spot-futures' ? 'Futuros' : 'Maior'}</th>
                  <th className="text-center p-4 font-semibold">Spread %</th>
                  <th className="text-center p-4 font-semibold">Lucro $</th>
                  <th className="text-center p-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading && filteredOpps.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Carregando dados...
                    </td>
                  </tr>
                ) : filteredOpps.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-slate-400">
                      Nenhuma oportunidade encontrada
                    </td>
                  </tr>
                ) : (
                  filteredOpps.map((opp, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 text-slate-400 text-sm">{opp.time}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-xs font-bold">
                            {opp.symbolClean.slice(0, 2)}
                          </div>
                          <span className="font-bold text-lg">{opp.symbolClean}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-sm">{opp.exchange}</span>
                      </td>
                      <td className="p-4">
                        <div className="text-green-400 font-mono font-semibold">{formatCurrency(opp.spotPrice)}</div>
                        <div className="text-xs text-slate-500">Vol: {formatVolume(opp.spotVolume)}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-orange-400 font-mono font-semibold">{formatCurrency(opp.futuresPrice)}</div>
                        <div className="text-xs text-slate-500">Vol: {formatVolume(opp.futuresVolume)}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <TrendingUp className={`w-4 h-4 ${opp.spreadPercent > 0 ? 'text-green-400' : 'text-red-400 rotate-180'}`} />
                          <span className={`text-xl font-bold ${getSpreadClass(opp.spreadPercent)}`}>
                            {opp.spreadPercent > 0 ? '+' : ''}{opp.spreadPercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-lg font-semibold ${getSpreadClass(opp.spreadPercent)}`}>
                          {opp.spreadDollar > 0 ? '+' : ''}{formatCurrency(Math.abs(opp.spreadDollar))}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={opp.spotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {arbitrageMode === 'spot-futures' ? 'Spot' : 'Comprar'}
                          </a>
                          <a
                            href={opp.futuresUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {arbitrageMode === 'spot-futures' ? 'Futuros' : 'Vender'}
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Versão Mobile - Cards */}
          <div className="md:hidden">
            {isLoading && filteredOpps.length === 0 ? (
              <div className="text-center p-8 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Carregando dados...
              </div>
            ) : filteredOpps.length === 0 ? (
              <div className="text-center p-8 text-slate-400">
                Nenhuma oportunidade encontrada
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredOpps.map((opp, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-800/50 transition-colors">
                    {/* Header do Card */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-sm font-bold">
                          {opp.symbolClean.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-lg">{opp.symbolClean}</div>
                          <div className="text-xs text-slate-400">{opp.time}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getSpreadClass(opp.spreadPercent)} flex items-center gap-1`}>
                          <TrendingUp className={`w-4 h-4 ${opp.spreadPercent > 0 ? '' : 'rotate-180'}`} />
                          {opp.spreadPercent > 0 ? '+' : ''}{opp.spreadPercent.toFixed(2)}%
                        </div>
                        <div className={`text-sm font-semibold ${getSpreadClass(opp.spreadPercent)}`}>
                          {opp.spreadDollar > 0 ? '+' : ''}{formatCurrency(Math.abs(opp.spreadDollar))}
                        </div>
                      </div>
                    </div>

                    {/* Exchange */}
                    <div className="mb-3 text-sm text-slate-300 font-semibold">
                      📍 {opp.exchange}
                    </div>

                    {/* Preços */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">
                          {arbitrageMode === 'spot-futures' ? 'Spot' : 'Menor Preço'}
                        </div>
                        <div className="text-green-400 font-mono font-bold text-base">
                          {formatCurrency(opp.spotPrice)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Vol: {formatVolume(opp.spotVolume)}
                        </div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">
                          {arbitrageMode === 'spot-futures' ? 'Futuros' : 'Maior Preço'}
                        </div>
                        <div className="text-orange-400 font-mono font-bold text-base">
                          {formatCurrency(opp.futuresPrice)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Vol: {formatVolume(opp.futuresVolume)}
                        </div>
                      </div>
                    </div>

                    {/* Botões */}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={opp.spotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {arbitrageMode === 'spot-futures' ? 'Spot' : 'Comprar'}
                      </a>
                      <a
                        href={opp.futuresUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {arbitrageMode === 'spot-futures' ? 'Futuros' : 'Vender'}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 md:mt-6 text-center px-2">
          <p className="text-slate-400 text-xs sm:text-sm mb-2">
            💡 <strong>
              {arbitrageMode === 'spot-futures' 
                ? 'Spread positivo: Comprar Spot + Vender Futuros • Spread negativo: Comprar Futuros + Vender Spot'
                : 'Comprar na exchange com menor preço e vender na exchange com maior preço'}
            </strong>
          </p>
          <p className="text-slate-500 text-xs">
            ⚠️ Considere taxas de trading (~0.1%), {arbitrageMode === 'spot-futures' ? 'funding rate,' : 'taxas de transferência,'} slippage e liquidez
          </p>
          <p className="text-green-400 text-xs mt-2">
            ✅ {opportunities.length} oportunidades em {selectedExchanges.length} exchanges • Atualização: 50s
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpotFuturesArbitrage;