import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { FinancialEntry, TipoCompra, TipoDespesa, Vendido, Cenario, StatusImovel, CashFlowEntry, StatusEntry } from '../types';

// Helper para gerar IDs únicos
const uid = () => Math.random().toString(36).substr(2, 9);

// === DADOS INICIAIS (SEED DATA) ===
// Estes dados só serão carregados se o usuário NUNCA tiver acessado a aplicação ou limpar o cache.

// 1. GUAPO-CASA1
const GUAPO_CASA1_DATA: FinancialEntry[] = [
    { id: uid(), estado: 'GO', cidade: 'Guapó', imovel: 'guapo-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, dataCompra: '2025-01-15', dataVenda: '2026-01-15', fluxoCaixa: 190000, tipoDespesa: TipoDespesa.Venda, descricao: 'Venda', cota: 190000, vendido: Vendido.Nao, numCotistas: 1 },
    { id: uid(), estado: 'GO', cidade: 'Guapó', imovel: 'guapo-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -92700, tipoDespesa: TipoDespesa.CustoAquisicao, descricao: 'Entrada', cota: -92700, vendido: Vendido.Nao, numCotistas: 1 },
    { id: uid(), estado: 'GO', cidade: 'Guapó', imovel: 'guapo-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -10000, tipoDespesa: TipoDespesa.CustoPreparacao, descricao: 'Reforma', cota: -10000, vendido: Vendido.Nao, numCotistas: 1 },
    { id: uid(), estado: 'GO', cidade: 'Guapó', imovel: 'guapo-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -5000, tipoDespesa: TipoDespesa.CustoPreparacao, descricao: 'Desocupação', cota: -5000, vendido: Vendido.Nao, numCotistas: 1 },
    { id: uid(), estado: 'GO', cidade: 'Guapó', imovel: 'guapo-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -300, tipoDespesa: TipoDespesa.CustoManutencao, descricao: 'IPTU', cota: -300, vendido: Vendido.Nao, numCotistas: 1 },
    // Automáticos sugeridos
    { id: uid(), estado: 'GO', cidade: 'Guapó', imovel: 'guapo-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -3800, tipoDespesa: TipoDespesa.CustoAquisicao, descricao: 'ITBI', cota: -3800, vendido: Vendido.Nao, numCotistas: 1 },
    { id: uid(), estado: 'GO', cidade: 'Guapó', imovel: 'guapo-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -1900, tipoDespesa: TipoDespesa.CustoAquisicao, descricao: 'Registro', cota: -1900, vendido: Vendido.Nao, numCotistas: 1 },
];

// 2. JD-HELVECIA-CASA1
const JD_HELVECIA_DATA: FinancialEntry[] = [
    { id: uid(), estado: 'GO', cidade: 'Aparecida de Goiânia', imovel: 'jd-helvecia-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, dataCompra: '2025-03-12', dataVenda: '2026-03-12', fluxoCaixa: 430000, tipoDespesa: TipoDespesa.Venda, descricao: 'Venda', cota: 35833.33, vendido: Vendido.Nao, numCotistas: 12 },
    { id: uid(), estado: 'GO', cidade: 'Aparecida de Goiânia', imovel: 'jd-helvecia-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -243000, tipoDespesa: TipoDespesa.CustoAquisicao, descricao: 'Entrada', cota: -20250, vendido: Vendido.Nao, numCotistas: 12 },
    { id: uid(), estado: 'GO', cidade: 'Aparecida de Goiânia', imovel: 'jd-helvecia-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -12150, tipoDespesa: TipoDespesa.CustoAquisicao, descricao: 'Comissão Leiloeiro', cota: -1012.50, vendido: Vendido.Nao, numCotistas: 12 },
    { id: uid(), estado: 'GO', cidade: 'Aparecida de Goiânia', imovel: 'jd-helvecia-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -20000, tipoDespesa: TipoDespesa.CustoPreparacao, descricao: 'Reforma', cota: -1666.66, vendido: Vendido.Nao, numCotistas: 12 },
    { id: uid(), estado: 'GO', cidade: 'Aparecida de Goiânia', imovel: 'jd-helvecia-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -500, tipoDespesa: TipoDespesa.CustoManutencao, descricao: 'IPTU', cota: -41.66, vendido: Vendido.Nao, numCotistas: 12 },
    { id: uid(), estado: 'GO', cidade: 'Aparecida de Goiânia', imovel: 'jd-helvecia-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.AVista, fluxoCaixa: -4900, tipoDespesa: TipoDespesa.CustoAquisicao, descricao: 'Registro', cota: -408.33, vendido: Vendido.Nao, numCotistas: 12 },
];

// 3. NOVA-OLINDA-CASA1 (Financiado)
const NOVA_OLINDA_DATA: FinancialEntry[] = [
    { id: uid(), estado: 'GO', cidade: 'Aparecida de Goiânia', imovel: 'nova-olinda-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.Financiado, dataCompra: '2025-01-30', dataVenda: '2026-01-30', fluxoCaixa: 270000, tipoDespesa: TipoDespesa.Venda, descricao: 'Venda', cota: 33750, vendido: Vendido.Nao, numCotistas: 8 },
    { id: uid(), estado: 'GO', cidade: 'Aparecida de Goiânia', imovel: 'nova-olinda-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.Financiado, fluxoCaixa: -5400, tipoDespesa: TipoDespesa.CustoAquisicao, descricao: 'ITBI', cota: -675, vendido: Vendido.Nao, numCotistas: 8 },
    { id: uid(), estado: 'GO', cidade: 'Aparecida de Goiânia', imovel: 'nova-olinda-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.Financiado, fluxoCaixa: -2700, tipoDespesa: TipoDespesa.CustoAquisicao, descricao: 'Registro', cota: -337.5, vendido: Vendido.Nao, numCotistas: 8 },
    { id: uid(), estado: 'GO', cidade: 'Aparecida de Goiânia', imovel: 'nova-olinda-casa1', cenario: 'Projetado', statusImovel: 'em_andamento', tipoCompra: TipoCompra.Financiado, fluxoCaixa: 0, tipoDespesa: TipoDespesa.CustoAquisicao, descricao: 'Valor Aquisição', cota: 0, vendido: Vendido.Nao, numCotistas: 8 },
];

// 4. TRINDADE2 (Finalizado)
const TRINDADE2_DATA: FinancialEntry[] = [
    { id: uid(), estado: 'GO', cidade: 'Trindade', imovel: 'trindade2', cenario: 'Projetado', statusImovel: 'finalizado', tipoCompra: TipoCompra.AVista, dataCompra: '2024-09-20', dataVenda: '2025-06-20', fluxoCaixa: 160000, tipoDespesa: TipoDespesa.Venda, descricao: 'Venda', cota: 160000, vendido: Vendido.Sim, numCotistas: 1 },
    { id: uid(), estado: 'GO', cidade: 'Trindade', imovel: 'trindade2', cenario: 'Projetado', statusImovel: 'finalizado', tipoCompra: TipoCompra.AVista, fluxoCaixa: -96000, tipoDespesa: TipoDespesa.CustoAquisicao, descricao: 'Entrada', cota: -96000, vendido: Vendido.Sim, numCotistas: 1 },
    { id: uid(), estado: 'GO', cidade: 'Trindade', imovel: 'trindade2', cenario: 'Projetado', statusImovel: 'finalizado', tipoCompra: TipoCompra.AVista, fluxoCaixa: -11000, tipoDespesa: TipoDespesa.CustoPreparacao, descricao: 'Reforma', cota: -11000, vendido: Vendido.Sim, numCotistas: 1 },
    { id: uid(), estado: 'GO', cidade: 'Trindade', imovel: 'trindade2', cenario: 'Projetado', statusImovel: 'finalizado', tipoCompra: TipoCompra.AVista, fluxoCaixa: -1740, tipoDespesa: TipoDespesa.CustoManutencao, descricao: 'Condomínio', cota: -1740, vendido: Vendido.Sim, numCotistas: 1 },
    { id: uid(), estado: 'GO', cidade: 'Trindade', imovel: 'trindade2', cenario: 'Projetado', statusImovel: 'finalizado', tipoCompra: TipoCompra.AVista, fluxoCaixa: -300, tipoDespesa: TipoDespesa.CustoManutencao, descricao: 'IPTU', cota: -300, vendido: Vendido.Sim, numCotistas: 1 },
];

const DEFAULT_SEED_DATA: FinancialEntry[] = [
    ...GUAPO_CASA1_DATA,
    ...JD_HELVECIA_DATA,
    ...NOVA_OLINDA_DATA,
    ...TRINDADE2_DATA
];

const STORAGE_KEY = 'imob_dashboard_data_v1';
const CASHFLOW_STORAGE_KEY = 'imob_fluxo_caixa_data_v1';
const STATUS_STORAGE_KEY = 'imob_status_data_v1';

interface DataContextType {
  entries: FinancialEntry[];
  addEntry: (entry: Omit<FinancialEntry, 'id'>) => void;
  updateEntry: (entry: FinancialEntry) => void;
  deleteEntry: (id: string) => void;
  deleteEntriesByImovel: (imovelName: string) => void;
  restoreEntries: (entriesToRestore: FinancialEntry[]) => void;
  duplicateImovel: (imovelName: string) => string;
  updateImovelStatus: (imovelName: string, newStatus: StatusImovel) => void;
  renameImovelGlobal: (oldName: string, newName: string) => void;
  
  // Cash Flow
  cashFlowEntries: CashFlowEntry[];
  addCashFlowEntry: (entry: Omit<CashFlowEntry, 'id'>) => void;
  addBatchCashFlowEntries: (newEntries: Omit<CashFlowEntry, 'id'>[]) => void;
  updateCashFlowEntry: (entry: CashFlowEntry) => void;
  deleteCashFlowEntry: (id: string) => void;

  // Status (Timeline)
  statusEntries: StatusEntry[];
  updateStatusEntry: (entry: StatusEntry) => void;
  
  // Filter state
  selectedStates: string[];
  setSelectedStates: React.Dispatch<React.SetStateAction<string[]>>;
  selectedImoveis: string[];
  setSelectedImoveis: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTiposCompra: string[];
  setSelectedTiposCompra: React.Dispatch<React.SetStateAction<string[]>>;
  selectedVendido: string[];
  setSelectedVendido: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTiposDespesa: string[];
  setSelectedTiposDespesa: React.Dispatch<React.SetStateAction<string[]>>;
  // Scenario filter for Dashboard
  selectedCenario: Cenario;
  setSelectedCenario: React.Dispatch<React.SetStateAction<Cenario>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // === INITIALIZATION LOGIC (STRICT LOCAL STORAGE FIRST) ===
  
  // 1. Financial Entries
  const [entries, setEntries] = useState<FinancialEntry[]>(() => {
      try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          // 2. SE encontrar dados salvos, usa ELES (mesmo que a lista esteja vazia ou diferente do seed)
          if (savedData) {
              const parsed: FinancialEntry[] = JSON.parse(savedData);
              // Ensure basic structure is present if data is old, but DO NOT add new rows.
              return parsed.map(e => ({
                  ...e,
                  cenario: e.cenario || 'Projetado',
                  statusImovel: e.statusImovel || 'em_andamento'
              }));
          }
      } catch (error) {
          console.error("Failed to load data from localStorage", error);
      }
      // 3. APENAS se não houver NADA salvo (primeira vez do usuário), usa o Seed Data
      return DEFAULT_SEED_DATA;
  });

  // 2. Cash Flow Entries
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>(() => {
      try {
          const savedData = localStorage.getItem(CASHFLOW_STORAGE_KEY);
          if (savedData) {
              return JSON.parse(savedData);
          }
      } catch (error) {
          console.error("Failed to load cash flow data", error);
      }
      return [];
  });

  // 3. Status Entries
  const [statusEntries, setStatusEntries] = useState<StatusEntry[]>(() => {
    try {
        const savedData = localStorage.getItem(STATUS_STORAGE_KEY);
        if (savedData) {
            return JSON.parse(savedData);
        }
    } catch (error) {
        console.error("Failed to load status data", error);
    }
    return [];
  });
  
  // Dashboard filter state
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedImoveis, setSelectedImoveis] = useState<string[]>([]);
  const [selectedTiposCompra, setSelectedTiposCompra] = useState<string[]>([]);
  const [selectedVendido, setSelectedVendido] = useState<string[]>([]);
  const [selectedTiposDespesa, setSelectedTiposDespesa] = useState<string[]>([]);
  const [selectedCenario, setSelectedCenario] = useState<Cenario>('Projetado');

  const getSortableDate = (entry: FinancialEntry) => new Date(entry.dataCompra || entry.dataVenda || 0).getTime();

  // === PERSISTENCE EFFECTS ===
  // These effects run on every change to ensure localStorage is always up to date.
  
  useEffect(() => {
      try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
          console.error("Failed to save data to localStorage", error);
      }
  }, [entries]);

  useEffect(() => {
    try {
        localStorage.setItem(CASHFLOW_STORAGE_KEY, JSON.stringify(cashFlowEntries));
    } catch (error) {
        console.error("Failed to save cash flow data", error);
    }
  }, [cashFlowEntries]);

  useEffect(() => {
    try {
        localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusEntries));
    } catch (error) {
        console.error("Failed to save status data", error);
    }
  }, [statusEntries]);

  // SYNC Logic: Update Status entries when Main entries change (e.g. Dates)
  // Careful not to resurrect deleted statuses.
  useEffect(() => {
      const uniqueProperties = Array.from(new Set(entries.map(e => e.imovel)));
      
      setStatusEntries(prev => {
          let updated = [...prev];
          let changed = false;

          uniqueProperties.forEach(imovelName => {
              const exists = updated.find(s => s.imovel === imovelName);
              const propData = entries.find(e => e.imovel === imovelName);
              
              if (!exists && propData) {
                  // Only create if it doesn't exist AND we have valid financial data
                  updated.push({
                      imovel: imovelName,
                      estado: propData.estado,
                      dataAquisicao: propData.dataCompra,
                      dataVenda: propData.dataVenda
                  });
                  changed = true;
              } else if (exists && propData) {
                   // Sync Dates from Projection to Status
                   if (exists.dataAquisicao !== propData.dataCompra || exists.dataVenda !== propData.dataVenda) {
                        exists.dataAquisicao = propData.dataCompra;
                        exists.dataVenda = propData.dataVenda;
                        changed = true;
                   }
              }
          });
          
          // Remove status entries for deleted properties
          const filtered = updated.filter(s => uniqueProperties.includes(s.imovel));
          if (filtered.length !== updated.length) {
              updated = filtered;
              changed = true;
          }

          return changed ? updated : prev;
      });
  }, [entries]);

  // === ENTRIES CRUD ===
  const addEntry = (entry: Omit<FinancialEntry, 'id'>) => {
    const newEntry = { ...entry, id: uid() };
    setEntries(prevEntries => [...prevEntries, newEntry].sort((a,b) => getSortableDate(b) - getSortableDate(a)));
  };

  const updateEntry = (updatedEntry: FinancialEntry) => {
    setEntries(prevEntries =>
      prevEntries.map(entry => (entry.id === updatedEntry.id ? updatedEntry : entry))
    );
  };

  const deleteEntry = (id: string) => {
    setEntries(prevEntries => prevEntries.filter(entry => entry.id !== id));
  };

  const deleteEntriesByImovel = (imovelName: string) => {
    setEntries(prevEntries => prevEntries.filter(entry => entry.imovel !== imovelName));
    // Status and CashFlow deletion will be handled by the effect or manually if needed, 
    // but here we manually trigger to be safe and instant.
    setStatusEntries(prev => prev.filter(e => e.imovel !== imovelName)); 
    setCashFlowEntries(prev => prev.filter(e => e.imovelId !== imovelName)); 
  };
  
  const restoreEntries = (entriesToRestore: FinancialEntry[]) => {
    setEntries(prevEntries => [...prevEntries, ...entriesToRestore].sort((a,b) => getSortableDate(b) - getSortableDate(a)));
  };

  const duplicateImovel = (imovelName: string): string => {
    const existingNames = new Set(entries.map(e => e.imovel));
    let newName = `${imovelName} (Cópia)`;
    let counter = 1;
    
    while (existingNames.has(newName)) {
        newName = `${imovelName} (Cópia ${counter})`;
        counter++;
    }

    const entriesToClone = entries.filter(e => e.imovel === imovelName);
    const newEntries = entriesToClone.map(entry => ({
        ...entry,
        id: uid(),
        imovel: newName
    }));

    setEntries(prev => [...prev, ...newEntries].sort((a,b) => getSortableDate(b) - getSortableDate(a)));
    
    const statusToClone = statusEntries.find(s => s.imovel === imovelName);
    if (statusToClone) {
        setStatusEntries(prev => [...prev, { ...statusToClone, imovel: newName }]);
    }

    return newName;
  };

  const updateImovelStatus = (imovelName: string, newStatus: StatusImovel) => {
      setEntries(prev => prev.map(entry => {
          if (entry.imovel === imovelName) {
              return { ...entry, statusImovel: newStatus };
          }
          return entry;
      }));
  };

  const renameImovelGlobal = (oldName: string, newName: string) => {
      // 1. Rename in Financial Entries
      setEntries(prev => prev.map(e => e.imovel === oldName ? { ...e, imovel: newName } : e));

      // 2. Rename in Cash Flow Entries
      setCashFlowEntries(prev => prev.map(e => e.imovelId === oldName ? { ...e, imovelId: newName } : e));

      // 3. Rename in Status Entries
      setStatusEntries(prev => prev.map(e => e.imovel === oldName ? { ...e, imovel: newName } : e));
  };

  // === CASH FLOW CRUD ===
  const addCashFlowEntry = (entry: Omit<CashFlowEntry, 'id'>) => {
      const newEntry = { ...entry, id: uid() };
      setCashFlowEntries(prev => [...prev, newEntry]);
  };
  
  const addBatchCashFlowEntries = (newEntries: Omit<CashFlowEntry, 'id'>[]) => {
      const entriesWithIds = newEntries.map(e => ({ ...e, id: uid() }));
      setCashFlowEntries(prev => [...prev, ...entriesWithIds]);
  };

  const updateCashFlowEntry = (entry: CashFlowEntry) => {
      setCashFlowEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
  };

  const deleteCashFlowEntry = (id: string) => {
      setCashFlowEntries(prev => prev.filter(e => e.id !== id));
  };

  // === STATUS CRUD ===
  const updateStatusEntry = (entry: StatusEntry) => {
      setStatusEntries(prev => {
          const index = prev.findIndex(e => e.imovel === entry.imovel);
          if (index >= 0) {
              const updated = [...prev];
              updated[index] = entry;
              return updated;
          } else {
              return [...prev, entry];
          }
      });
  };

  // Sort initial data once (only if entries exist)
  useEffect(() => {
    if (entries.length > 0) {
        setEntries(prev => [...prev].sort((a,b) => getSortableDate(b) - getSortableDate(a)));
    }
  }, []); // Run once on mount

  const contextValue = {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteEntriesByImovel,
    restoreEntries,
    duplicateImovel,
    updateImovelStatus,
    renameImovelGlobal,
    
    cashFlowEntries,
    addCashFlowEntry,
    addBatchCashFlowEntries,
    updateCashFlowEntry,
    deleteCashFlowEntry,

    statusEntries,
    updateStatusEntry,

    selectedStates,
    setSelectedStates,
    selectedImoveis,
    setSelectedImoveis,
    selectedTiposCompra,
    setSelectedTiposCompra,
    selectedVendido,
    setSelectedVendido,
    selectedTiposDespesa,
    setSelectedTiposDespesa,
    selectedCenario,
    setSelectedCenario,
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};