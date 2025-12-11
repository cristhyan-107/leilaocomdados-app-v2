import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { StatusEntry, ESTADOS_BRASIL, Vendido } from '../types';
import { formatCurrencyBRL } from '../utils/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const StatusPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lancamentos'>('dashboard');

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-900 p-6 animate-fade-in">
        {/* Tabs */}
        <div className="flex space-x-1 border-b border-gray-700 mb-6">
             <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 border-t border-l border-r ${
                    activeTab === 'dashboard'
                    ? 'bg-gray-800 text-cyan-400 border-gray-700'
                    : 'bg-gray-900 text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800'
                }`}
            >
                Dashboard
            </button>
             <button
                onClick={() => setActiveTab('lancamentos')}
                className={`px-6 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 border-t border-l border-r ${
                    activeTab === 'lancamentos'
                    ? 'bg-gray-800 text-cyan-400 border-gray-700'
                    : 'bg-gray-900 text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800'
                }`}
            >
                Lançamentos
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
            {activeTab === 'lancamentos' ? <LancamentosStatusView /> : <DashboardStatusView />}
        </div>
    </div>
  );
};

// --- View: Lancamentos (Table) ---
const LancamentosStatusView: React.FC = () => {
    const { statusEntries, updateStatusEntry } = useData();

    // Helper to calculate diff in days
    const calculateDays = (start?: string, end?: string) => {
        if (!start) return 0;
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : new Date();
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    };

    const handleDateChange = (imovel: string, field: keyof StatusEntry, value: string) => {
        const entry = statusEntries.find(e => e.imovel === imovel);
        if (entry) {
            updateStatusEntry({ ...entry, [field]: value });
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-full">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">Cronograma de Etapas</h2>
            </div>
            <div className="overflow-auto flex-1 p-4">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 min-w-[150px]">Imóvel</th>
                            <th className="px-4 py-3 w-20">UF</th>
                            <th className="px-4 py-3">Aquisição</th>
                            <th className="px-4 py-3">Registro</th>
                            <th className="px-4 py-3">Imissão</th>
                            <th className="px-4 py-3">Desocupação</th>
                            <th className="px-4 py-3">Início Reforma</th>
                            <th className="px-4 py-3">Venda</th>
                            <th className="px-4 py-3 text-right font-bold text-cyan-400">Total Dias</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {statusEntries.map((entry) => (
                            <tr key={entry.imovel} className="bg-gray-800 hover:bg-gray-750">
                                <td className="px-4 py-3 font-medium text-white">{entry.imovel}</td>
                                <td className="px-4 py-3">{entry.estado}</td>
                                <td className="px-4 py-3">
                                    <input type="date" value={entry.dataAquisicao || ''} onChange={(e) => handleDateChange(entry.imovel, 'dataAquisicao', e.target.value)} className="bg-gray-900 border-transparent rounded px-2 py-1 text-white w-32" />
                                </td>
                                <td className="px-4 py-3">
                                    <input type="date" value={entry.dataRegistro || ''} onChange={(e) => handleDateChange(entry.imovel, 'dataRegistro', e.target.value)} className="bg-gray-900 border-transparent rounded px-2 py-1 text-white w-32" />
                                </td>
                                <td className="px-4 py-3">
                                    <input type="date" value={entry.dataImissaoPosse || ''} onChange={(e) => handleDateChange(entry.imovel, 'dataImissaoPosse', e.target.value)} className="bg-gray-900 border-transparent rounded px-2 py-1 text-white w-32" />
                                </td>
                                <td className="px-4 py-3">
                                    <input type="date" value={entry.dataDesocupacao || ''} onChange={(e) => handleDateChange(entry.imovel, 'dataDesocupacao', e.target.value)} className="bg-gray-900 border-transparent rounded px-2 py-1 text-white w-32" />
                                </td>
                                <td className="px-4 py-3">
                                    <input type="date" value={entry.dataIncioReforma || ''} onChange={(e) => handleDateChange(entry.imovel, 'dataIncioReforma', e.target.value)} className="bg-gray-900 border-transparent rounded px-2 py-1 text-white w-32" />
                                </td>
                                <td className="px-4 py-3">
                                    <input type="date" value={entry.dataVenda || ''} onChange={(e) => handleDateChange(entry.imovel, 'dataVenda', e.target.value)} className="bg-gray-900 border-transparent rounded px-2 py-1 text-white w-32" />
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-cyan-400">
                                    {calculateDays(entry.dataAquisicao, entry.dataVenda)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- View: Dashboard (Analytics) ---
const DashboardStatusView: React.FC = () => {
    const { statusEntries, entries } = useData();

    // Filters
    const [filterVendido, setFilterVendido] = useState<string>('');
    const [filterReformado, setFilterReformado] = useState<string>('');
    const [filterEstado, setFilterEstado] = useState<string>('');
    const [filterImoveis, setFilterImoveis] = useState<string[]>([]);

    const uniqueEstados = useMemo(() => Array.from(new Set(statusEntries.map(e => e.estado))).sort(), [statusEntries]);
    const uniqueImovelNames = useMemo(() => {
        let list = statusEntries;
        if (filterEstado) list = list.filter(e => e.estado === filterEstado);
        return list.map(e => e.imovel).sort();
    }, [statusEntries, filterEstado]);

    const toggleImovelFilter = (imovel: string) => {
        setFilterImoveis(prev => prev.includes(imovel) ? prev.filter(i => i !== imovel) : [...prev, imovel]);
    };

    // Filter Logic
    const filteredData = useMemo(() => {
        return statusEntries.filter(entry => {
            // Main Property Data Check (for Vendido status)
            const mainData = entries.find(e => e.imovel === entry.imovel);
            
            if (filterVendido) {
                const isSold = mainData?.vendido === Vendido.Sim ? 'Sim' : 'Não';
                if (filterVendido !== isSold) return false;
            }

            if (filterReformado) {
                const isRef = entry.dataIncioReforma ? 'Sim' : 'Não';
                if (filterReformado !== isRef) return false;
            }

            if (filterEstado && entry.estado !== filterEstado) return false;
            if (filterImoveis.length > 0 && !filterImoveis.includes(entry.imovel)) return false;

            return true;
        });
    }, [statusEntries, entries, filterVendido, filterReformado, filterEstado, filterImoveis]);

    // --- Metrics & Charts Data ---

    const diffDays = (start?: string, end?: string) => {
        if (!start || !end) return 0;
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diff = d2.getTime() - d1.getTime();
        return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
    };

    const avgDurationData = useMemo(() => {
        let registroSum = 0, imissaoSum = 0, desocupacaoSum = 0, reformaSum = 0, vendaSum = 0;
        let regCount = 0, imiCount = 0, desCount = 0, refCount = 0, venCount = 0;

        filteredData.forEach(e => {
            if (e.dataRegistro && e.dataAquisicao) { registroSum += diffDays(e.dataAquisicao, e.dataRegistro); regCount++; }
            if (e.dataImissaoPosse && e.dataRegistro) { imissaoSum += diffDays(e.dataRegistro, e.dataImissaoPosse); imiCount++; }
            if (e.dataDesocupacao && e.dataImissaoPosse) { desocupacaoSum += diffDays(e.dataImissaoPosse, e.dataDesocupacao); desCount++; }
            if (e.dataVenda && e.dataIncioReforma) { reformaSum += diffDays(e.dataIncioReforma, e.dataVenda); refCount++; }
            if (e.dataVenda && e.dataAquisicao) { vendaSum += diffDays(e.dataAquisicao, e.dataVenda); venCount++; }
        });

        return [
            { name: 'Registro', dias: regCount ? Math.round(registroSum / regCount) : 0 },
            { name: 'Imissão', dias: imiCount ? Math.round(imissaoSum / imiCount) : 0 },
            { name: 'Desocupação', dias: desCount ? Math.round(desocupacaoSum / desCount) : 0 },
            { name: 'Reforma', dias: refCount ? Math.round(reformaSum / refCount) : 0 },
            { name: 'Venda (Total)', dias: venCount ? Math.round(vendaSum / venCount) : 0 },
        ];
    }, [filteredData]);

    const acquiredPerYear = useMemo(() => {
        const counts: {[key: string]: number} = {};
        filteredData.forEach(e => {
            if (e.dataAquisicao) {
                const year = e.dataAquisicao.substring(0, 4);
                counts[year] = (counts[year] || 0) + 1;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => a.name.localeCompare(b.name));
    }, [filteredData]);

    const soldPerYear = useMemo(() => {
        const counts: {[key: string]: number} = {};
        filteredData.forEach(e => {
            if (e.dataVenda) {
                const year = e.dataVenda.substring(0, 4);
                counts[year] = (counts[year] || 0) + 1;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => a.name.localeCompare(b.name));
    }, [filteredData]);

    // Status Icon Helper with Pending Logic
    const StatusIcon = ({ status }: { status: 'ok' | 'pending' | 'neutral' }) => {
        if (status === 'ok') return <span className="text-green-400">●</span>;
        if (status === 'pending') return <span className="text-red-500 animate-pulse">●</span>;
        return <span className="text-gray-600">○</span>;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-700 p-3 border border-gray-600 rounded shadow-lg">
                    <p className="font-bold text-white mb-1">{label}</p>
                    <p className="text-sm text-cyan-400">{payload[0].value} {payload[0].dataKey === 'value' ? 'Imóveis' : 'Dias'}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6">
            {/* Sidebar Filters */}
            <aside className="w-full lg:w-64 bg-gray-800 p-4 rounded-lg shadow-lg flex-shrink-0 space-y-4 h-fit overflow-y-auto max-h-full">
                <h3 className="text-lg font-semibold text-white mb-2">Filtros</h3>
                
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Vendido</label>
                    <select value={filterVendido} onChange={e => setFilterVendido(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm text-white">
                        <option value="">Todos</option>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Reformado</label>
                    <select value={filterReformado} onChange={e => setFilterReformado(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm text-white">
                        <option value="">Todos</option>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Estado</label>
                    <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm text-white">
                        <option value="">Todos</option>
                        {uniqueEstados.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Imóvel</label>
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-600 rounded p-2 bg-gray-700">
                         {uniqueImovelNames.map(imovel => (
                             <label key={imovel} className="flex items-center space-x-2 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={filterImoveis.includes(imovel)}
                                    onChange={() => toggleImovelFilter(imovel)}
                                    className="rounded border-gray-500 bg-gray-600 text-cyan-500 focus:ring-cyan-500"
                                 />
                                 <span className="text-xs text-gray-300 truncate">{imovel}</span>
                             </label>
                         ))}
                    </div>
                </div>

                <button 
                    onClick={() => {
                        setFilterVendido('');
                        setFilterReformado('');
                        setFilterEstado('');
                        setFilterImoveis([]);
                    }}
                    className="w-full mt-4 text-xs text-cyan-500 hover:text-cyan-400 border border-gray-700 rounded py-2"
                >
                    Limpar Filtros
                </button>
            </aside>

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                
                {/* Timeline Table */}
                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-700">
                        <h4 className="text-base font-semibold text-white">Prazos por Etapa (Dias)</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                                <tr>
                                    <th className="px-4 py-2">Imóvel</th>
                                    <th className="px-4 py-2 text-center">Registro</th>
                                    <th className="px-4 py-2 text-center">Imissão</th>
                                    <th className="px-4 py-2 text-center">Desocupa.</th>
                                    <th className="px-4 py-2 text-center">Reforma</th>
                                    <th className="px-4 py-2 text-center">Venda</th>
                                    <th className="px-4 py-2 text-right text-white">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredData.map(entry => {
                                    const regDays = diffDays(entry.dataAquisicao, entry.dataRegistro);
                                    const imiDays = diffDays(entry.dataRegistro, entry.dataImissaoPosse);
                                    const desDays = diffDays(entry.dataImissaoPosse, entry.dataDesocupacao);
                                    const refDays = diffDays(entry.dataDesocupacao, entry.dataIncioReforma); // Gap before reform
                                    
                                    // Sale Days Calculation (Venda or Today - Reforma)
                                    const saleDays = diffDays(entry.dataIncioReforma, entry.dataVenda || new Date().toISOString());
                                    
                                    // Status Logic
                                    const isRegistroOk = !!entry.dataRegistro;
                                    const isDesocupacaoOk = !!entry.dataDesocupacao;
                                    const isReformaOk = !!entry.dataIncioReforma;
                                    const isVendaOk = !!entry.dataVenda;

                                    return (
                                        <tr key={entry.imovel} className="hover:bg-gray-700">
                                            <td className="px-4 py-2 font-medium text-white">{entry.imovel}</td>
                                            
                                            {/* Registro */}
                                            <td className="px-4 py-2 text-center space-x-1">
                                                <StatusIcon status={isRegistroOk ? 'ok' : 'pending'} /> 
                                                <span>{regDays || '-'}</span>
                                            </td>
                                            
                                            {/* Imissão (Neutral if empty) */}
                                            <td className="px-4 py-2 text-center space-x-1">
                                                 <StatusIcon status={entry.dataImissaoPosse ? 'ok' : 'neutral'} /> 
                                                 <span>{imiDays || '-'}</span>
                                            </td>
                                            
                                            {/* Desocupação */}
                                            <td className="px-4 py-2 text-center space-x-1">
                                                 <StatusIcon status={isDesocupacaoOk ? 'ok' : 'pending'} /> 
                                                 <span>{desDays || '-'}</span>
                                            </td>
                                            
                                            {/* Reforma */}
                                            <td className="px-4 py-2 text-center space-x-1">
                                                {/* Red if Desocupacao is done but Reforma not started */}
                                                 <StatusIcon status={isReformaOk ? 'ok' : (isDesocupacaoOk ? 'pending' : 'neutral')} /> 
                                                 <span>{refDays || '-'}</span>
                                            </td>
                                            
                                            {/* Venda */}
                                            <td className="px-4 py-2 text-center space-x-1">
                                                {/* Red if Reforma started but Venda not done */}
                                                 <StatusIcon status={isVendaOk ? 'ok' : (isReformaOk ? 'pending' : 'neutral')} /> 
                                                 <span>{saleDays || '-'}</span>
                                            </td>
                                            
                                            <td className="px-4 py-2 text-right font-bold text-cyan-400">
                                                {diffDays(entry.dataAquisicao, entry.dataVenda || new Date().toISOString())}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Chart: Average Days */}
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                        <h4 className="text-base font-semibold text-white mb-4">Média de Dias por Etapa</h4>
                        <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={avgDurationData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                                    <YAxis stroke="#9ca3af" fontSize={10} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#374151', opacity: 0.2}} />
                                    <Bar dataKey="dias" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-rows-2 gap-6">
                        {/* Chart: Acquired per Year */}
                         <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                            <h4 className="text-base font-semibold text-white mb-4">Imóveis Adquiridos por Ano</h4>
                            <div className="h-24">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={acquiredPerYear}>
                                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#374151', opacity: 0.2}} />
                                        <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                         {/* Chart: Sold per Year */}
                         <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                            <h4 className="text-base font-semibold text-white mb-4">Imóveis Vendidos por Ano</h4>
                            <div className="h-24">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={soldPerYear}>
                                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#374151', opacity: 0.2}} />
                                        <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};


export default StatusPage;