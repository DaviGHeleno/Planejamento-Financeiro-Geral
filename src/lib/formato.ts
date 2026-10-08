// ============================================================================
// FORMATAÇÃO E CONVERSÃO
// Funções puras, sem dependência de React — são as que levam teste unitário.
// ============================================================================

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** 1234.5 → "R$ 1.234,50" */
export function formatarMoeda(valor: number): string {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Texto digitado pelo usuário → número.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 90" e "90".
 * A regra: se houver vírgula, ela é o separador decimal e os pontos são de
 * milhar. Sem vírgula, o ponto é decimal.
 */
export function paraNumero(texto: string | number | null | undefined): number {
  if (typeof texto === 'number') return isNaN(texto) ? 0 : texto;

  const limpo = (texto ?? '').toString().replace('R$', '').replace(/\s/g, '').trim();
  if (limpo === '') return 0;

  let normalizado: string;
  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // "1.234" ou "1.234.567": ponto de milhar, sem centavos.
    normalizado = limpo.replace(/\./g, '');
  } else {
    normalizado = limpo;
  }

  const numero = Number(normalizado);
  return isNaN(numero) ? 0 : numero;
}

/** "2026-10-02" → "02/10/2026" */
export function formatarData(data: string): string {
  const partes = (data || '').split('-');
  if (partes.length !== 3) return data || '';
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/** "2026-10-02" → "2026-10" */
export function mesDe(data: string): string {
  return (data || '').slice(0, 7);
}

/** "2026-10" → "Outubro/26" */
export function rotuloMes(mes: string): string {
  const [ano, numero] = (mes || '').split('-');
  const indice = Number(numero) - 1;
  if (!ano || indice < 0 || indice > 11) return mes || '';
  return `${MESES[indice]}/${ano.slice(2)}`;
}

/** "2026-10" → "Out/26", para eixos de gráfico */
export function rotuloMesCurto(mes: string): string {
  const [ano, numero] = (mes || '').split('-');
  const indice = Number(numero) - 1;
  if (!ano || indice < 0 || indice > 11) return mes || '';
  return `${MESES[indice].slice(0, 3)}/${ano.slice(2)}`;
}

/** Data de hoje em AAAA-MM-DD, no fuso local (não UTC). */
export function hoje(): string {
  const agora = new Date();
  const mes = `${agora.getMonth() + 1}`.padStart(2, '0');
  const dia = `${agora.getDate()}`.padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/**
 * Confere se o texto digitado é um valor que o app sabe ler sem ambiguidade:
 * "90", "90,5", "90.50", "1.234,56" ou "R$ 1.234,56".
 * Rejeita, por exemplo, "1,234.56" (formato americano) e "12,3,4".
 */
export function valorValido(texto: string): boolean {
  const v = (texto || '').replace('R$', '').replace(/\s/g, '').trim();
  if (v === '') return false;

  const padroes = [
    /^\d+$/,                          // 90
    /^\d+,\d{1,2}$/,                  // 90,5
    /^\d+\.\d{1,2}$/,                // 90.50
    /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/, // 1.234,56
  ];

  return padroes.some((p) => p.test(v)) && paraNumero(v) > 0;
}

/**
 * Data vinda de planilha importada → AAAA-MM-DD.
 * Aceita Date (célula de data do Excel), "AAAA-MM-DD" e "DD/MM/AAAA".
 * Devolve "" quando não reconhece.
 */
export function normalizarData(entrada: unknown): string {
  if (entrada instanceof Date && !isNaN(entrada.getTime())) {
    const mes = `${entrada.getMonth() + 1}`.padStart(2, '0');
    const dia = `${entrada.getDate()}`.padStart(2, '0');
    return `${entrada.getFullYear()}-${mes}-${dia}`;
  }

  const texto = (entrada ?? '').toString().trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (br) {
    const ano = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${ano}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }

  return '';
}

/** "Alimentação" → "alimentacao": para comparar sem acento e sem caixa. */
export function chave(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}