// ============================================================================
// CLIENTE DA API (Apps Script)
//
// O Apps Script sempre responde HTTP 200; o que vale é o campo "ok" do JSON.
// Por isso nada aqui olha para res.status, e todo erro vira Error com a
// mensagem que o script mandou, já em português e pronta para a tela.
// ============================================================================

import type { Conexao, Dados, Gasto, GastoEntrada, Investimento, InvestimentoEntrada, Meta } from './tipos';

type TipoRegistro = 'gasto' | 'investimento' | 'meta';
type AcaoRegistro = 'create' | 'createMany' | 'update' | 'delete';

interface CorpoPost {
  token: string;
  type: TipoRegistro;
  action: AcaoRegistro;
  data?: unknown;
  id?: string;
}

async function lerResposta(res: Response): Promise<any> {
  const texto = await res.text();

  let json: any;
  try {
    json = JSON.parse(texto);
  } catch {
    // Acontece quando a URL está errada ou a implantação exige login:
    // o Google devolve uma página HTML em vez de JSON.
    throw new Error(
      'A planilha respondeu algo inesperado. Confira a URL e se a implantação está como "Qualquer pessoa".'
    );
  }

  if (!json.ok) {
    throw new Error(json.error || 'A planilha recusou a operação.');
  }

  return json;
}

function tratarFalhaDeRede(erro: unknown): never {
  if (erro instanceof Error && erro.name === 'TypeError') {
    throw new Error('Não foi possível falar com a planilha. Verifique sua conexão.');
  }
  throw erro;
}

export async function buscarTudo(conexao: Conexao): Promise<Dados> {
  let json: any;

  try {
    const res = await fetch(`${conexao.url}?token=${encodeURIComponent(conexao.token)}`);
    json = await lerResposta(res);
  } catch (erro) {
    tratarFalhaDeRede(erro);
  }

  return {
    gastos: json.gastos || [],
    investimentos: json.investimentos || [],
    metas: json.metas || [],
    listas: {
      categorias: json.listas?.categorias || [],
      subcategorias: json.listas?.subcategorias || [],
      motivos: json.listas?.motivos || [],
    },
    config: json.config || {},
  };
}

/**
 * text/plain é proposital: evita o preflight de CORS, que o Apps Script
 * não responde. O corpo continua sendo JSON.
 */
async function enviar(conexao: Conexao, corpo: Omit<CorpoPost, 'token'>): Promise<any> {
  try {
    const res = await fetch(conexao.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...corpo, token: conexao.token }),
    });
    return await lerResposta(res);
  } catch (erro) {
    tratarFalhaDeRede(erro);
  }
}

// ---------- Gastos ----------

export async function criarGasto(conexao: Conexao, dados: GastoEntrada): Promise<Gasto> {
  const json = await enviar(conexao, { type: 'gasto', action: 'create', data: dados });
  return json.registro as Gasto;
}

/** Lote: grava tudo ou nada, numa única chamada. */
export async function criarGastos(conexao: Conexao, lista: GastoEntrada[]): Promise<Gasto[]> {
  const json = await enviar(conexao, { type: 'gasto', action: 'createMany', data: lista });
  return (json.registros || []) as Gasto[];
}

export async function atualizarGasto(conexao: Conexao, id: string, dados: GastoEntrada): Promise<Gasto> {
  const json = await enviar(conexao, { type: 'gasto', action: 'update', id, data: dados });
  return json.registro as Gasto;
}

export async function excluirGasto(conexao: Conexao, id: string): Promise<void> {
  await enviar(conexao, { type: 'gasto', action: 'delete', id });
}

// ---------- Investimentos ----------

export async function criarInvestimento(conexao: Conexao, dados: InvestimentoEntrada): Promise<Investimento> {
  const json = await enviar(conexao, { type: 'investimento', action: 'create', data: dados });
  return json.registro as Investimento;
}

export async function atualizarInvestimento(conexao: Conexao, id: string, dados: InvestimentoEntrada): Promise<Investimento> {
  const json = await enviar(conexao, { type: 'investimento', action: 'update', id, data: dados });
  return json.registro as Investimento;
}

export async function excluirInvestimento(conexao: Conexao, id: string): Promise<void> {
  await enviar(conexao, { type: 'investimento', action: 'delete', id });
}

// ---------- Metas ----------

export async function salvarMeta(conexao: Conexao, meta: Meta): Promise<Meta> {
  const json = await enviar(conexao, { type: 'meta', action: 'update', data: meta });
  return json.registro as Meta;
}

export async function excluirMeta(conexao: Conexao, categoria: string): Promise<void> {
  await enviar(conexao, { type: 'meta', action: 'delete', id: categoria });
}