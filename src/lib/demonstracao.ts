// ============================================================================
// MODO DEMONSTRAÇÃO
// Dados fictícios para quem abre o app antes de conectar uma planilha.
// Nada daqui é salvo em lugar nenhum.
// ============================================================================

import type { Dados } from './tipos';

const CATEGORIAS = ['TRANSPORTE', 'ALIMENTAÇÃO', 'CUIDADOS PESSOAIS', 'ATIVIDADES FÍSICAS', 'LAZER', 'IMPREVISTOS'];
const SUBCATEGORIAS = ['Carro', 'Uber', 'Restaurante', 'Lanche', 'Supermercado', 'Beleza', 'Remédio', 'Viagens', 'Eventos', 'Compras'];
const MOTIVOS = ['PESSOAL', 'FAMILIA', 'AMIGOS', 'TRABALHO', 'GASOLINA'];

/** Mês com dois dígitos, contando para trás a partir de hoje. */
function mesAtras(quantidade: number): string {
  const hoje = new Date();
  const data = new Date(hoje.getFullYear(), hoje.getMonth() - quantidade, 10);
  const mes = `${data.getMonth() + 1}`.padStart(2, '0');
  return `${data.getFullYear()}-${mes}`;
}

export function dadosDemonstracao(): Dados {
  const gastos = [
    { mes: 0, categoria: 'ALIMENTAÇÃO', subcategoria: 'Restaurante', motivo: 'AMIGOS', valor: 128.4, descricao: 'Jantar de sábado' },
    { mes: 0, categoria: 'TRANSPORTE', subcategoria: 'Uber', motivo: 'TRABALHO', valor: 32.9, descricao: '' },
    { mes: 0, categoria: 'ALIMENTAÇÃO', subcategoria: 'Supermercado', motivo: 'PESSOAL', valor: 410.15, descricao: 'Compra do mês' },
    { mes: 0, categoria: 'LAZER', subcategoria: 'Eventos', motivo: 'AMIGOS', valor: 90, descricao: '' },
    { mes: 1, categoria: 'TRANSPORTE', subcategoria: 'Carro', motivo: 'GASOLINA', valor: 220, descricao: '' },
    { mes: 1, categoria: 'ALIMENTAÇÃO', subcategoria: 'Lanche', motivo: 'PESSOAL', valor: 24.5, descricao: '' },
    { mes: 1, categoria: 'CUIDADOS PESSOAIS', subcategoria: 'Beleza', motivo: 'PESSOAL', valor: 95, descricao: '' },
    { mes: 2, categoria: 'ALIMENTAÇÃO', subcategoria: 'Supermercado', motivo: 'PESSOAL', valor: 388.7, descricao: '' },
    { mes: 2, categoria: 'LAZER', subcategoria: 'Viagens', motivo: 'FAMILIA', valor: 650, descricao: 'Fim de semana na praia' },
    { mes: 2, categoria: 'IMPREVISTOS', subcategoria: 'Remédio', motivo: 'PESSOAL', valor: 72.3, descricao: '' },
  ].map((item, indice) => ({
    id: `demo-gasto-${indice}`,
    data: `${mesAtras(item.mes)}-${(indice % 25) + 1}`.replace(/-(\d)$/, '-0$1'),
    categoria: item.categoria,
    subcategoria: item.subcategoria,
    motivo: item.motivo,
    valor: item.valor,
    descricao: item.descricao,
    criado_em: `${mesAtras(item.mes)}-10T12:00:00`,
  }));

  const investimentos = [0, 1, 2, 3, 4, 5].flatMap((mes, indice) => ([
    {
      id: `demo-inv-f-${indice}`,
      data: `${mesAtras(mes)}-05`,
      caixa: 'FUTURO' as const,
      operacao: 'APORTE' as const,
      valor: 1400,
      descricao: '',
      criado_em: `${mesAtras(mes)}-05T12:00:00`,
    },
    {
      id: `demo-inv-p-${indice}`,
      data: `${mesAtras(mes)}-05`,
      caixa: 'PESSOAL' as const,
      operacao: 'APORTE' as const,
      valor: 600,
      descricao: '',
      criado_em: `${mesAtras(mes)}-05T12:00:00`,
    },
  ]));

  return {
    gastos,
    investimentos,
    metas: [
      { categoria: 'TRANSPORTE', valor_mensal: 400 },
      { categoria: 'ALIMENTAÇÃO', valor_mensal: 900 },
      { categoria: 'CUIDADOS PESSOAIS', valor_mensal: 200 },
      { categoria: 'ATIVIDADES FÍSICAS', valor_mensal: 150 },
      { categoria: 'LAZER', valor_mensal: 500 },
      { categoria: 'IMPREVISTOS', valor_mensal: 300 },
    ],
    listas: {
      categorias: CATEGORIAS,
      subcategorias: SUBCATEGORIAS,
      motivos: MOTIVOS,
    },
    config: { percentual_futuro: 70, titulo: 'Planejamento Financeiro' },
  };
}
