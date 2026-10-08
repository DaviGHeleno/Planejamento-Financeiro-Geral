// ============================================================================
// AGREGAÇÕES
// Tudo é calculado a partir dos lançamentos. A planilha nunca guarda saldo,
// e nenhum registro antigo é alterado por um lançamento novo.
// ============================================================================

import type { Caixa, Gasto, Investimento, Meta } from './tipos';
import { chave, mesDe } from './formato';

// ============================================================================
// AGRUPAMENTO DE NOMES
// "Alimentação", "ALIMENTACAO" e " alimentação" viram o mesmo grupo.
// O nome exibido é o da aba Listas quando existe; senão, a primeira grafia
// encontrada nos dados. Grupos da lista vêm primeiro, na ordem da lista;
// os demais (nomes antigos, digitados em "Outro…") vêm depois, em ordem
// alfabética.
// ============================================================================

export interface Agrupador {
  /** Nome canônico de um valor qualquer; "" quando vazio. */
  rotuloDe: (valor: string) => string;
  /** Nomes canônicos presentes nos valores, já ordenados. */
  rotulos: string[];
}

export function criarAgrupador(valores: string[], preferidos: string[]): Agrupador {
  const nomePorChave = new Map<string, string>();

  preferidos.forEach((p) => {
    const k = chave(p);
    if (k && !nomePorChave.has(k)) nomePorChave.set(k, p.trim());
  });

  const presentes = new Set<string>();
  valores.forEach((v) => {
    const k = chave(v);
    if (!k) return;
    if (!nomePorChave.has(k)) nomePorChave.set(k, (v || '').trim());
    presentes.add(k);
  });

  const ordemPreferida = preferidos.map(chave);
  const posicao = (k: string) => {
    const i = ordemPreferida.indexOf(k);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const rotulos = Array.from(presentes)
    .sort((a, b) => {
      const diferenca = posicao(a) - posicao(b);
      if (diferenca !== 0) return diferenca;
      return (nomePorChave.get(a) || '').localeCompare(nomePorChave.get(b) || '', 'pt-BR');
    })
    .map((k) => nomePorChave.get(k) || k);

  const rotuloDe = (valor: string) => {
    const k = chave(valor);
    if (!k) return '';
    return nomePorChave.get(k) || (valor || '').trim();
  };

  return { rotuloDe, rotulos };
}

/**
 * Quantos meses de meta entram no "Planejado".
 * Um mês específico: 1. Ano inteiro já encerrado ou futuro: 12.
 * Ano corrente: só os meses decorridos até agora — comparar o gasto de
 * outubro com a meta de dezembro faria todo ano parecer folgado.
 */
export function mesesDePlanejamento(ano: number, mesEscolhido: string | null, referencia: Date = new Date()): number {
  if (mesEscolhido) return 1;
  if (ano === referencia.getFullYear()) return referencia.getMonth() + 1;
  return 12;
}

export interface SaldoInvestimentos {
  futuro: number;
  pessoal: number;
  total: number;
}

/** Aporte soma, resgate subtrai. */
export function saldoInvestimentos(investimentos: Investimento[]): SaldoInvestimentos {
  let futuro = 0;
  let pessoal = 0;

  investimentos.forEach((registro) => {
    const sinal = registro.operacao === 'RESGATE' ? -1 : 1;
    const valor = sinal * (Number(registro.valor) || 0);

    if (registro.caixa === 'FUTURO') futuro += valor;
    else if (registro.caixa === 'PESSOAL') pessoal += valor;
  });

  return {
    futuro: arredondar(futuro),
    pessoal: arredondar(pessoal),
    total: arredondar(futuro + pessoal),
  };
}

export interface PontoEvolucao {
  mes: string;        // AAAA-MM
  Futuro: number;
  Pessoal: number;
  Total: number;
}

/**
 * Saldo acumulado mês a mês, do primeiro lançamento até o mês mais recente.
 * Meses sem movimento aparecem repetindo o saldo anterior, para a linha do
 * gráfico não dar saltos nem buracos.
 */
export function evolucaoInvestimentos(investimentos: Investimento[]): PontoEvolucao[] {
  if (investimentos.length === 0) return [];

  const porMes = new Map<string, { futuro: number; pessoal: number }>();

  investimentos.forEach((registro) => {
    const mes = mesDe(registro.data);
    if (!mes) return;

    const sinal = registro.operacao === 'RESGATE' ? -1 : 1;
    const valor = sinal * (Number(registro.valor) || 0);
    const atual = porMes.get(mes) || { futuro: 0, pessoal: 0 };

    if (registro.caixa === 'FUTURO') atual.futuro += valor;
    else if (registro.caixa === 'PESSOAL') atual.pessoal += valor;

    porMes.set(mes, atual);
  });

  const meses = Array.from(porMes.keys()).sort();
  const sequencia = mesesEntre(meses[0], meses[meses.length - 1]);

  let futuro = 0;
  let pessoal = 0;

  return sequencia.map((mes) => {
    const movimento = porMes.get(mes);
    if (movimento) {
      futuro += movimento.futuro;
      pessoal += movimento.pessoal;
    }
    return {
      mes,
      Futuro: arredondar(futuro),
      Pessoal: arredondar(pessoal),
      Total: arredondar(futuro + pessoal),
    };
  });
}

/** Todos os meses de "2026-01" até "2026-10", inclusive. */
export function mesesEntre(inicio: string, fim: string): string[] {
  const [anoInicio, mesInicio] = inicio.split('-').map(Number);
  const [anoFim, mesFim] = fim.split('-').map(Number);

  const resultado: string[] = [];
  let ano = anoInicio;
  let mes = mesInicio;

  // Trava de segurança: 100 anos de meses, caso cheguem datas absurdas.
  for (let i = 0; i < 1200; i++) {
    resultado.push(`${ano}-${`${mes}`.padStart(2, '0')}`);
    if (ano === anoFim && mes === mesFim) break;
    mes++;
    if (mes > 12) { mes = 1; ano++; }
  }

  return resultado;
}

/** Divide um aporte em Futuro e Pessoal pelo percentual do Futuro. */
export function dividirAporte(valor: number, percentualFuturo: number): { futuro: number; pessoal: number } {
  const percentual = Math.min(100, Math.max(0, percentualFuturo));
  const futuro = arredondar((valor * percentual) / 100);
  return { futuro, pessoal: arredondar(valor - futuro) };
}

/** Soma dos gastos por categoria, no período já filtrado. */
export function totalPorCategoria(gastos: Gasto[]): Record<string, number> {
  const mapa: Record<string, number> = {};

  gastos.forEach((gasto) => {
    const categoria = (gasto.categoria || '').trim();
    if (!categoria) return;
    mapa[categoria] = arredondar((mapa[categoria] || 0) + (Number(gasto.valor) || 0));
  });

  return mapa;
}

/** Meta mensal de uma categoria; 0 quando não houver. */
export function metaDa(metas: Meta[], categoria: string): number {
  const encontrada = metas.find((m) => (m.categoria || '').trim() === categoria.trim());
  return encontrada ? Number(encontrada.valor_mensal) || 0 : 0;
}

export function caixaValida(valor: string): valor is Caixa {
  return valor === 'FUTURO' || valor === 'PESSOAL';
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}