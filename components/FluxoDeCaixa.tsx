import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useData } from '../context/DataContext';
import { ESTADOS_BRASIL, TipoDespesa, CashFlowEntry, Vendido } from '../types';
import { formatCurrencyBRL, formatCurrencyShort, parseCurrencyBRL } from '../utils/formatters';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    Legend
} from 'recharts';

// Mapping Definition
const SUBTIPO_MAPPING: { [key: string]: string } = {
    'Advogado – Indisponibilidade': TipoDespesa.CustoPreparacao,
    'Anúncio': TipoDespesa.CustoManutencao,
    'Cartório': TipoDespesa.CustoAquisicao,
    'Condomínio': TipoDespesa.CustoManutencao,
    'Desocupação': TipoDespesa.CustoPreparacao,
    'Entrada': TipoDespesa.CustoAquisicao,
    'Imposto IPTU': TipoDespesa.CustoManutencao,
    'Imposto ITBI': TipoDespesa.CustoAquisicao,
    'Outros': 'Outros', // Handles manually
    'Parcela': TipoDespesa.CustoManutencao,
    'Reforma': TipoDespesa.CustoPreparacao,
    'Venda': TipoDespesa.Venda
};

const SUBTIPO_OPTIONS = Object.keys(SUBTIPO_MAPPING).sort();

// Helper Component for Money Input (Free Typing)
const MoneyInput: React.FC<{
    value: number;
    onChange: (val: number) => void;
    className?: string;
    placeholder?: string;
}> = ({ value, onChange, className, placeholder }) => {
    const [displayValue, setDisplayValue] = useState(value === 0 ? '' : formatCurrencyBRL(value));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(value === 0 ? '' : formatCurrencyBRL(value));
        }
    }, [value, isFocused]);

    const handleFocus = () => {
        setIsFocused(true);
        setDisplayValue(value === 0 ? '' : value.toString().replace('.', ','));
    };

    const handleBlur = () => {
        setIsFocused(false);
        let valString = displayValue.replace(/\./g, '').replace(',', '.');
        let numericVal = parseFloat(valString);
        if (isNaN(numericVal)) numericVal = 0;

        onChange(numericVal);
        setDisplayValue(numericVal === 0 ? '' : formatCurrencyBRL(numericVal));
    };

    return (
        <input
            type="text"
            value={displayValue}
            onChange={(e) => setDisplayValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={className}
            placeholder={placeholder}
        />
    );
};

// --- SUB-COMPONENT: LANCAMENTOS VIEW (Existing Table Logic) ---
const LancamentosView: React.FC = () => {
    const { entries, cashFlowEntries, addCashFlowEntry, addBatchCashFlowEntries, updateCashFlowEntry, deleteCashFlowEntry } = useData();
    const [selectedState, setSelectedState] = useState<string>('');
    const [selectedImovel, setSelectedImovel] = useState<string>('');

    // Splitwise Integration
    const location = useLocation();
    const navigate = useNavigate();
    const [isSyncing, setIsSyncing] = useState(false);

    // Helper to get or create a stable User ID for this local session
    const getUserId = () => {
        let uid = localStorage.getItem('app_user_id');
        if (!uid) {
            uid = crypto.randomUUID();
            localStorage.setItem('app_user_id', uid);
        }
        return uid;
    };

    const handleConnectSplitwise = () => {
        if (!selectedImovel) return;
        const userId = getUserId();
        // Reverted to separate file: /api/splitwise/auth
        const authUrl = `/api/splitwise/auth?property=${encodeURIComponent(selectedImovel)}&userId=${userId}`;
        window.open(authUrl, '_blank');
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const status = params.get('status');
        const property = params.get('property');

        if (status === 'connected' && property) {
            // If we just returned from Splitwise, trigger sync automatically
            syncSplitwise(property);
            // Clean URL
            navigate('/fluxo-caixa', { replace: true });
        }
    }, [location]);

    const syncSplitwise = async (propName: string) => {
        setIsSyncing(true);
        try {
            const userId = getUserId();
            const encodedProp = encodeURIComponent(propName);
            // Reverted to separate file: /api/splitwise/sync
            const response = await axios.get(`/api/splitwise/sync?property=${encodedProp}&userId=${userId}`);

            const { expenses, group_id } = response.data;

            if (!expenses || expenses.length === 0) {
                alert('Conectado com sucesso, mas nenhuma despesa nova encontrada.');
                setIsSyncing(false);
                return;
            }

            // Convert expenses to CashFlowEntries
            const newEntries: Omit<CashFlowEntry, 'id'>[] = [];

            // We need the numCotistas for this property to calculate quota share
            // Assuming we are syncing for the *property passed in param* which should match selectedImovel or we find it
            const propEntry = entries.find(e => e.imovel === propName);
            const numCotistas = propEntry?.numCotistas || 1;

            let addedCount = 0;

            expenses.forEach((exp: any) => {
                // Check duplicates (simple check by description + date + cost)
                const exists = cashFlowEntries.some(e =>
                    e.imovelId === propName &&
                    // e.data === exp.date.split('T')[0] && // Date format might vary
                    e.descricao === exp.description &&
                    Math.abs(e.custoTotal - parseFloat(exp.cost)) < 0.1
                );

                if (!exists) {
                    const cost = parseFloat(exp.cost);
                    newEntries.push({
                        imovelId: propName,
                        data: exp.date.split('T')[0], // ISO date from API
                        subtipo: 'Outros', // Default
                        tipoDespesa: '',
                        descricao: exp.description,
                        custoTotal: cost,
                        custoCota: cost / numCotistas,
                        dedutivel: 'Sim'
                    });
                    addedCount++;
                }
            });

            if (newEntries.length > 0) {
                addBatchCashFlowEntries(newEntries);
                alert(`${addedCount} lançamentos importados do Splitwise (Grupo ID: ${group_id})!`);
            } else {
                alert('Conectado! Todos os lançamentos do grupo já estão no sistema.');
            }

        } catch (error) {
            console.error('Splitwise Sync Error:', error);
            alert('Erro ao sincronizar com Splitwise. Verifique se a conexão foi estabelecida.');
        } finally {
            setIsSyncing(false);
        }
    };

    const uniqueImoveis = useMemo(() => {
        let filtered = entries;
        if (selectedState) {
            filtered = filtered.filter(e => e.estado === selectedState);
        }
        return Array.from(new Set(filtered.map(e => e.imovel))).sort();
    }, [entries, selectedState]);

    const rows = useMemo(() => {
        if (!selectedImovel) return [];
        return cashFlowEntries.filter(e => e.imovelId === selectedImovel);
    }, [cashFlowEntries, selectedImovel]);

    const numCotistas = useMemo(() => {
        if (!selectedImovel) return 1;
        const entry = entries.find(e => e.imovel === selectedImovel);
        return entry?.numCotistas || 1;
    }, [selectedImovel, entries]);

    const handleAddRow = () => {
        if (!selectedImovel) return;
        const newRow: Omit<CashFlowEntry, 'id'> = {
            imovelId: selectedImovel,
            data: new Date().toISOString().split('T')[0],
            subtipo: '',
            tipoDespesa: '',
            descricao: '',
            custoTotal: 0,
            custoCota: 0,
            dedutivel: 'Sim'
        };
        addCashFlowEntry(newRow);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedImovel) {
            alert("Por favor, selecione um imóvel antes de importar.");
            e.target.value = ''; // Reset input
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Basic CSV Parsing (handling quotes somewhat)
            // Split by lines
            const lines = text.split(/\r?\n/);

            // Expected Splitwise CSV usually: Date, Description, Category, Cost, Currency, User1, User2...
            // Index: 0=Date, 1=Description, 2=Category, 3=Cost, 4=Currency

            const newEntries: Omit<CashFlowEntry, 'id'>[] = [];
            let skippedCount = 0;
            let duplicateCount = 0;

            // Skip Header (Index 0)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Robust split handling quoted fields with commas
                // Regex matches: "quoted,field" OR non-quoted-field
                const matches = line.match(/(?:^|,)(?:"([^"]*)"|([^,]*))/g);
                if (!matches) continue;

                const cols = matches.map(m => {
                    let val = m.replace(/^,/, ''); // Remove leading comma
                    if (val.startsWith('"') && val.endsWith('"')) {
                        val = val.slice(1, -1); // Remove quotes
                    }
                    return val.trim();
                });

                if (cols.length < 4) continue;

                const dateRaw = cols[0];
                const description = cols[1];
                const category = cols[2];
                const costRaw = cols[3];
                // const currency = cols[4];

                // --- FILTERS ---
                // 1. Ignore Payments/Transfers
                if (category.toLowerCase().includes('payment') || category.toLowerCase().includes('pagamento')) {
                    skippedCount++;
                    continue;
                }
                // 2. Ignore Description Patterns (Settlements)
                const descLower = description.toLowerCase();
                if (descLower.includes('saldo total') ||
                    descLower.includes('quitar todos os saldos') ||
                    descLower.includes('pagou') || // "Fulano pagou Ciclano"
                    descLower.includes('settled')
                ) {
                    skippedCount++;
                    continue;
                }
                // 3. Ignore empty cost
                if (!costRaw) {
                    skippedCount++;
                    continue;
                }

                // --- PARSING ---
                let cost = parseFloat(costRaw);
                // Handle locale issues if costRaw is "1.234,56" or "1,234.56" -> Splitwise usually standard CSV (dot decimal)
                // But if it fails, try replacing comma
                if (isNaN(cost)) {
                    cost = parseFloat(costRaw.replace(',', '.'));
                }
                if (isNaN(cost) || cost === 0) {
                    skippedCount++;
                    continue;
                }

                // Date Normalization
                // Splitwise can be YYYY-MM-DD or DD/MM/YYYY or MMM DD, YYYY
                let validDate = '';
                // Try ISO
                if (dateRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    validDate = dateRaw;
                }
                // Try DD/MM/YYYY
                else if (dateRaw.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                    const parts = dateRaw.split('/');
                    validDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
                // Fallback to today if fail, or skip? Let's fallback to today to allow manual fix
                else {
                    try {
                        const d = new Date(dateRaw);
                        if (!isNaN(d.getTime())) {
                            validDate = d.toISOString().split('T')[0];
                        } else {
                            validDate = new Date().toISOString().split('T')[0];
                        }
                    } catch {
                        validDate = new Date().toISOString().split('T')[0];
                    }
                }

                // --- DUPLICATE PREVENTION ---
                // Check if exact same entry exists for this property
                const exists = cashFlowEntries.some(e =>
                    e.imovelId === selectedImovel &&
                    e.data === validDate &&
                    e.descricao === description &&
                    Math.abs(e.custoTotal - cost) < 0.01 // Floating point tolerance
                );

                if (exists) {
                    duplicateCount++;
                    continue;
                }

                // --- CREATION ---
                newEntries.push({
                    imovelId: selectedImovel,
                    data: validDate,
                    subtipo: 'Outros', // Default as requested
                    tipoDespesa: TipoDespesa.CustoManutencao, // Default generic
                    descricao: description,
                    custoTotal: cost,
                    custoCota: cost / numCotistas,
                    dedutivel: 'Sim'
                });
            }

            if (newEntries.length > 0) {
                addBatchCashFlowEntries(newEntries);
                alert(`Importação concluída!\n${newEntries.length} lançamentos adicionados.\n${skippedCount} ignorados (Pagamentos/Inválidos).\n${duplicateCount} duplicatas ignoradas.`);
            } else {
                alert(`Nenhum lançamento novo encontrado.\n${skippedCount} ignorados.\n${duplicateCount} duplicatas.`);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset
    };

    const handleRowChange = (id: string, field: keyof CashFlowEntry, value: any) => {
        const row = rows.find(r => r.id === id);
        if (!row) return;

        const updatedRow = { ...row, [field]: value };

        if (field === 'subtipo') {
            const mapping = SUBTIPO_MAPPING[value as string];
            if (mapping === 'Outros') {
                updatedRow.tipoDespesa = '';
            } else {
                updatedRow.tipoDespesa = mapping || '';
            }
            if (value === 'Anúncio') {
                updatedRow.dedutivel = 'Não';
            } else {
                updatedRow.dedutivel = 'Sim';
            }
        }

        if (field === 'custoTotal') {
            updatedRow.custoCota = (value as number) / numCotistas;
        }

        updateCashFlowEntry(updatedRow);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Filters & Actions */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div className="flex space-x-4 w-full md:w-auto">
                    <div className="w-1/3 md:w-40">
                        <label className="block text-xs font-medium text-gray-400 mb-1">Estado</label>
                        <select
                            value={selectedState}
                            onChange={(e) => { setSelectedState(e.target.value); setSelectedImovel(''); }}
                            className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                        >
                            <option value="">Todos</option>
                            {ESTADOS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                    </div>
                    <div className="w-2/3 md:w-64">
                        <label className="block text-xs font-medium text-gray-400 mb-1">Imóvel</label>
                        <select
                            value={selectedImovel}
                            onChange={(e) => setSelectedImovel(e.target.value)}
                            className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                        >
                            <option value="">Selecione um imóvel...</option>
                            {uniqueImoveis.map(imovel => <option key={imovel} value={imovel}>{imovel}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {selectedImovel && (
                        <>
                            <span className="text-xs text-gray-400 bg-gray-700 px-3 py-1 rounded-full">
                                Cotistas: <strong className="text-white">{numCotistas}</strong>
                            </span>

                            <button
                                onClick={handleConnectSplitwise}
                                disabled={isSyncing}
                                className="bg-[#2FA492] hover:bg-[#258374] text-white text-sm font-medium py-2 px-4 rounded-md transition-colors flex items-center shadow-sm"
                                title="Conectar e sincronizar com grupo do Splitwise"
                            >
                                {isSyncing ? (
                                    <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12C24 5.373 18.627 0 12 0zm5.5 16.5h-11v-9h11v9zm-1-8h-9v7h9v-7z" />
                                        {/* Simple icon placeholder */}
                                    </svg>
                                )}
                                {isSyncing ? 'Sincronizando...' : 'Conectar ao Splitwise'}
                            </button>
                        </>
                    )}

                    <label className={`cursor-pointer bg-gray-700 hover:bg-gray-600 text-cyan-400 text-sm font-medium py-2 px-4 rounded-md transition-colors border border-gray-600 flex items-center ${!selectedImovel ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Importar Planilha
                        <input
                            type="file"
                            className="hidden"
                            accept=".csv"
                            onChange={handleFileUpload}
                            disabled={!selectedImovel}
                        />
                    </label>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800 rounded-lg shadow-lg flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">Lançamentos Manuais</h2>
                    <button
                        onClick={handleAddRow}
                        disabled={!selectedImovel}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!selectedImovel ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-500'}`}
                    >
                        + Adicionar Lançamento
                    </button>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 w-32">Data</th>
                                <th className="px-4 py-3 w-48">Subtipo Despesa</th>
                                <th className="px-4 py-3 w-40">Tipo Despesa</th>
                                <th className="px-4 py-3">Descrição</th>
                                <th className="px-4 py-3 w-40 text-right">Custo Total (R$)</th>
                                <th className="px-4 py-3 w-40 text-right">Custo p/ Cota (R$)</th>
                                <th className="px-4 py-3 w-24 text-center">Dedutível</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {rows.map((row) => (
                                <tr key={row.id} className="bg-gray-800 hover:bg-gray-750">
                                    <td className="p-2">
                                        <input
                                            type="date"
                                            value={row.data}
                                            onChange={(e) => handleRowChange(row.id, 'data', e.target.value)}
                                            className="w-full bg-gray-900 border-transparent focus:border-cyan-500 rounded px-2 py-1 text-white"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select
                                            value={row.subtipo}
                                            onChange={(e) => handleRowChange(row.id, 'subtipo', e.target.value)}
                                            className="w-full bg-gray-900 border-transparent focus:border-cyan-500 rounded px-2 py-1 text-white"
                                        >
                                            <option value="">Selecione...</option>
                                            {SUBTIPO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        {row.subtipo === 'Outros' ? (
                                            <select
                                                value={row.tipoDespesa}
                                                onChange={(e) => handleRowChange(row.id, 'tipoDespesa', e.target.value)}
                                                className="w-full bg-gray-900 border-transparent focus:border-cyan-500 rounded px-2 py-1 text-white"
                                            >
                                                <option value="">Selecione Tipo...</option>
                                                {Object.values(TipoDespesa).map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={row.tipoDespesa}
                                                readOnly
                                                className="w-full bg-gray-700 border-transparent rounded px-2 py-1 text-gray-400 cursor-not-allowed"
                                            />
                                        )}
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            value={row.descricao}
                                            onChange={(e) => handleRowChange(row.id, 'descricao', e.target.value)}
                                            placeholder="Detalhes..."
                                            className="w-full bg-gray-900 border-transparent focus:border-cyan-500 rounded px-2 py-1 text-white"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <MoneyInput
                                            value={row.custoTotal}
                                            onChange={(val) => handleRowChange(row.id, 'custoTotal', val)}
                                            placeholder="R$ 0,00"
                                            className="w-full bg-gray-900 border-transparent focus:border-cyan-500 rounded px-2 py-1 text-white text-right font-mono"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            value={formatCurrencyBRL(row.custoCota)}
                                            readOnly
                                            className="w-full bg-gray-700 border-transparent rounded px-2 py-1 text-gray-400 text-right font-mono cursor-not-allowed"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select
                                            value={row.dedutivel}
                                            onChange={(e) => handleRowChange(row.id, 'dedutivel', e.target.value)}
                                            className="w-full bg-gray-900 border-transparent focus:border-cyan-500 rounded px-2 py-1 text-white text-center"
                                        >
                                            <option value="Sim">Sim</option>
                                            <option value="Não">Não</option>
                                        </select>
                                    </td>
                                    <td className="p-2 text-center">
                                        <button
                                            onClick={() => deleteCashFlowEntry(row.id)}
                                            className="text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">
                                        {selectedImovel
                                            ? "Nenhum lançamento. Clique em '+ Adicionar Lançamento' ou importe uma planilha para começar."
                                            : "Selecione um imóvel acima para habilitar os lançamentos."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: DASHBOARD VIEW (Analytics) ---
const DashboardView: React.FC = () => {
    const { entries, cashFlowEntries } = useData();

    // Filter States
    const [filterVendido, setFilterVendido] = useState<string>(''); // '' = All, 'Sim', 'Não'
    const [filterEstado, setFilterEstado] = useState<string>('');
    const [filterImovel, setFilterImovel] = useState<string>('');
    const [filterTipos, setFilterTipos] = useState<string[]>([]);
    const [filterSubtipo, setFilterSubtipo] = useState<string>('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Derive Unique Options for Filters
    const uniqueEstados = useMemo(() => Array.from(new Set(entries.map(e => e.estado))).sort(), [entries]);

    // Cascading Imovel Filter based on State
    const uniqueImoveis = useMemo(() => {
        let validImoveis = new Set(cashFlowEntries.map(e => e.imovelId));

        if (filterEstado) {
            // Find properties belonging to the selected state from main entries
            const propertiesInState = new Set(
                entries.filter(e => e.estado === filterEstado).map(e => e.imovel)
            );
            // Intersect with properties in cash flow
            validImoveis = new Set(
                [...validImoveis].filter(x => propertiesInState.has(x))
            );
        }

        return Array.from(validImoveis).sort();
    }, [cashFlowEntries, entries, filterEstado]);

    const uniqueTipos = useMemo(() => Object.values(TipoDespesa), []);

    // Filter Logic
    const filteredData = useMemo(() => {
        return cashFlowEntries.filter(e => {
            // Imovel Filter
            if (filterImovel && e.imovelId !== filterImovel) return false;

            // Subtipo Filter
            if (filterSubtipo && e.subtipo !== filterSubtipo) return false;

            // Tipo Filter (Multi)
            if (filterTipos.length > 0 && !filterTipos.includes(e.tipoDespesa)) return false;

            // Date Filter
            if (dateRange.start && e.data < dateRange.start) return false;
            if (dateRange.end && e.data > dateRange.end) return false;

            // Property Context Lookup (Status & State)
            // We need to look up the property in the main `entries` to check state/status
            const propertyEntry = entries.find(p => p.imovel === e.imovelId);

            if (filterEstado) {
                if (propertyEntry?.estado !== filterEstado) return false;
            }

            if (filterVendido) {
                const isSold = propertyEntry?.vendido === Vendido.Sim ? 'Sim' : 'Não';
                if (filterVendido !== isSold) return false;
            }

            return true;
        });
    }, [cashFlowEntries, filterImovel, filterSubtipo, filterTipos, dateRange, filterVendido, filterEstado, entries]);

    // --- AGGREGATIONS FOR CHARTS ---

    // 1. KPI Total
    const totalCost = useMemo(() => filteredData.reduce((sum, item) => sum + item.custoTotal, 0), [filteredData]);

    // 2. Cost per Month
    const costByMonth = useMemo(() => {
        const agg: { [key: string]: { name: string, date: string, value: number } } = {};
        filteredData.forEach(e => {
            if (!e.data) return;
            const dateObj = new Date(e.data);
            const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            const label = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

            if (!agg[key]) agg[key] = { name: label, date: key, value: 0 };
            agg[key].value += e.custoTotal;
        });
        return Object.values(agg).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredData]);

    // 3. Cost per Imovel
    const costByImovel = useMemo(() => {
        const agg: { [key: string]: number } = {};
        filteredData.forEach(e => {
            if (!agg[e.imovelId]) agg[e.imovelId] = 0;
            agg[e.imovelId] += e.custoTotal;
        });
        return Object.entries(agg)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // 4. Cost by Subtype (Ranking)
    const costBySubtype = useMemo(() => {
        const agg: { [key: string]: number } = {};
        filteredData.forEach(e => {
            const key = e.subtipo || 'Outros';
            if (!agg[key]) agg[key] = 0;
            agg[key] += e.custoTotal;
        });
        return Object.entries(agg)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Helper for multi-select toggle
    const toggleTipo = (t: string) => {
        setFilterTipos(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-700 p-3 border border-gray-600 rounded shadow-lg">
                    <p className="font-bold text-white mb-1">{label}</p>
                    <p className="text-sm text-cyan-400">Total: {formatCurrencyBRL(payload[0].value)}</p>
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

                {/* Status Vendido */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Status Vendido</label>
                    <select
                        value={filterVendido}
                        onChange={e => setFilterVendido(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm text-white"
                    >
                        <option value="">Todos</option>
                        <option value="Sim">Vendido</option>
                        <option value="Não">Em Carteira</option>
                    </select>
                </div>

                {/* NEW: Estado Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Estado</label>
                    <select
                        value={filterEstado}
                        onChange={e => { setFilterEstado(e.target.value); setFilterImovel(''); }}
                        className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm text-white"
                    >
                        <option value="">Todos</option>
                        {uniqueEstados.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Imovel */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Imóvel</label>
                    <select
                        value={filterImovel}
                        onChange={e => setFilterImovel(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm text-white"
                    >
                        <option value="">Todos</option>
                        {uniqueImoveis.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>

                {/* Subtipo */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Subtipo Despesa</label>
                    <select
                        value={filterSubtipo}
                        onChange={e => setFilterSubtipo(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm text-white"
                    >
                        <option value="">Todos</option>
                        {SUBTIPO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                {/* Data Range */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Período</label>
                    <div className="flex flex-col space-y-2">
                        <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-gray-700 border-gray-600 rounded p-1 text-xs text-white" />
                        <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-gray-700 border-gray-600 rounded p-1 text-xs text-white" />
                    </div>
                </div>

                {/* Tipo Despesa (Checkbox) */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Tipo Despesa</label>
                    <div className="space-y-1">
                        {uniqueTipos.map(t => (
                            <label key={t} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filterTipos.includes(t)}
                                    onChange={() => toggleTipo(t)}
                                    className="rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                                />
                                <span className="text-xs text-gray-300">{t}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => {
                        setFilterVendido('');
                        setFilterEstado('');
                        setFilterImovel('');
                        setFilterSubtipo('');
                        setFilterTipos([]);
                        setDateRange({ start: '', end: '' });
                    }}
                    className="w-full mt-4 text-xs text-cyan-500 hover:text-cyan-400 border border-gray-700 rounded py-2"
                >
                    Limpar Filtros
                </button>
            </aside>

            {/* Main Charts Area */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">

                {/* KPI Card */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-cyan-500">
                    <h3 className="text-sm font-medium text-gray-400 uppercase">Custos Totais (Filtrados)</h3>
                    <p className="mt-2 text-4xl font-bold text-white">{formatCurrencyBRL(totalCost)}</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Chart: Cost per Month */}
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                        <h4 className="text-base font-semibold text-white mb-4">Custo por Mês</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={costByMonth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                                    <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={formatCurrencyShort} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#374151', opacity: 0.2 }} />
                                    <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart: Cost by Imovel */}
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                        <h4 className="text-base font-semibold text-white mb-4">Custo por Imóvel</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={costByImovel}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                                    <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={formatCurrencyShort} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#374151', opacity: 0.2 }} />
                                    <Bar dataKey="value" fill="#f87171" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Chart: Cost by Subtype (Horizontal) */}
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h4 className="text-base font-semibold text-white mb-4">Ranking por Tipo de Despesa</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={costBySubtype} margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                <XAxis type="number" stroke="#9ca3af" fontSize={10} tickFormatter={formatCurrencyShort} />
                                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} width={120} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#374151', opacity: 0.2 }} />
                                <Bar dataKey="value" fill="#fbbf24" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Mini Summary Table */}
                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-700">
                        <h4 className="text-base font-semibold text-white">Últimos Lançamentos Filtrados</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                                <tr>
                                    <th className="px-4 py-2">Imóvel</th>
                                    <th className="px-4 py-2">Subtipo</th>
                                    <th className="px-4 py-2">Data</th>
                                    <th className="px-4 py-2">Descrição</th>
                                    <th className="px-4 py-2 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredData.slice(0, 10).map(row => (
                                    <tr key={row.id} className="hover:bg-gray-700">
                                        <td className="px-4 py-2 text-white font-medium">{row.imovelId}</td>
                                        <td className="px-4 py-2">{row.subtipo}</td>
                                        <td className="px-4 py-2">{row.data ? new Date(row.data).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="px-4 py-2 truncate max-w-[200px]">{row.descricao}</td>
                                        <td className="px-4 py-2 text-right text-white">{formatCurrencyBRL(row.custoTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredData.length > 10 && (
                        <div className="p-2 text-center text-xs text-gray-500 bg-gray-750">
                            Exibindo 10 de {filteredData.length} registros
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};


const FluxoDeCaixa: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'lancamentos'>('dashboard');

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-900 p-6 animate-fade-in">

            {/* Header / Tabs */}
            <div className="flex space-x-1 border-b border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-6 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 border-t border-l border-r ${activeTab === 'dashboard'
                        ? 'bg-gray-800 text-cyan-400 border-gray-700'
                        : 'bg-gray-900 text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800'
                        }`}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('lancamentos')}
                    className={`px-6 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 border-t border-l border-r ${activeTab === 'lancamentos'
                        ? 'bg-gray-800 text-cyan-400 border-gray-700'
                        : 'bg-gray-900 text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800'
                        }`}
                >
                    Lançamentos
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'lancamentos' ? <LancamentosView /> : <DashboardView />}
            </div>

        </div>
    );
};

export default FluxoDeCaixa;