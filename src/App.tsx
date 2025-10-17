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
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>(['bybit', 'okx', 'mexc', 'gate', 'bitget']);

  const exchanges = [
    {
      name: 'bybit',
      displayName: 'Bybit',
      color: 'from-orange-500 to-orange-600',
      fetchSpot: async () => {
        const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
        const data = await res.json();
        const map = new Map();
        data.result?.list?.forEach((t: any) => {
          if (t.symbol.endsWith('USDT')) {
            map.set(t.symbol, {
              price: parseFloat(t.lastPrice),
              volume: parseFloat(t.turnover24h || 0)
            });
          }
        });
        return map;
      },
      fetchFutures: async () => {
        const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
        const data = await res.json();
        const map = new Map();
        data.result?.list?.forEach((t: any) => {
          if (t.symbol.endsWith('USDT')) {
            map.set(t.symbol, {
              price: parseFloat(t.lastPrice),
              volume: parseFloat(t.turnover24h || 0)
            });
          }
        });
        return map;
      },
      getSpotUrl: (symbol: string) => `https://www.bybit.com/pt-BR/trade/spot/${symbol}`,
      getFuturesUrl: (symbol: string) => `https://www.bybit.com/pt-BR/trade/usdt/${symbol}`
    },
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
    }
  ];

  const fetchAllOpportunities = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const allOpps: ArbitrageOpp[] = [];

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
  }, [minSpread, selectedExchanges]);

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
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="bg-slate-900 rounded-xl p-6 mb-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <div>
                <h1 className="text-3xl font-bold">Monitor de Arbitragem Spot × Futuros</h1>
                <p className="text-slate-400 text-sm">Bybit • OKX • MEXC • Gate.io • Bitget • Tempo Real</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="w-4 h-4" />
                  Última: {lastUpdate.toLocaleTimeString('pt-BR')}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Atualiza a cada 50 segundos
                </div>
              </div>
              <button
                onClick={fetchAllOpportunities}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Total Oportunidades</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Exchanges Ativas</div>
              <div className="text-3xl font-bold text-blue-400">{stats.exchanges}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Spread Máximo</div>
              <div className="text-3xl font-bold text-orange-400">{stats.maxSpread.toFixed(2)}%</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Spread Médio</div>
              <div className="text-3xl font-bold text-yellow-400">{stats.avgSpread.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 mb-6 border border-slate-800">
          <div className="flex gap-4 items-end mb-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-2">Buscar Moeda</label>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Ex: BTC, ETH, SOL..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Spread Mínimo (%)</label>
              <input
                type="number"
                step="0.1"
                value={minSpread}
                onChange={(e) => setMinSpread(parseFloat(e.target.value) || 0)}
                className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 outline-none focus:border-blue-500"
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
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 text-slate-300 text-sm">
                  <th className="text-left p-4 font-semibold">Time</th>
                  <th className="text-left p-4 font-semibold">Moeda</th>
                  <th className="text-left p-4 font-semibold">Exchange</th>
                  <th className="text-left p-4 font-semibold">Spot</th>
                  <th className="text-left p-4 font-semibold">Futuros</th>
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
                        <span className="font-semibold">{opp.exchange}</span>
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
                            Spot
                          </a>
                          <a
                            href={opp.futuresUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Futuros
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm mb-2">
            💡 <strong>Spread positivo:</strong> Comprar Spot + Vender Futuros • <strong>Spread negativo:</strong> Comprar Futuros + Vender Spot
          </p>
          <p className="text-slate-500 text-xs">
            ⚠️ Considere taxas de trading (~0.1%), funding rate e slippage
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