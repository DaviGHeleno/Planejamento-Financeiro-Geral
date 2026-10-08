// ============================================================================
// TIPOS COMPARTILHADOS
// Espelham exatamente as colunas das abas da planilha.
// ============================================================================

export type Caixa = 'FUTURO' | 'PESSOAL';
export type Operacao = 'APORTE' | 'RESGATE';

export interface Gasto {
  id: string;
  data: string;          // AAAA-MM-DD
  categoria: string;
  subcategoria: string;
  motivo: string;
  valor: number;
  descricao: string;
  criado_em: string;
}

export interface Investimento {
  id: string;
  data: string;          // AAAA-MM-DD
  caixa: Caixa;
  operacao: Operacao;
  valor: number;
  descricao: string;
  criado_em: string;
}

export interface Meta {
  categoria: string;
  valor_mensal: number;
}

export interface Listas {
  categorias: string[];
  subcategorias: string[];
  motivos: string[];
}

export interface Config {
  percentual_futuro?: number;
  titulo?: string;
  [chave: string]: string | number | undefined;
}

export interface Dados {
  gastos: Gasto[];
  investimentos: Investimento[];
  metas: Meta[];
  listas: Listas;
  config: Config;
}

// Campos que o app envia ao criar ou editar (o script cuida de id e criado_em).
export type GastoEntrada = Omit<Gasto, 'id' | 'criado_em'>;
export type InvestimentoEntrada = Omit<Investimento, 'id' | 'criado_em'>;

export interface Conexao {
  url: string;
  token: string;
}
