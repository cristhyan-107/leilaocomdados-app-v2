import React, { useState, useMemo, useEffect, KeyboardEvent, FocusEvent, useRef, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { FinancialEntry, TipoCompra, TipoDespesa, Vendido, ESTADOS_BRASIL, FIELD_GROUPS, Cenario, StatusImovel } from '../types';
import { formatCurrencyBRL, parseCurrencyBRL } from '../utils/formatters';

interface ImovelListItemProps {
  imovel: string;
  status: StatusImovel;
  activeImovel: string | null;
  onSelect: (imovel: string) => void;
  onContextMenu: (e: React.MouseEvent, imovel: string, status: StatusImovel) => void;
  onDelete: (imovel: string) => void;
}

const ImovelListItem: React.FC<ImovelListItemProps> = React.memo(({ imovel, status, activeImovel, onSelect, onContextMenu, onDelete }) => (
  <div className="relative group">
      <button 
          onClick={() => onSelect(imovel)}
          onContextMenu={(e) => onContextMenu(e, imovel, status)}
          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex justify-between items-center ${activeImovel === imovel ? 'bg-gray-700 text-cyan-400 border-l-4 border-cyan-500' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
      >
          <span className="truncate">{imovel}</span>
      </button>
      <button 
          onClick={(e) => { e.stopPropagation(); onDelete(imovel); }}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ${activeImovel === imovel ? 'opacity-100' : ''}`}
          title={`Excluir imóvel ${imovel}`}
      >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
      </button>
  </div>
));

const DataEntry: React.FC = () => {
  const { entries, addEntry, updateEntry, deleteEntriesByImovel, restoreEntries, duplicateImovel, updateImovelStatus, renameImovelGlobal } = useData();
  
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ entries: FinancialEntry[], imovelName: string } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, imovel: string, currentStatus: StatusImovel } | null>(null);

  // Sidebar Collapsible State
  const [isEmAndamentoOpen, setIsEmAndamentoOpen] = useState(true);
  const [isFinalizadosOpen, setIsFinalizadosOpen] = useState(true);

  // State for business logic
  const [itbiPercent, setItbiPercent] = useState(2);
  const [entradaPercentFinanciado, setEntradaPercentFinanciado] = useState(5);
  const [ganhoCapitalPercent, setGanhoCapitalPercent] = useState(15);
  const [comissaoCorretorPercent, setComissaoCorretorPercent] = useState(5);
  const [comissaoLeiloeiroPercent, setComissaoLeiloeiroPercent] = useState(5);

  const [overriddenFields, setOverriddenFields] = useState<Set<string>>(new Set());
  const [monthlyInputs, setMonthlyInputs] = useState<{ [key: string]: string }>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Scenario State
  const [activeScenario, setActiveScenario] = useState<Cenario>('Projetado');

  // Logic to separate properties by status
  const imoveisData = useMemo(() => {
    const map = new Map<string, StatusImovel>();
    entries.forEach(e => {
        const status = e.statusImovel || 'em_andamento';
        map.set(e.imovel, status);
    });
    
    const emAndamento: string[] = [];
    const finalizados: string[] = [];

    map.forEach((status, imovel) => {
        if (status === 'finalizado') {
            finalizados.push(imovel);
        } else {
            emAndamento.push(imovel);
        }
    });

    return {
        all: Array.from(map.keys()).sort(),
        emAndamento: emAndamento.sort(),
        finalizados: finalizados.sort()
    };
  }, [entries]);

  const [activeImovel, setActiveImovel] = useState<string | null>(null);
  
  useEffect(() => {
    if (!activeImovel) {
        if (imoveisData.all.includes('ma1')) {
            setActiveImovel('ma1');
        } else if (imoveisData.all.length > 0) {
            setActiveImovel(imoveisData.all[0]);
        }
    } else if (!imoveisData.all.includes(activeImovel) && imoveisData.all.length > 0) {
        setActiveImovel(imoveisData.all[0]);
    } else if (imoveisData.all.length === 0) {
        setActiveImovel(null);
    }
  }, [imoveisData.all, activeImovel]);


  const activeImovelEntries = useMemo(() => {
    if (!activeImovel) return [];
    return entries.filter(e => e.imovel === activeImovel && e.cenario === activeScenario);
  }, [entries, activeImovel, activeScenario]);

  // NEW: Get Projected entries to support replication logic
  const projectedEntries = useMemo(() => {
    if (!activeImovel) return [];
    return entries.filter(e => e.imovel === activeImovel && e.cenario === 'Projetado');
  }, [entries, activeImovel]);

  // General Property Info 
  const activeImovelData = useMemo(() => {
    if (activeImovelEntries.length > 0) {
      const mainEntry = activeImovelEntries[0];
      return {
        ...mainEntry,
        dataCompra: mainEntry.dataCompra ? mainEntry.dataCompra.split('T')[0] : new Date().toISOString().split('T')[0],
        dataVenda: mainEntry.dataVenda ? mainEntry.dataVenda.split('T')[0] : undefined,
      };
    }
    
    if (activeScenario === 'Executado' && activeImovel) {
        const projectedEntries = entries.filter(e => e.imovel === activeImovel && e.cenario === 'Projetado');
        if (projectedEntries.length > 0) {
             const base = projectedEntries[0];
             return {
                imovel: activeImovel,
                estado: base.estado,
                cidade: base.cidade,
                tipoCompra: base.tipoCompra,
                vendido: base.vendido,
                numCotistas: base.numCotistas,
                dataCompra: new Date().toISOString().split('T')[0],
                dataVenda: undefined,
                cenario: 'Executado',
                statusImovel: base.statusImovel
             };
        }
    }

    return {
      imovel: activeImovel || '',
      estado: 'SP',
      cidade: '',
      tipoCompra: TipoCompra.AVista,
      vendido: Vendido.Nao,
      numCotistas: 1,
      dataCompra: new Date().toISOString().split('T')[0],
      dataVenda: undefined,
      cenario: activeScenario,
      statusImovel: 'em_andamento' as StatusImovel
    };
  }, [activeImovelEntries, activeImovel, activeScenario, entries]);
  
  const [imovelNameInput, setImovelNameInput] = useState(activeImovelData.imovel);

  useEffect(() => {
    setImovelNameInput(activeImovelData.imovel);
  }, [activeImovelData.imovel]);
  
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    return () => {
        if(undoTimerRef.current) {
            clearTimeout(undoTimerRef.current)
        }
    }
  }, []);

  useEffect(() => {
    setOverriddenFields(new Set());
    setMonthlyInputs({});
    setItbiPercent(2);
    setEntradaPercentFinanciado(5);
    setGanhoCapitalPercent(15);
    setComissaoCorretorPercent(5);
    setComissaoLeiloeiroPercent(5);
  }, [activeImovel, activeScenario]);
  
  const handleValueChange = useCallback((
    tipoDespesa: TipoDespesa,
    descricao: string,
    newValue: number,
    options: { isAutomatic?: boolean } = {}
  ) => {
    if (!activeImovel) return;

    if (!options.isAutomatic) {
      setOverriddenFields(prev => new Set(prev).add(descricao));
    }

    const entry = activeImovelEntries.find(e => e.descricao === descricao);
    const numCotistas = activeImovelData.numCotistas || 1;
    
    let fluxoCaixa = -Math.abs(newValue);
    if (tipoDespesa === TipoDespesa.Venda && descricao === 'Venda') {
      fluxoCaixa = Math.abs(newValue);
    }
    // Valor Aquisição é referência (custo zero no fluxo de caixa direto, mas base para outros)
    // Mas se o usuário quiser lançar isso como custo, a lógica abaixo o zera.
    // Para fluxo de caixa real, o custo é entrada + parcelas.
    // Vamos manter fluxoCaixa = 0 para "Valor Aquisição" para não duplicar custos.
    if (descricao === 'Valor Aquisição') {
        fluxoCaixa = 0;
    }
    
    const cota = fluxoCaixa / numCotistas;

    if (entry) {
      updateEntry({ ...entry, fluxoCaixa, cota, numCotistas });
    } else {
      const newEntry: Omit<FinancialEntry, 'id'> = {
        ...activeImovelData,
        imovel: activeImovel,
        tipoDespesa,
        descricao,
        fluxoCaixa,
        cota,
        numCotistas,
        cenario: activeScenario
      };
      addEntry(newEntry);
    }
  }, [activeImovel, activeImovelData, activeImovelEntries, addEntry, updateEntry, activeScenario]);

  // Main calculation engine
  useEffect(() => {
    if (!activeImovel || !activeImovelData) return;

    const getEntry = (descricao: string) => activeImovelEntries.find(e => e.descricao === descricao);
    const getEntryValue = (descricao: string) => {
        const entry = activeImovelEntries.find(e => e.descricao === descricao);
        return entry ? Math.abs(entry.fluxoCaixa) : 0;
    };

    const checkAndUpdate = (tipoDespesa: TipoDespesa, descricao: string, calculatedValue: number) => {
        const currentValue = getEntryValue(descricao);
        if (Math.abs(currentValue - calculatedValue) > 0.01) {
            handleValueChange(tipoDespesa, descricao, calculatedValue, { isAutomatic: true });
        }
    };
    
    const vendaValue = getEntryValue('Venda');
    const entradaValue = getEntryValue('Entrada');
    const valorAquisicaoValue = getEntryValue('Valor Aquisição');
    
    const isAVista = activeImovelData.tipoCompra === TipoCompra.AVista;
    const isFinanciado = activeImovelData.tipoCompra === TipoCompra.Financiado;

    // Universal calculations
    if (vendaValue > 0) {
        if (!overriddenFields.has('Comissão Corretor')) {
            checkAndUpdate(TipoDespesa.Venda, 'Comissão Corretor', vendaValue * (comissaoCorretorPercent / 100));
        }
        // ITBI agora é sempre calculado sobre o valor de VENDA, conforme solicitado
        if (!overriddenFields.has('ITBI')) {
            checkAndUpdate(TipoDespesa.CustoAquisicao, 'ITBI', vendaValue * (itbiPercent / 100));
        }
        
        // Registro e Taxas também sobre venda
        if (!overriddenFields.has('Registro')) {
            checkAndUpdate(TipoDespesa.CustoAquisicao, 'Registro', vendaValue * 0.01);
        }
        if (!overriddenFields.has('Taxa Financiamento/Escritura')) {
            checkAndUpdate(TipoDespesa.CustoAquisicao, 'Taxa Financiamento/Escritura', vendaValue * 0.01);
        }
    }

    if (isAVista) {
        if (entradaValue > 0) {
             if (!overriddenFields.has('Comissão Leiloeiro')) {
                checkAndUpdate(TipoDespesa.CustoAquisicao, 'Comissão Leiloeiro', entradaValue * (comissaoLeiloeiroPercent / 100));
            }
        }
        
        const comissaoCorretorValue = getEntryValue('Comissão Corretor');
        const itbiValue = getEntryValue('ITBI');
        const registroValue = getEntryValue('Registro');
        const despachanteValue = getEntryValue('Despachante');
        const comissaoLeiloeiroValue = getEntryValue('Comissão Leiloeiro');
        const taxaFinanciamentoValue = getEntryValue('Taxa Financiamento/Escritura');
        const reformaValue = getEntryValue('Reforma');

        const totalCostsForTax = comissaoCorretorValue + entradaValue + itbiValue + registroValue + despachanteValue + comissaoLeiloeiroValue + taxaFinanciamentoValue + reformaValue;
        const capitalGainBase = vendaValue - totalCostsForTax;
        const tax = capitalGainBase > 0 ? capitalGainBase * (ganhoCapitalPercent / 100) : 0;
        
        if (!overriddenFields.has('Imposto de Ganho de Capital')) {
            checkAndUpdate(TipoDespesa.Venda, 'Imposto de Ganho de Capital', tax);
        }

    } else if (isFinanciado) {
        if (valorAquisicaoValue > 0) {
            if (!overriddenFields.has('Entrada')) {
                checkAndUpdate(TipoDespesa.CustoAquisicao, 'Entrada', valorAquisicaoValue * (entradaPercentFinanciado / 100));
            }
            if (!overriddenFields.has('Comissão Leiloeiro')) {
                 checkAndUpdate(TipoDespesa.CustoAquisicao, 'Comissão Leiloeiro', valorAquisicaoValue * (comissaoLeiloeiroPercent / 100));
            }
        }
    }
  }, [activeImovel, activeImovelData, activeImovelEntries, itbiPercent, entradaPercentFinanciado, ganhoCapitalPercent, comissaoCorretorPercent, comissaoLeiloeiroPercent, overriddenFields, handleValueChange]);

  const summary = useMemo(() => {
    if (!activeImovel) return { lucroTotal: 0, roiTotal: 0, roiMensal: 0, lucroPorCota: 0 };
    
    const getEntryValue = (descricao: string) => {
        const entry = activeImovelEntries.find(e => e.descricao === descricao);
        return entry ? Math.abs(entry.fluxoCaixa) : 0;
    };
    
    const valorVenda = getEntryValue('Venda');
    const comissaoCorretor = getEntryValue('Comissão Corretor');
    const impostoGanhoCapital = getEntryValue('Imposto de Ganho de Capital');
    const saldoDevedor = getEntryValue('Saldo Devedor');
    const entrada = getEntryValue('Entrada');
    const itbi = getEntryValue('ITBI');
    const registro = getEntryValue('Registro');
    const despachante = getEntryValue('Despachante');
    const comissaoLeiloeiro = getEntryValue('Comissão Leiloeiro');
    const taxaFinanciamento = getEntryValue('Taxa Financiamento/Escritura');
    const reforma = getEntryValue('Reforma');
    const desocupacao = getEntryValue('Desocupação');
    const divida = getEntryValue('Dívida');
    const prestacao = getEntryValue('Prestação');
    const condominio = getEntryValue('Condomínio');
    const iptu = getEntryValue('IPTU');
    
    const lucroTotal = valorVenda -
        comissaoCorretor -
        impostoGanhoCapital -
        saldoDevedor - 
        entrada -
        itbi -
        registro -
        despachante -
        comissaoLeiloeiro -
        taxaFinanciamento -
        reforma -
        desocupacao -
        divida -
        prestacao -
        condominio -
        iptu;

    // ROI CALCULATION UPDATE: Cash-on-Cash Return.
    // Denominator = Invested Capital (Acquisition + Prep + Maintenance).
    // Excludes: Sales Commission, Capital Gain Tax, and Saldo Devedor (paid from sale proceeds).
    const custoInvestimentoRealizado = 
        entrada +
        itbi +
        registro +
        despachante +
        comissaoLeiloeiro +
        taxaFinanciamento +
        reforma +
        desocupacao +
        divida +
        prestacao +
        condominio +
        iptu;
    
    const roiTotal = custoInvestimentoRealizado > 0 ? (lucroTotal / custoInvestimentoRealizado) * 100 : 0;
    
    let durationMonths = 1;
    if (activeImovelData.dataCompra) {
        const startDate = new Date(activeImovelData.dataCompra);
        const endDate = activeImovelData.dataVenda ? new Date(activeImovelData.dataVenda) : new Date();
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        durationMonths = Math.max(1, diffDays / 30.44); // Ensure min 1 month-ish equivalent
    }
    
    // NEW ROI MONTHLY FORMULA: Compound Interest
    // Formula: ((1 + roiTotal/100)^(1/months) - 1) * 100
    // If base is <= 0 (total loss > 100%), we cap/handle gracefully.
    const roiDecimal = roiTotal / 100;
    const base = 1 + roiDecimal;
    let roiMensal = 0;
    
    if (base > 0) {
        roiMensal = (Math.pow(base, 1 / durationMonths) - 1) * 100;
    } else {
        // Fallback for total loss scenarios
        roiMensal = -100;
    }

    const numCotistas = activeImovelData.numCotistas || 1;
    const lucroPorCota = lucroTotal / numCotistas;

    return { lucroTotal, roiTotal, roiMensal, lucroPorCota };

  }, [activeImovel, activeImovelEntries, activeImovelData.numCotistas, activeImovelData.dataCompra, activeImovelData.dataVenda]);


  const handleAddImovel = () => {
    let newImovelName = "Novo Imóvel";
    let counter = 2;
    while (imoveisData.all.includes(newImovelName)) {
        newImovelName = `Novo Imóvel ${counter}`;
        counter++;
    }

    const newEntry: Omit<FinancialEntry, 'id'> = {
        imovel: newImovelName,
        estado: 'SP',
        cidade: '',
        tipoCompra: TipoCompra.AVista,
        vendido: Vendido.Nao,
        numCotistas: 1,
        fluxoCaixa: 0,
        tipoDespesa: TipoDespesa.CustoAquisicao,
        descricao: 'Entrada', 
        cota: 0,
        dataCompra: new Date().toISOString().split('T')[0],
        cenario: 'Projetado',
        statusImovel: 'em_andamento'
    };
    
    addEntry(newEntry);
    setActiveImovel(newImovelName);
    setActiveScenario('Projetado');
  };

 const handleDeleteImovel = (imovelToDelete: string) => {
    const entriesToDelete = entries.filter(e => e.imovel === imovelToDelete);
    setRecentlyDeleted({ entries: entriesToDelete, imovelName: imovelToDelete });

    const currentIndex = imoveisData.all.indexOf(imovelToDelete);
    const remainingImoveis = imoveisData.all.filter(i => i !== imovelToDelete);
    let nextActiveImovel = null;

    if (remainingImoveis.length > 0) {
        const nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        nextActiveImovel = remainingImoveis[nextIndex];
    }
    
    deleteEntriesByImovel(imovelToDelete);
    setActiveImovel(nextActiveImovel);
    
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => {
        setRecentlyDeleted(null); 
        undoTimerRef.current = null;
    }, 5000);
  };

  const handleUndoDelete = () => {
    if (recentlyDeleted) {
        restoreEntries(recentlyDeleted.entries);
        setActiveImovel(recentlyDeleted.imovelName);
        setRecentlyDeleted(null);
        if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }
    }
  };
  
  const handleRenameImovel = (e?: FocusEvent | KeyboardEvent) => {
    if (e && e.target) (e.target as HTMLInputElement).blur();
    const oldName = activeImovel;
    const newName = imovelNameInput.trim();

    if (!oldName || !newName || oldName === newName) {
        setImovelNameInput(oldName || ''); 
        return; 
    }
    if (imoveisData.all.includes(newName)) {
        alert("Já existe um imóvel com este nome.");
        setImovelNameInput(oldName);
        return;
    }

    // Use global rename to update all stores (Entries, Status, Fluxo)
    renameImovelGlobal(oldName, newName);
    setActiveImovel(newName);
  };

  const handlePropertyDataChange = (field: keyof FinancialEntry, value: any) => {
    if (!activeImovel) return;
    
    if (field === 'tipoCompra') {
      setOverriddenFields(new Set());
    }
  
    const updates: Partial<FinancialEntry> = { [field]: value };
  
    if (field === 'dataCompra' && value) {
      try {
        const purchaseDate = new Date(value + 'T00:00:00');
        if (!isNaN(purchaseDate.getTime())) {
          purchaseDate.setFullYear(purchaseDate.getFullYear() + 1);
          updates.dataVenda = purchaseDate.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error("Error calculating sale date:", e);
      }
    }
  
    // CRITICAL FIX: Update ALL entries for this property (across all scenarios)
    // to ensure metadata (State, City, Dates, etc.) stays in sync.
    const allPropertyEntries = entries.filter(e => e.imovel === activeImovel);
    
    allPropertyEntries.forEach(entry => {
      let updatedEntry = { ...entry, ...updates };
      if (field === 'numCotistas' || (updates.hasOwnProperty('numCotistas') && updates.numCotistas)) {
        const numCotistas = Number(updates.numCotistas || entry.numCotistas) || 1;
        updatedEntry.cota = entry.fluxoCaixa / numCotistas;
      }
      updateEntry(updatedEntry);
    });
  
    // If no entries exist yet (should rarely happen for activeImovel), create one
    if (allPropertyEntries.length === 0) {
      const newEntry: Omit<FinancialEntry, 'id'> = {
        imovel: activeImovel,
        estado: activeImovelData.estado || 'SP',
        cidade: activeImovelData.cidade || '',
        tipoCompra: activeImovelData.tipoCompra || TipoCompra.AVista,
        vendido: activeImovelData.vendido || Vendido.Nao,
        numCotistas: activeImovelData.numCotistas || 1,
        fluxoCaixa: 0,
        tipoDespesa: TipoDespesa.CustoAquisicao,
        descricao: 'placeholder',
        cota: 0,
        cenario: activeScenario,
        statusImovel: activeImovelData.statusImovel,
        ...updates
      };
      addEntry(newEntry);
    }
  };
  
  const isFieldManual = (field: string): boolean => {
      const manualFields = ["Venda", "Reforma", "Desocupação", "Dívida", "Despachante", "IPTU", "Saldo Devedor", "Valor Aquisição"];
      if (manualFields.includes(field)) return true;
      if(activeImovelData.tipoCompra === TipoCompra.AVista && field === 'Entrada') return true;
      return false;
  };

  const shouldHighlight = (field: string): boolean => {
      const highlightedFields = ["Venda", "Entrada", "Reforma", "Desocupação", "Dívida", "Condomínio", "IPTU", "Valor Aquisição"];
      if (highlightedFields.includes(field)) return true;
      return false;
  };
  
  const handleContextMenu = (e: React.MouseEvent, imovel: string, currentStatus: StatusImovel) => {
      e.preventDefault();
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          imovel: imovel,
          currentStatus: currentStatus
      });
  };

  const handleDuplicate = () => {
      if (contextMenu) {
          const newName = duplicateImovel(contextMenu.imovel);
          setActiveImovel(newName);
          setContextMenu(null);
      }
  };

  const handleMoveCategory = (newStatus: StatusImovel) => {
      if (contextMenu) {
          updateImovelStatus(contextMenu.imovel, newStatus);
          setContextMenu(null);
      }
  };

  // Helper icons for Accordion
  const ChevronDown = () => (
    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
  
  const ChevronRight = () => (
    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );


  return (
    <div className="flex h-full animate-fade-in">
        {/* Left Sidebar - Property List */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-700">
                 <button 
                    onClick={handleAddImovel}
                    className="w-full px-3 py-2 text-sm font-medium bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors"
                >
                    + Novo Imóvel
                </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
                
                {/* Section: Em Andamento */}
                <div>
                    <button 
                        onClick={() => setIsEmAndamentoOpen(!isEmAndamentoOpen)}
                        className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-700 rounded transition-colors"
                    >
                        <span>Em Andamento</span>
                        {isEmAndamentoOpen ? <ChevronDown /> : <ChevronRight />}
                    </button>
                    {isEmAndamentoOpen && (
                        <nav className="space-y-1 mt-1 pl-1">
                            {imoveisData.emAndamento.map(imovel => (
                                <ImovelListItem 
                                    key={imovel} 
                                    imovel={imovel} 
                                    status='em_andamento'
                                    activeImovel={activeImovel}
                                    onSelect={setActiveImovel}
                                    onContextMenu={handleContextMenu}
                                    onDelete={handleDeleteImovel}
                                />
                            ))}
                            {imoveisData.emAndamento.length === 0 && (
                                <p className="text-gray-600 text-xs text-center py-2">Vazio</p>
                            )}
                        </nav>
                    )}
                </div>

                {/* Section: Finalizados */}
                <div>
                     <button 
                        onClick={() => setIsFinalizadosOpen(!isFinalizadosOpen)}
                        className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-700 rounded transition-colors"
                    >
                        <span>Finalizados</span>
                         {isFinalizadosOpen ? <ChevronDown /> : <ChevronRight />}
                    </button>
                    {isFinalizadosOpen && (
                        <nav className="space-y-1 mt-1 pl-1">
                            {imoveisData.finalizados.map(imovel => (
                                <ImovelListItem 
                                    key={imovel} 
                                    imovel={imovel} 
                                    status='finalizado'
                                    activeImovel={activeImovel}
                                    onSelect={setActiveImovel}
                                    onContextMenu={handleContextMenu}
                                    onDelete={handleDeleteImovel}
                                />
                            ))}
                            {imoveisData.finalizados.length === 0 && (
                                <p className="text-gray-600 text-xs text-center py-2">Vazio</p>
                            )}
                        </nav>
                    )}
                </div>

            </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-900">
        
            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed z-50 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 min-w-[180px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        onClick={handleDuplicate}
                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white border-b border-gray-700"
                    >
                        Duplicar Imóvel
                    </button>
                    {contextMenu.currentStatus === 'em_andamento' ? (
                        <button
                            onClick={() => handleMoveCategory('finalizado')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white"
                        >
                            Mover para Finalizados
                        </button>
                    ) : (
                         <button
                            onClick={() => handleMoveCategory('em_andamento')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white"
                        >
                            Mover para Em Andamento
                        </button>
                    )}
                </div>
            )}
            
            {recentlyDeleted && (
                <div className="fixed bottom-6 right-6 z-50 bg-gray-700 text-white py-3 px-5 rounded-lg shadow-2xl flex items-center space-x-4 animate-fade-in-up">
                    <span>Imóvel "{recentlyDeleted.imovelName}" excluído.</span>
                    <button onClick={handleUndoDelete} className="font-bold hover:underline text-cyan-400">
                        Desfazer
                    </button>
                </div>
            )}

            {activeImovel ? (
              <div key={activeImovel} className="space-y-6">
                
                {/* Scenario Tabs */}
                <div className="flex space-x-1 border-b border-gray-700 mb-6">
                     <button
                        onClick={() => setActiveScenario('Projetado')}
                        className={`px-6 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeScenario === 'Projetado' ? 'bg-gray-800 text-cyan-400 border-t border-l border-r border-gray-700' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Projetado
                    </button>
                    <button
                        onClick={() => setActiveScenario('Executado')}
                        className={`px-6 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeScenario === 'Executado' ? 'bg-gray-800 text-cyan-400 border-t border-l border-r border-gray-700' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Executado
                    </button>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400">Estado</label>
                            <select value={activeImovelData.estado} onChange={e => handlePropertyDataChange('estado', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white">
                                {ESTADOS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400">Cidade</label>
                            <input type="text" value={activeImovelData.cidade} onChange={e => handlePropertyDataChange('cidade', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400">Imóvel (Nome)</label>
                            <input 
                              type="text" 
                              value={imovelNameInput} 
                              onChange={(e) => setImovelNameInput(e.target.value)}
                              onBlur={handleRenameImovel}
                              onKeyDown={(e) => e.key === 'Enter' && handleRenameImovel(e)}
                              className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400">Tipo Compra</label>
                            <select value={activeImovelData.tipoCompra} onChange={e => handlePropertyDataChange('tipoCompra', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white">
                                {Object.values(TipoCompra).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400">Data Compra</label>
                            <input 
                                type="date" 
                                value={activeImovelData.dataCompra || ''} 
                                onChange={e => handlePropertyDataChange('dataCompra', e.target.value)} 
                                className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white" 
                            />
                        </div>
                         <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400">Data Venda</label>
                            <input 
                                type="date" 
                                value={activeImovelData.dataVenda || ''} 
                                onChange={e => handlePropertyDataChange('dataVenda', e.target.value)} 
                                className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400">Vendido</label>
                            <select value={activeImovelData.vendido} onChange={e => handlePropertyDataChange('vendido', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white">
                               {Object.values(Vendido).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400">Nº Cotistas</label>
                            <input type="number" min="1" value={activeImovelData.numCotistas} onChange={e => handlePropertyDataChange('numCotistas', parseInt(e.target.value, 10) || 1)} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-white" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {FIELD_GROUPS.map(group => (
                        <div key={group.title} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                            <h3 className="text-xl font-bold mb-4 text-white">{group.title}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                {group.fields.map(field => {
                                    const isAVista = activeImovelData.tipoCompra === TipoCompra.AVista;
                                    const isFinanciado = activeImovelData.tipoCompra === TipoCompra.Financiado;

                                    // Hide fields based on TipoCompra
                                    if (isAVista && (field === 'Saldo Devedor' || field === 'Prestação' || field === 'Valor Aquisição')) {
                                        return null;
                                    }

                                    let entry = activeImovelEntries.find(e => e.descricao === field);
                                    
                                    // REPLICATION LOGIC: Projected -> Executed
                                    if (!entry && activeScenario === 'Executado') {
                                        if (field === 'Entrada' || field === 'Comissão Leiloeiro') {
                                            const projectedEntry = projectedEntries.find(e => e.descricao === field);
                                            if (projectedEntry) {
                                                // We treat the projected entry as the source of truth if executed doesn't exist
                                                entry = projectedEntry; 
                                            }
                                        }
                                    }

                                    const valorAbs = entry ? Math.abs(entry.fluxoCaixa) : 0;
                                    const cotaAbs = entry ? Math.abs(entry.cota) : 0;
                                    
                                    const isMonthlyField = group.type === TipoDespesa.CustoManutencao && (field === 'Prestação');
                                    
                                    let isEditable = true;
                                    // UNLOCKED: ITBI, Registro, Taxa Financiamento/Escritura are now editable manual overrides.
                                    if (isAVista && (field === 'Imposto de Ganho de Capital')) isEditable = false;
                                    // Entrada (Financiado) and Comissão Leiloeiro (Financiado) remain strictly calculated or from 'Valor Aquisição'
                                    if (isFinanciado && field === 'Entrada') isEditable = false; 
                                    if (isFinanciado && field === 'Comissão Leiloeiro') isEditable = false;
                                    
                                    // Unlock Valor Aquisição if Financiado
                                    if (isFinanciado && field === 'Valor Aquisição') isEditable = true;
                                    
                                    const fieldIdentifier = `${activeImovel}-${activeScenario}-${field}`;
                                    const isHighlighted = shouldHighlight(field);
                                    
                                    // Override highlight for calculated fields in Financiado mode
                                    const isActuallyHighlighted = isHighlighted && isEditable;
                                    
                                    const baseInputClasses = `w-full border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 ${!isEditable ? 'bg-gray-700 text-gray-400' : isActuallyHighlighted ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-50' : 'bg-gray-900 text-white'}`;


                                    const renderField = (currentField: string) => {
                                        const valueToDisplay = focusedField === fieldIdentifier ? valorAbs : formatCurrencyBRL(valorAbs);
                                        
                                        const getEntryValue = (descricao: string) => {
                                            const e = activeImovelEntries.find(el => el.descricao === descricao);
                                            return e ? Math.abs(e.fluxoCaixa) : 0;
                                        };
                                        const vendaValue = getEntryValue('Venda');
                                        const valorAquisicaoValue = getEntryValue('Valor Aquisição');

                                        return(
                                            <div key={currentField}>
                                                <label className="block text-sm font-medium text-gray-300 mb-1">{currentField}</label>
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex-grow">
                                                        <span className="text-xs text-gray-400">Valor Total</span>
                                                        <input
                                                            type={focusedField === fieldIdentifier ? "number" : "text"}
                                                            value={valueToDisplay}
                                                            readOnly={!isEditable}
                                                            onFocus={() => setFocusedField(fieldIdentifier)}
                                                            onBlur={(e) => {
                                                                setFocusedField(null);
                                                                const val = parseCurrencyBRL(e.target.value);
                                                                handleValueChange(group.type, currentField, val);
                                                            }}
                                                            onChange={(e) => {
                                                                 const val = parseCurrencyBRL(e.target.value);
                                                                 handleValueChange(group.type, currentField, val);
                                                            }}
                                                            className={baseInputClasses}
                                                            placeholder="R$ 0,00"
                                                        />
                                                    </div>
                                                    {currentField === 'Comissão Corretor' && (
                                                        <div className="flex-shrink-0 flex items-end space-x-1">
                                                            <input 
                                                                type="number" 
                                                                step="0.1" 
                                                                value={comissaoCorretorPercent} 
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setComissaoCorretorPercent(val);
                                                                    // Immediate reactivity fix
                                                                    handleValueChange(group.type, currentField, vendaValue * (val/100), { isAutomatic: true });
                                                                    // We also remove it from override to ensure it stays reactive
                                                                    setOverriddenFields(prev => {
                                                                        const next = new Set(prev);
                                                                        next.delete(currentField);
                                                                        return next;
                                                                    });
                                                                }} 
                                                                className="w-16 bg-gray-900 border-gray-700 rounded-md p-2 text-white" 
                                                            />
                                                            <span className="pb-2">%</span>
                                                        </div>
                                                    )}
                                                    {currentField === 'Comissão Leiloeiro' && (
                                                        <div className="flex-shrink-0 flex items-end space-x-1">
                                                            <input 
                                                                type="number" 
                                                                step="0.1" 
                                                                value={comissaoLeiloeiroPercent} 
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setComissaoLeiloeiroPercent(val);
                                                                     // Immediate reactivity
                                                                     const base = isFinanciado ? valorAquisicaoValue : getEntryValue('Entrada');
                                                                     if (base > 0) {
                                                                         handleValueChange(group.type, currentField, base * (val/100), { isAutomatic: true });
                                                                     }
                                                                }} 
                                                                className="w-16 bg-gray-900 border-gray-700 rounded-md p-2 text-white" 
                                                            />
                                                            <span className="pb-2">%</span>
                                                        </div>
                                                    )}
                                                    {currentField === 'ITBI' && (isAVista || isFinanciado) && (
                                                        <div className="flex-shrink-0 flex items-end space-x-1">
                                                            <input 
                                                                type="number" 
                                                                step="0.1" 
                                                                value={itbiPercent} 
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setItbiPercent(val);
                                                                    handleValueChange(group.type, currentField, vendaValue * (val/100), { isAutomatic: true });
                                                                     setOverriddenFields(prev => {
                                                                        const next = new Set(prev);
                                                                        next.delete(currentField);
                                                                        return next;
                                                                    });
                                                                }} 
                                                                className="w-16 bg-gray-900 border-gray-700 rounded-md p-2 text-white" 
                                                            />
                                                            <span className="pb-2">%</span>
                                                        </div>
                                                    )}
                                                    {currentField === 'Entrada' && isFinanciado && (
                                                         <div className="flex-shrink-0 flex items-end space-x-1">
                                                            <input 
                                                                type="number" 
                                                                step="0.1" 
                                                                value={entradaPercentFinanciado} 
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setEntradaPercentFinanciado(val);
                                                                    handleValueChange(group.type, currentField, valorAquisicaoValue * (val/100), { isAutomatic: true });
                                                                }} 
                                                                className="w-16 bg-gray-900 border-gray-700 rounded-md p-2 text-white" 
                                                            />
                                                            <span className="pb-2">%</span>
                                                        </div>
                                                    )}
                                                    {currentField === 'Imposto de Ganho de Capital' && isAVista && (
                                                        <div className="flex-shrink-0 flex items-end space-x-1">
                                                            <input type="number" step="0.1" value={ganhoCapitalPercent} onChange={e => setGanhoCapitalPercent(parseFloat(e.target.value) || 0)} className="w-16 bg-gray-900 border-gray-700 rounded-md p-2 text-white" />
                                                            <span className="pb-2">%</span>
                                                        </div>
                                                    )}
                                                    <div className="w-1/2">
                                                        <span className="text-xs text-gray-400">Valor Cota</span>
                                                        <input type="text" value={formatCurrencyBRL(cotaAbs)} readOnly className="w-full bg-gray-900 border-gray-700 rounded-md p-2 text-gray-400"/>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    };

                                    if (field === 'Condomínio') {
                                        return (
                                            <React.Fragment key={field}>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-300 mb-1">Condomínio (Mensal)</label>
                                                     <div className="flex-grow">
                                                         <input
                                                            type="text"
                                                            value={monthlyInputs[field] || 'R$ 0,00'}
                                                            onFocus={(e) => {
                                                                const parsedValue = parseCurrencyBRL(e.target.value);
                                                                setMonthlyInputs(prev => ({ ...prev, [field]: parsedValue === 0 ? '' : String(parsedValue) }));
                                                            }}
                                                            onBlur={(e) => {
                                                                const val = parseCurrencyBRL(e.target.value);
                                                                handleValueChange(group.type, field, val * 12);
                                                                setMonthlyInputs(prev => ({ ...prev, [field]: formatCurrencyBRL(val)}));
                                                            }}
                                                            onChange={(e) => setMonthlyInputs(prev => ({ ...prev, [field]: e.target.value }))}
                                                            className={baseInputClasses}
                                                            placeholder="R$ 0,00"
                                                        />
                                                     </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-300 mb-1">Condomínio (Anual)</label>
                                                    <div className="flex-grow">
                                                        <input
                                                            type="text"
                                                            value={formatCurrencyBRL(valorAbs)}
                                                            readOnly
                                                            className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-gray-400"
                                                        />
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    }
                                    
                                    if (isMonthlyField) { // Handles 'Prestação'
                                         return (
                                            <div key={field}>
                                                <label className="block text-sm font-medium text-gray-300 mb-1">{field}</label>
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex-grow">
                                                        <span className="text-xs text-gray-400">Valor (Mensal)</span>
                                                        <input
                                                            type="text"
                                                            value={monthlyInputs[field] || 'R$ 0,00'}
                                                            onFocus={(e) => {
                                                                const parsedValue = parseCurrencyBRL(e.target.value);
                                                                setMonthlyInputs(prev => ({ ...prev, [field]: parsedValue === 0 ? '' : String(parsedValue) }));
                                                            }}
                                                            onBlur={(e) => {
                                                                const val = parseCurrencyBRL(e.target.value);
                                                                handleValueChange(group.type, field, val * 12);
                                                                setMonthlyInputs(prev => ({...prev, [field]: formatCurrencyBRL(val) }));
                                                            }}
                                                            onChange={(e) => setMonthlyInputs(prev => ({ ...prev, [field]: e.target.value }))}
                                                            className={baseInputClasses}
                                                            placeholder="R$ 0,00"
                                                        />
                                                    </div>
                                                     <div className="w-1/2">
                                                        <span className="text-xs text-gray-400">Valor Cota</span>
                                                        <input type="text" value={formatCurrencyBRL(cotaAbs)} readOnly className="w-full bg-gray-900 border-gray-700 rounded-md p-2 text-gray-400"/>
                                                    </div>
                                                </div>
                                            </div>
                                         )
                                    }

                                    return renderField(field);
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6">
                    <h3 className="text-xl font-bold mb-4 text-white">Resumo da Operação ({activeScenario})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <div className="bg-gray-700 p-4 rounded-md text-center">
                            <h4 className="text-sm font-medium text-gray-400">Lucro Total da Operação</h4>
                            <p className={`text-2xl font-bold mt-1 ${summary.lucroTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrencyBRL(summary.lucroTotal)}
                            </p>
                        </div>
                         <div className="bg-gray-700 p-4 rounded-md text-center">
                            <h4 className="text-sm font-medium text-gray-400">Lucro Total por Cota</h4>
                            <p className={`text-2xl font-bold mt-1 ${summary.lucroPorCota >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrencyBRL(summary.lucroPorCota)}
                            </p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-md text-center">
                            <h4 className="text-sm font-medium text-gray-400">ROI Total</h4>
                            <p className={`text-2xl font-bold mt-1 ${summary.roiTotal >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                                {summary.roiTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                            </p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-md text-center">
                            <h4 className="text-sm font-medium text-gray-400">ROI Mensal</h4>
                            <p className={`text-2xl font-bold mt-1 ${summary.roiMensal >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                                {summary.roiMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                            </p>
                        </div>
                    </div>
                </div>
              </div>
            ) : (
                <div className="flex h-full items-center justify-center">
                     <div className="text-center bg-gray-800 p-8 rounded-lg shadow-lg">
                        <h2 className="text-xl text-white font-semibold">Selecione ou Crie um Imóvel</h2>
                        <p className="text-gray-400 mt-2">Use o menu lateral para gerenciar seus imóveis.</p>
                        <button 
                            onClick={handleAddImovel}
                            className="mt-6 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500"
                        >
                            + Novo Imóvel
                        </button>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
};

export default DataEntry;