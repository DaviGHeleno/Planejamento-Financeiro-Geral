'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as api from '../lib/api';
import { lerConexao, salvarConexao, apagarConexao } from '../lib/conexao';
import { dadosDemonstracao } from '../lib/demonstracao';
import type { Conexao, Dados, Gasto, GastoEntrada, Investimento, InvestimentoEntrada, Meta } from '../lib/tipos';

// ============================================================================
// ESTADO DOS DADOS
//
// Uma chamada por carregamento: o GET traz tudo, fica em memória, e as telas
// filtram e somam localmente. Toda escrita atualiza só o registro afetado,
// sem recarregar a planilha inteira.
// ============================================================================

interface ContextoDados {
  dados: Dados | null;
  carregando: boolean;
  erro: string;
  modoDemonstracao: boolean;
  conexao: Conexao | null;
  pronto: boolean;                       // já tentou ler o localStorage

  recarregar: () => Promise<void>;
  conectar: (conexao: Conexao) => Promise<void>;
  desconectar: () => void;

  criarGasto: (dados: GastoEntrada) => Promise<Gasto>;
  criarGastos: (lista: GastoEntrada[]) => Promise<Gasto[]>;
  atualizarGasto: (id: string, dados: GastoEntrada) => Promise<Gasto>;
  excluirGasto: (id: string) => Promise<void>;

  criarInvestimento: (dados: InvestimentoEntrada) => Promise<Investimento>;
  atualizarInvestimento: (id: string, dados: InvestimentoEntrada) => Promise<Investimento>;
  excluirInvestimento: (id: string) => Promise<void>;

  salvarMeta: (meta: Meta) => Promise<void>;
}

const Contexto = createContext<ContextoDados | null>(null);

export function DadosProvider({ children }: { children: React.ReactNode }) {
  const [conexao, setConexao] = useState<Conexao | null>(null);
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  // Impede que dois componentes disparem o mesmo GET ao montar.
  const buscaEmAndamento = useRef<Promise<void> | null>(null);

  const modoDemonstracao = conexao === null;

  const buscar = useCallback(async (usando: Conexao | null) => {
    if (!usando) {
      setDados(dadosDemonstracao());
      setErro('');
      return;
    }

    setCarregando(true);
    setErro('');
    try {
      setDados(await api.buscarTudo(usando));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar os dados.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // Primeira carga: lê a conexão salva e busca o que houver.
  useEffect(() => {
    const salva = lerConexao();
    setConexao(salva);
    setPronto(true);
    buscar(salva);
  }, [buscar]);

  const recarregar = useCallback(async () => {
    if (buscaEmAndamento.current) return buscaEmAndamento.current;

    const promessa = buscar(conexao).finally(() => {
      buscaEmAndamento.current = null;
    });
    buscaEmAndamento.current = promessa;
    return promessa;
  }, [buscar, conexao]);

  const conectar = useCallback(async (nova: Conexao) => {
    // Só guarda depois de confirmar que a planilha responde.
    setCarregando(true);
    setErro('');
    try {
      const recebidos = await api.buscarTudo(nova);
      salvarConexao(nova);
      setConexao(nova);
      setDados(recebidos);
    } finally {
      setCarregando(false);
    }
  }, []);

  const desconectar = useCallback(() => {
    apagarConexao();
    setConexao(null);
    setDados(dadosDemonstracao());
    setErro('');
  }, []);

  function exigirConexao(): Conexao {
    if (!conexao) {
      throw new Error('Conecte uma planilha antes de salvar. Os dados da demonstração não são gravados.');
    }
    return conexao;
  }

  // ---------- Escritas ----------

  const criarGasto = useCallback(async (entrada: GastoEntrada) => {
    const registro = await api.criarGasto(exigirConexao(), entrada);
    setDados((atual) => atual && { ...atual, gastos: [...atual.gastos, registro] });
    return registro;
  }, [conexao]);

  const criarGastos = useCallback(async (lista: GastoEntrada[]) => {
    const registros = await api.criarGastos(exigirConexao(), lista);
    setDados((atual) => atual && { ...atual, gastos: [...atual.gastos, ...registros] });
    return registros;
  }, [conexao]);

  const atualizarGasto = useCallback(async (id: string, entrada: GastoEntrada) => {
    const registro = await api.atualizarGasto(exigirConexao(), id, entrada);
    setDados((atual) => atual && {
      ...atual,
      gastos: atual.gastos.map((g) => (g.id === id ? registro : g)),
    });
    return registro;
  }, [conexao]);

  const excluirGasto = useCallback(async (id: string) => {
    await api.excluirGasto(exigirConexao(), id);
    setDados((atual) => atual && { ...atual, gastos: atual.gastos.filter((g) => g.id !== id) });
  }, [conexao]);

  const criarInvestimento = useCallback(async (entrada: InvestimentoEntrada) => {
    const registro = await api.criarInvestimento(exigirConexao(), entrada);
    setDados((atual) => atual && { ...atual, investimentos: [...atual.investimentos, registro] });
    return registro;
  }, [conexao]);

  const atualizarInvestimento = useCallback(async (id: string, entrada: InvestimentoEntrada) => {
    const registro = await api.atualizarInvestimento(exigirConexao(), id, entrada);
    setDados((atual) => atual && {
      ...atual,
      investimentos: atual.investimentos.map((i) => (i.id === id ? registro : i)),
    });
    return registro;
  }, [conexao]);

  const excluirInvestimento = useCallback(async (id: string) => {
    await api.excluirInvestimento(exigirConexao(), id);
    setDados((atual) => atual && {
      ...atual,
      investimentos: atual.investimentos.filter((i) => i.id !== id),
    });
  }, [conexao]);

  const salvarMeta = useCallback(async (meta: Meta) => {
    const registro = await api.salvarMeta(exigirConexao(), meta);
    setDados((atual) => {
      if (!atual) return atual;
      const existe = atual.metas.some((m) => m.categoria === registro.categoria);
      return {
        ...atual,
        metas: existe
          ? atual.metas.map((m) => (m.categoria === registro.categoria ? registro : m))
          : [...atual.metas, registro],
      };
    });
  }, [conexao]);

  return (
    <Contexto.Provider
      value={{
        dados, carregando, erro, modoDemonstracao, conexao, pronto,
        recarregar, conectar, desconectar,
        criarGasto, criarGastos, atualizarGasto, excluirGasto,
        criarInvestimento, atualizarInvestimento, excluirInvestimento,
        salvarMeta,
      }}
    >
      {/* Barra fina de carregamento, no topo de qualquer tela */}
      {carregando && (
        <div className="fixed top-0 inset-x-0 h-0.5 z-50 bg-blue-400 animate-pulse" />
      )}
      {children}
    </Contexto.Provider>
  );
}

export function useDados() {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error('useDados precisa estar dentro de <DadosProvider>.');
  }
  return contexto;
}