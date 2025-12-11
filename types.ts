

export enum TipoCompra {
  AVista = "À Vista",
  Financiado = "Financiado",
}

export enum TipoDespesa {
  Venda = "Venda",
  CustoAquisicao = "Custo Aquisição",
  CustoPreparacao = "Custo Preparação",
  CustoManutencao = "Custo Manutenção Anual",
}

export enum Vendido {
  Sim = "Sim",
  Nao = "Não",
}

export type Cenario = 'Projetado' | 'Executado';

export type StatusImovel = 'em_andamento' | 'finalizado';

export interface FinancialEntry {
  id: string;
  estado: string;
  cidade: string;
  imovel: string;
  cenario: Cenario; 
  statusImovel: StatusImovel;
  tipoCompra: TipoCompra;
  dataCompra?: string; // YYYY-MM-DD
  dataVenda?: string; // YYYY-MM-DD
  fluxoCaixa: number;
  tipoDespesa: TipoDespesa;
  descricao: string;
  cota: number;
  vendido: Vendido;
  numCotistas: number;
}

export interface CashFlowEntry {
  id: string;
  imovelId: string; // Nome do imóvel para linkar
  data: string;
  subtipo: string;
  tipoDespesa: string; // TipoDespesa enum string value or custom
  descricao: string;
  custoTotal: number;
  custoCota: number;
  dedutivel: 'Sim' | 'Não';
}

export interface StatusEntry {
  imovel: string;
  estado: string;
  dataAquisicao?: string;
  dataRegistro?: string;
  dataImissaoPosse?: string;
  dataDesocupacao?: string;
  dataIncioReforma?: string;
  dataVenda?: string;
}

// Nova estrutura para geração de formulário
export const FIELD_GROUPS = [
  { 
    title: 'Venda', 
    type: TipoDespesa.Venda, 
    fields: ["Venda", "Comissão Corretor", "Imposto de Ganho de Capital", "Saldo Devedor"] 
  },
  { 
    title: 'Custo Aquisição', 
    type: TipoDespesa.CustoAquisicao, 
    fields: ["Valor Aquisição", "Entrada", "ITBI", "Registro", "Despachante" ,"Comissão Leiloeiro", "Taxa Financiamento/Escritura"] 
  },
  { 
    title: 'Custo Preparação', 
    type: TipoDespesa.CustoPreparacao, 
    fields: ["Reforma", "Desocupação", "Dívida"] 
  },
  { 
    title: 'Custo Manutenção Anual', 
    type: TipoDespesa.CustoManutencao, 
    fields: ["Prestação", "Condomínio", "IPTU"] 
  },
];


export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];