import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { FinancialEntry, TipoCompra, TipoDespesa, Vendido } from '../types';
import { formatCurrencyShort, formatCurrencyBRL } from '../utils/formatters';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

// Sub-components defined inside the main component file
const KPI: React.FC<{ title: string; value: string; color?: string }> = ({ title, value, color }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
    <h3 className="text-sm font-medium text-gray-400 uppercase">{title}</h3>
    <p className={`mt-1 text-3xl font-semibold ${color ? color : 'text-white'}`}>{value}</p>
  </div>
);

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-700 p-3 border border-gray-600 rounded-md shadow-lg z-50">
                <p className="font-bold text-white mb-1">{label}</p>
                {payload.map((pld: any) => (
                    <p key={pld.dataKey} style={{ color: pld.color }} className="text-sm">
                        {pld.name}: {pld.dataKey === 'roi' ? `${(pld.value * 100).toFixed(1)}%` : formatCurrencyBRL(pld.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Tooltip específico para o ScatterChart (Mapa de Bolhas)
const ScatterTooltip: React.FC<any> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-700 p-3 border border-gray-600 rounded-md shadow-lg z-50">
          <p className="font-bold text-white mb-1">{data.name}</p>
          <p className="text-sm text-cyan-400">
            Lucro: {formatCurrencyBRL(data.z)}
          </p>
        </div>
      );
    }
    return null;
  };

// Coordenadas aproximadas dos estados em um grid 100x100 para o gráfico de dispersão
// Ajustadas para alinhar com o SVG abaixo
const STATE_COORDINATES: { [key: string]: { x: number; y: number } } = {
    'AC': { x: 13, y: 55 }, 
    'AM': { x: 25, y: 75 }, 
    'RR': { x: 35, y: 92 }, 
    'AP': { x: 55, y: 92 },
    'PA': { x: 48, y: 78 },
    'MA': { x: 65, y: 78 },
    'PI': { x: 70, y: 72 },
    'CE': { x: 80, y: 82 },
    'RN': { x: 88, y: 80 },
    'PB': { x: 89, y: 75 },
    'PE': { x: 88, y: 70 },
    'AL': { x: 87, y: 65 },
    'SE': { x: 85, y: 62 },
    'BA': { x: 75, y: 58 },
    'TO': { x: 60, y: 65 },
    'RO': { x: 22, y: 50 },
    'MT': { x: 40, y: 50 },
    'GO': { x: 55, y: 50 },
    'DF': { x: 58, y: 52 },
    'MG': { x: 70, y: 45 },
    'ES': { x: 80, y: 40 },
    'RJ': { x: 76, y: 30 },
    'SP': { x: 62, y: 28 },
    'MS': { x: 42, y: 35 },
    'PR': { x: 55, y: 22 },
    'SC': { x: 58, y: 15 },
    'RS': { x: 50, y: 8 }
  };

// Brazil SVG Path - Optimized for 0 0 100 100 ViewBox
const BrazilSVG = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-gray-700 pointer-events-none" preserveAspectRatio="none">
         <path fill="currentColor" opacity="0.2" d="M34,94 L45,95 L55,98 L60,95 L65,85 L70,82 L80,85 L85,80 L90,82 L95,75 L92,70 L95,65 L88,60 L90,55 L85,50 L80,45 L85,40 L80,35 L75,38 L72,35 L70,30 L65,30 L60,25 L65,20 L60,15 L55,15 L50,10 L45,15 L40,20 L35,25 L30,30 L35,40 L30,50 L25,50 L20,55 L15,60 L20,65 L25,60 L30,65 L35,60 L34,94 Z" transform="scale(1.1, 1.1) translate(-5, -5)"/>
    </svg>
);

const Dashboard: React.FC = () => {
  const { 
    entries, 
    selectedStates, setSelectedStates,
    selectedImoveis, setSelectedImoveis,
    selectedTiposCompra, setSelectedTiposCompra,
    selectedVendido, setSelectedVendido,
    selectedTiposDespesa, setSelectedTiposDespesa,
    selectedCenario, setSelectedCenario
  } = useData();

  // Memoized Filter Options with Cascading Logic
  const { allStates, allImoveis } = useMemo(() => {
    // 1. Get All States available in data
    const states = [...new Set(entries.map(e => e.estado))].sort();
    
    // 2. Get Imoveis, but respect selectedStates (Cascading)
    let filteredEntries = entries;
    if (selectedStates.length > 0) {
        filteredEntries = filteredEntries.filter(e => selectedStates.includes(e.estado));
    }
    const imoveis = [...new Set(filteredEntries.map(e => e.imovel))].sort();
    
    return { allStates: states, allImoveis: imoveis };
  }, [entries, selectedStates]);

  // Memoized Filtered Data
  const filteredData = useMemo(() => {
    return entries.filter(entry => {
      // MANDATORY Filter by Selected Scenario (Defaults to Projected)
      if (entry.cenario !== selectedCenario) return false;

      // Exclude 'Valor Aquisição' from Dashboard Aggregations as it is a reference value
      if (entry.descricao === 'Valor Aquisição') return false;
      
      const stateMatch = selectedStates.length === 0 || selectedStates.includes(entry.estado);
      const imovelMatch = selectedImoveis.length === 0 || selectedImoveis.includes(entry.imovel);
      const tipoCompraMatch = selectedTiposCompra.length === 0 || selectedTiposCompra.includes(entry.tipoCompra);
      const vendidoMatch = selectedVendido.length === 0 || selectedVendido.includes(entry.vendido);
      const tipoDespesaMatch = selectedTiposDespesa.length === 0 || selectedTiposDespesa.includes(entry.tipoDespesa);
      return stateMatch && imovelMatch && tipoCompraMatch && vendidoMatch && tipoDespesaMatch;
    });
  }, [entries, selectedStates, selectedImoveis, selectedTiposCompra, selectedVendido, selectedTiposDespesa, selectedCenario]);

  // 1. CORRECTION: Strict Aggregation Logic for KPIs
  // We use 'cota' (Investor Share) for Dashboard views.
  // Positive Cota = Revenue. Negative Cota = Cost.
  const { receita, custos, lucro } = useMemo(() => {
    let receitaTotal = 0;
    let custosTotais = 0;

    filteredData.forEach(entry => {
      const val = entry.cota;
      if (val > 0) {
        receitaTotal += val;
      } else {
        custosTotais += val; // Adds the negative number
      }
    });

    // Lucro is simple arithmetic sum
    const totalLucro = receitaTotal + custosTotais; 
    return { receita: receitaTotal, custos: custosTotais, lucro: totalLucro };
  }, [filteredData]);

  // 2. CORRECTION: Chart Data Aggregation
  const profitChartData = useMemo(() => {
    type ChartDataAccumulator = { imovel: string; custo: number; lucro: number; receita: number };
    const dataByImovel = filteredData.reduce<{[key: string]: ChartDataAccumulator}>((acc, entry: FinancialEntry) => {
      if (!acc[entry.imovel]) {
        acc[entry.imovel] = { imovel: entry.imovel, custo: 0, lucro: 0, receita: 0 };
      }
      
      // Accumulate Net Profit (Share)
      acc[entry.imovel].lucro += entry.cota;
      
      // Accumulate Absolute Revenue and Cost for Bars
      if (entry.cota > 0) {
        acc[entry.imovel].receita += entry.cota;
      } else {
        acc[entry.imovel].custo += entry.cota; // Keeps negative sign for calculation
      }
      return acc;
    }, {});

    return (Object.values(dataByImovel) as ChartDataAccumulator[]).map(item => ({
      ...item,
      custo: Math.abs(item.custo), // Display as positive bar
      roi: item.custo !== 0 ? item.lucro / Math.abs(item.custo) : 0,
    }));
  }, [filteredData]);

  const revenueChartData = useMemo(() => {
      type RevenueDataAccumulator = { name: string; receita: number, date: Date };
      // We include any positive entry that has a date, or default to 'S/ Data' if critical
      const dataByMonth = filteredData
          .filter(e => e.cota > 0) 
          .reduce<{[key: string]: RevenueDataAccumulator}>((acc, entry: FinancialEntry) => {
              let monthYear = 'S/ Data';
              let dateObj = new Date(0); // Epoch

              if (entry.dataVenda) {
                 dateObj = new Date(entry.dataVenda + 'T00:00:00');
                 monthYear = dateObj.toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' });
              } else if (entry.dataCompra) {
                  // Fallback to purchase date + 1 year logic if needed, or just categorize separately
                  // For now, let's group undated revenues at the end or specific bucket
                  monthYear = 'Proj.';
                  dateObj = new Date(8640000000000000); // Max date
              }

              if (!acc[monthYear]) {
                  acc[monthYear] = { name: monthYear, receita: 0, date: dateObj };
              }
              acc[monthYear].receita += entry.cota;
              return acc;
          }, {});

      return (Object.values(dataByMonth) as RevenueDataAccumulator[]).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredData]);

  const costSummaryData = useMemo(() => {
    const summary = filteredData
      .filter(e => e.cota < 0) // Only strictly negative entries
      .reduce<{[key: string]: { tipoDespesa: TipoDespesa; descricao: string; custoTotal: number; cota: number; }}>((acc, entry: FinancialEntry) => {
        const key = `${entry.tipoDespesa}-${entry.descricao}`;
        if (!acc[key]) {
          acc[key] = { tipoDespesa: entry.tipoDespesa, descricao: entry.descricao, custoTotal: 0, cota: 0 };
        }
        acc[key].custoTotal += entry.fluxoCaixa;
        acc[key].cota += entry.cota;
        return acc;
      }, {});
      
      // Sort by cota absolute descending (most expensive first) for the table, 
      // but re-sort for chart maybe? Charts usually look better sorted.
    return (Object.values(summary) as { tipoDespesa: TipoDespesa; descricao: string; custoTotal: number; cota: number; }[]).sort((a, b) => a.cota - b.cota); 
  }, [filteredData]);
  
  const totalCostSummary = useMemo(() => {
    return costSummaryData.reduce<{ custoTotal: number; cota: number }>((acc, item) => {
        acc.custoTotal += item.custoTotal;
        acc.cota += item.cota;
        return acc;
    }, {custoTotal: 0, cota: 0});
  }, [costSummaryData]);
  
  // Data prepared specifically for Horizontal Bar Chart
  const costBarChartData = useMemo(() => {
      return costSummaryData.map(item => ({
          name: item.descricao,
          value: Math.abs(item.cota) // Positive value for chart length
      })).sort((a, b) => b.value - a.value); // Biggest on top usually, but rechart draws bottom up usually so lets test
  }, [costSummaryData]);

  const bubbleMapData = useMemo(() => {
    const dataByState = filteredData.reduce<{ [key: string]: { name: string; lucro: number } }>((acc, entry: FinancialEntry) => {
      if (!acc[entry.estado]) {
        acc[entry.estado] = { name: entry.estado, lucro: 0 };
      }
      acc[entry.estado].lucro += entry.cota;
      return acc;
    }, {});

    return (Object.values(dataByState) as { name: string; lucro: number }[])
      .filter(item => STATE_COORDINATES[item.name]) // Ensure we have coords
      .map(item => ({
        name: item.name,
        x: STATE_COORDINATES[item.name].x,
        y: STATE_COORDINATES[item.name].y,
        z: item.lucro,
        fill: item.lucro >= 0 ? '#34d399' : '#f87171' // Green for profit, Red for loss
      }));
  }, [filteredData]);


  const handleMultiSelect = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  };

  return (
    <div className="grid grid-cols-12 gap-6 animate-fade-in">
      <div className="col-span-12 lg:col-span-3 bg-gray-800 p-6 rounded-lg shadow-lg h-fit sticky top-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">Filtros</h3>
            <button 
                onClick={() => {
                    setSelectedStates([]);
                    setSelectedImoveis([]);
                    setSelectedTiposCompra([]);
                    setSelectedVendido([]);
                    setSelectedTiposDespesa([]);
                }}
                className="text-xs text-cyan-500 hover:text-cyan-400"
            >
                Limpar
            </button>
        </div>
        <div className="space-y-4">
            {/* Scenario Filter - Radio Group */}
            <div className="bg-gray-700 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-300 mb-2">Cenário</label>
                <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="cenario"
                            value="Projetado"
                            checked={selectedCenario === 'Projetado'}
                            onChange={() => setSelectedCenario('Projetado')}
                            className="text-cyan-600 focus:ring-cyan-500 bg-gray-800 border-gray-600"
                        />
                        <span className="text-sm text-white">Projetado</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="cenario" 
                            value="Executado"
                            checked={selectedCenario === 'Executado'}
                            onChange={() => setSelectedCenario('Executado')}
                            className="text-cyan-600 focus:ring-cyan-500 bg-gray-800 border-gray-600"
                        />
                        <span className="text-sm text-white">Executado</span>
                    </label>
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
              <select value={selectedStates[0] || ''} onChange={(e) => {
                  // Clear selected imovel if state changes to avoid invalid selection
                  setSelectedImoveis([]);
                  setSelectedStates(e.target.value ? [e.target.value] : []);
              }} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white">
                  <option value="">Todos</option>
                  {allStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Imóvel</label>
              <select value={selectedImoveis[0] || ''} onChange={(e) => setSelectedImoveis(e.target.value ? [e.target.value] : [])} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white">
                  <option value="">Todos</option>
                  {allImoveis.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Despesa</label>
               <select value={selectedTiposDespesa[0] || ''} onChange={(e) => setSelectedTiposDespesa(e.target.value ? [e.target.value] : [])} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white">
                  <option value="">Todos</option>
                  {Object.values(TipoDespesa).map(td => <option key={td} value={td}>{td}</option>)}
              </select>
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Tipo Compra</label>
                <div className="grid grid-cols-2 gap-2">
                {Object.values(TipoCompra).map(tc => (
                    <div key={tc} className="flex items-center">
                        <input id={`cb-tc-${tc}`} type="checkbox" checked={selectedTiposCompra.includes(tc)} onChange={() => handleMultiSelect(setSelectedTiposCompra, tc)} className="h-4 w-4 rounded border-gray-500 text-cyan-600 focus:ring-cyan-500 bg-gray-700" />
                        <label htmlFor={`cb-tc-${tc}`} className="ml-2 block text-xs text-gray-300 cursor-pointer">{tc}</label>
                    </div>
                ))}
                </div>
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Status</label>
                <div className="grid grid-cols-2 gap-2">
                {Object.values(Vendido).map(v => (
                    <div key={v} className="flex items-center">
                        <input id={`cb-v-${v}`} type="checkbox" checked={selectedVendido.includes(v)} onChange={() => handleMultiSelect(setSelectedVendido, v)} className="h-4 w-4 rounded border-gray-500 text-cyan-600 focus:ring-cyan-500 bg-gray-700"/>
                        <label htmlFor={`cb-v-${v}`} className="ml-2 block text-xs text-gray-300 cursor-pointer">{v === 'Sim' ? 'Vendido' : 'Em Carteira'}</label>
                    </div>
                ))}
                </div>
            </div>
        </div>
      </div>
      
      <div className="col-span-12 lg:col-span-9 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPI title="Receita (Cota)" value={formatCurrencyShort(receita)} color="text-cyan-400" />
            <KPI title="Custos (Cota)" value={formatCurrencyShort(custos)} color="text-red-400" />
            <KPI title="Lucro Líquido (Cota)" value={formatCurrencyShort(lucro)} color={lucro >= 0 ? "text-green-400" : "text-red-500"} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-8 bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-white">Performance por Imóvel</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={profitChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="imovel" stroke="#9ca3af" fontSize={12} />
                        <YAxis yAxisId="left" stroke="#9ca3af" tickFormatter={(tick) => formatCurrencyShort(tick)} fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} fontSize={12} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#374151', opacity: 0.2}} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar yAxisId="left" dataKey="lucro" name="Lucro Líquido" fill="#34d399" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="roi" name="ROI" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: '#22d3ee' }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            
            <div className="col-span-12 xl:col-span-4 bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
                <h3 className="text-xl font-semibold mb-4 text-white">Mapa de Lucro</h3>
                <div className="flex-grow relative">
                    {/* SVG Background for Map */}
                    <BrazilSVG />
                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                        <ScatterChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <XAxis type="number" dataKey="x" name="Longitude" hide domain={[0, 100]} />
                            <YAxis type="number" dataKey="y" name="Latitude" hide domain={[0, 100]} />
                            <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Lucro" />
                            <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Estados" data={bubbleMapData} fill="#8884d8" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
             <div className="col-span-12 xl:col-span-5 bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-white">Projeção de Receitas</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" tickFormatter={(tick) => formatCurrencyShort(tick)} fontSize={12} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#374151', opacity: 0.2}} />
                        <Bar dataKey="receita" name="Receita" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="col-span-12 xl:col-span-7 bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-white">Composição de Custos</h3>
                 <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={costBarChartData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                <XAxis type="number" stroke="#9ca3af" tickFormatter={(tick) => formatCurrencyShort(tick)} fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={100} />
                                <Tooltip cursor={{fill: '#374151', opacity: 0.2}} formatter={(value: number) => formatCurrencyBRL(value)} />
                                <Bar dataKey="value" name="Custo" fill="#f87171" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 overflow-auto max-h-64">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-300 uppercase bg-gray-700 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2">Descrição</th>
                                    <th className="px-3 py-2 text-right">Valor (Cota)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {costSummaryData.map((item, index) => (
                                    <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                                        <td className="px-3 py-2 truncate max-w-[150px]">{item.descricao}</td>
                                        <td className="px-3 py-2 text-right font-mono text-white">{formatCurrencyBRL(Math.abs(item.cota))}</td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot>
                                <tr className="font-bold text-white bg-gray-700">
                                    <td className="px-3 py-2 text-right">Total</td>
                                    <td className="px-3 py-2 text-right font-mono">{formatCurrencyBRL(Math.abs(totalCostSummary.cota))}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;