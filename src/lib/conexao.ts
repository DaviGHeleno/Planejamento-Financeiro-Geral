// ============================================================================
// CONEXÃO COM A PLANILHA DO USUÁRIO
// A URL do Apps Script e o token ficam só no navegador de quem usa.
// ============================================================================

import type { Conexao } from './tipos';

const CHAVE = 'conexao-planilha';

export function lerConexao(): Conexao | null {
  if (typeof window === 'undefined') return null;

  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return null;

    const dados = JSON.parse(bruto);
    if (!dados || typeof dados.url !== 'string' || typeof dados.token !== 'string') return null;
    if (dados.url.trim() === '' || dados.token.trim() === '') return null;

    return { url: dados.url.trim(), token: dados.token.trim() };
  } catch {
    return null;
  }
}

export function salvarConexao(conexao: Conexao): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify({
      url: conexao.url.trim(),
      token: conexao.token.trim(),
    }));
  } catch {
    // Sem localStorage (navegação privada), a conexão vale só para esta aba.
  }
}

export function apagarConexao(): void {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // Nada a fazer.
  }
}

/**
 * Erros comuns de digitação da URL, checados antes de gastar uma chamada.
 * A URL publicada do Apps Script termina em /exec — a que termina em /dev
 * só funciona para quem é dono do script.
 */
export function problemaNaUrl(url: string): string | null {
  const limpa = url.trim();

  if (limpa === '') return 'Informe a URL do Apps Script.';
  if (!limpa.startsWith('https://')) return 'A URL precisa começar com https://';
  if (!limpa.includes('script.google.com')) return 'Essa URL não parece ser a de um Apps Script.';
  if (limpa.endsWith('/dev')) return 'Use a URL que termina em /exec, não a de teste (/dev).';
  if (!limpa.endsWith('/exec')) return 'A URL publicada termina em /exec. Confira se copiou inteira.';

  return null;
}
