'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useValores } from '../../components/ValoresContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';
import { Table, BarChart3, Calendar, AlertCircle, ChevronDown, ChevronRight, Check, FileText, Pencil, Save, X, List, Trash2 } from 'lucide-react';

const CORES_PIZZA = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C', '#818CF8', '#C084FC'];

// ============================================================================
// FILTRO COM SELEÇÃO MÚLTIPLA (dropdown com checkbox)
// Array vazio = nenhum filtro aplicado (mostra tudo).
// ============================================================================
interface FiltroMultiploProps {
  rotulo: string;
  opcoes: string[];
  selecionados: string[];
  onChange: (novos: string[]) => void;
}

function FiltroMultiplo({ rotulo, opcoes, selecionados, onChange }: FiltroMultiploProps) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const handleClickFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };

    document.addEventListener('mousedown', handleClickFora);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [aberto]);

  const alternar = (opcao: string) => {
    if (selecionados.includes(opcao)) {
      onChange(selecionados.filter((s) => s !== opcao));
    } else {
      onChange([...selecionados, opcao]);
    }
  };

  const texto =
    selecionados.length === 0
      ? rotulo
      : selecionados.length === 1
        ? selecionados[0]
        : `${selecionados.length} selecionados`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 bg-gray-800 border rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${
          selecionados.length > 0
            ? 'border-blue-500/60 text-blue-300'
            : 'border-gray-700 text-gray-300 hover:border-gray-600'
        }`}
      >
        <span className="truncate text-left">{texto}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="absolute z-30 mt-2 w-full min-w-[12rem] bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-900/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{rotulo}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={selecionados.length === 0}
              className="text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 disabled:opacity-30"
            >
              Limpar
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {opcoes.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500">Nenhuma opção nos dados.</p>
            )}
            {opcoes.map((opcao) => {
              const marcado = selecionados.includes(opcao);
              return (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => alternar(opcao)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-gray-200 hover:bg-gray-700/60 transition-colors"
                >
                  <span
                    className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center ${
                      marcado ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                    }`}
                  >
                    {marcado && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="truncate">{opcao}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CAMPO DE EDIÇÃO: escolhe da lista de valores já usados ou digita um novo
// ============================================================================
interface CampoComOutroProps {
  rotulo: string;
  opcoes: string[];
  valor: string;
  onChange: (v: string) => void;
}

function CampoComOutro({ rotulo, opcoes, valor, onChange }: CampoComOutroProps) {
  const [livre, setLivre] = useState(valor.trim() !== '' && !opcoes.includes(valor));

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{rotulo}</label>

      {livre ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Digite o novo valor"
            className="flex-1 bg-gray-800 border border-blue-500/60 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => { setLivre(false); onChange(opcoes[0] || ''); }}
            title="Voltar para a lista"
            className="px-2.5 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 border border-gray-600"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <select
          value={valor}
          onChange={(e) => {
            if (e.target.value === '__OUTRO__') {
              setLivre(true);
              onChange('');
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
        >
          <option className="bg-gray-800 text-gray-200" value="">(vazio)</option>
          {opcoes.map((o) => (
            <option className="bg-gray-800 text-gray-200" key={o} value={o}>{o}</option>
          ))}
          <option className="bg-gray-800 text-blue-300" value="__OUTRO__">Outro…</option>
        </select>
      )}
    </div>
  );
}

export default function ResumoPage() {
  const { mascarar } = useValores();
  const [responsavel, setResponsavel] = useState('Davi');
  const [ano, setAno] = useState('26');
  const [dadosGastos, setDadosGastos] = useState<any[]>([]);
  const [dadosMetas, setDadosMetas] = useState<any[]>([]);
  const [visao, setVisao] = useState<'tabela' | 'graficos'>('tabela');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  const [filtroPeriodoGrafico, setFiltroPeriodoGrafico] = useState('TODOS');

  // Filtros da tabela: seleção múltipla. Vazio = sem filtro.
  const [filtroMes, setFiltroMes] = useState<string[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string[]>([]);
  const [filtroSubcategoria, setFiltroSubcategoria] = useState<string[]>([]);
  const [filtroMotivo, setFiltroMotivo] = useState<string[]>([]);

  // Linha da planilha que está aberta na tabela (campo "linha" do gasto).
  const [linhaExpandida, setLinhaExpandida] = useState<number | null>(null);

  // Edição de uma linha já lançada.
  const [editando, setEditando] = useState<number | null>(null);
  const [formEdicao, setFormEdicao] = useState<any>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState('');

  // Exclusão: linha aguardando confirmação e estado do envio.
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<number | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Responsável/ano que geraram os dados em tela (não os que estão nos selects).
  const [contextoCarregado, setContextoCarregado] = useState<{ responsavel: string; ano: string } | null>(null);

  const anosOpcoes = ['26', '27', '28', '29', '30'];
  const mesesOpcoes = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

  // ==========================================================================
  // NORMALIZADORES
  // Agrupam variantes de escrita (maiúscula, acento, sinônimo) num nome único.
  // São a base tanto dos filtros quanto dos gráficos.
  // ==========================================================================
  const normalizarCategoria = (cat: string) => {
    const c = (cat || '').trim().toLowerCase();
    if (!c) return '';
    if (c.includes('transporte')) return 'TRANSPORTE';
    if (c.includes('alimentação') || c.includes('alimentacao')) return 'ALIMENTAÇÃO';
    if (c.includes('cuidado') || c.includes('pessoal')) return 'CUIDADOS PESSOAIS';
    if (c.includes('atividade') || c.includes('fisica') || c.includes('física')) return 'ATIVIDADES FÍSICAS';
    if (c.includes('extra') || c.includes('futilidade')) return 'EXTRAS/FUTILIDADES';
    if (c.includes('lazer')) return 'LAZER';
    if (c.includes('imprevisto')) return 'IMPREVISTOS';
    if (c.includes('carro') || c.includes('parcelas')) return 'PARCELAS CARRO';
    return cat.trim().toUpperCase();
  };

  const normalizarSubcategoria = (sub: string) => {
    const s = (sub || '').trim().toLowerCase();
    if (!s) return '';
    if (s.includes('carro')) return 'Carro';
    if (s.includes('uber')) return 'Uber';
    if (s.includes('restaurante')) return 'Restaurante';
    if (s.includes('lanche')) return 'Lanche';
    if (s.includes('supermercado')) return 'Supermercado';
    if (s.includes('beleza')) return 'Beleza';
    if (s.includes('terapia')) return 'Terapia';
    if (s.includes('remedio') || s.includes('remédio')) return 'Remédio';
    if (s.includes('viagen') || s.includes('viagem')) return 'Viagens';
    if (s.includes('hobbie') || s.includes('hobbies')) return 'Hobbies';
    if (s.includes('evento')) return 'Eventos';
    if (s.includes('gym')) return 'Gym';
    if (s.includes('mimo')) return 'Mimos';
    if (s.includes('compra')) return 'Compras';
    if (s.includes('flock')) return 'Flock';
    if (s.includes('presente')) return 'Presentes';
    if (s.includes('whey')) return 'Whey';
    return sub.trim().charAt(0).toUpperCase() + sub.trim().slice(1).toLowerCase();
  };

  const normalizarMotivo = (mot: string) => (mot || '').trim().toUpperCase();
  const normalizarMes = (mes: string) => (mes || '').trim().toUpperCase();

  // ==========================================================================
  // ORDEM DE EXIBIÇÃO (apenas preferência visual — não limita o conteúdo)
  // Nomes conhecidos aparecem primeiro nesta ordem; os demais (inclusive
  // classificações antigas que não existem mais) entram depois, em ordem
  // alfabética.
  // ==========================================================================
  const ordemCategorias = [
    'TRANSPORTE', 'ALIMENTAÇÃO', 'CUIDADOS PESSOAIS',
    'ATIVIDADES FÍSICAS', 'EXTRAS/FUTILIDADES', 'LAZER', 'IMPREVISTOS'
  ];

  const ordemSubcategorias = [
    'Carro', 'Uber', 'Restaurante', 'Lanche', 'Supermercado',
    'Beleza', 'Terapia', 'Remédio', 'Viagens', 'Hobbies',
    'Eventos', 'Gym', 'Mimos', 'Compras', 'Flock', 'Presentes', 'Whey'
  ];

  const ordemMotivos = [
    'AMIGOS', 'TRABALHO', 'ONE', 'FAMILIA', 'GASOLINA',
    'CONSERTO', 'PESSOAL', 'NAMORO', 'PRESENTE', 'ESTACIONAMENTO'
  ];

  const ordenarPorPreferencia = (valores: string[], ordemPreferida: string[]) => {
    const conhecidos = ordemPreferida.filter((o) => valores.includes(o));
    const desconhecidos = valores
      .filter((v) => !ordemPreferida.includes(v))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [...conhecidos, ...desconhecidos];
  };

  // Extrai os valores distintos que realmente existem nos dados carregados.
  const derivarOpcoes = (
    dados: any[],
    campo: 'categoria' | 'subcategoria' | 'motivo',
    normalizador: (v: string) => string,
    ordemPreferida: string[]
  ) => {
    const encontrados = new Set<string>();
    dados.forEach((gasto) => {
      const valor = normalizador(gasto[campo] || '');
      if (valor) encontrados.add(valor);
    });
    return ordenarPorPreferencia(Array.from(encontrados), ordemPreferida);
  };

  const carregarDados = async () => {
    setCarregando(true);
    setMensagem('');
    try {
      // INJEÇÃO DA VARIÁVEL DE AMBIENTE PARA COMUNICAR COM O RENDER
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      const [resGastos, resMetas] = await Promise.all([
        fetch(`${API_URL}/api/gastos/${responsavel}/${ano}`),
        fetch(`${API_URL}/api/metas/${responsavel}/${ano}`)
      ]);

      const dataGastos = await resGastos.json();
      const dataMetas = await resMetas.json();

      if (resGastos.ok && resMetas.ok) {
        setDadosGastos(dataGastos.gastos || []);
        setDadosMetas(dataMetas.metas || []);
        setContextoCarregado({ responsavel, ano });
        cancelarEdicao();

        // Limpa filtros: as opções mudam conforme o ano/responsável carregado.
        setFiltroMes([]);
        setFiltroCategoria([]);
        setFiltroSubcategoria([]);
        setFiltroMotivo([]);
        setFiltroPeriodoGrafico('TODOS');
        setLinhaExpandida(null);

        if ((dataGastos.gastos || []).length === 0) {
          setMensagem(`Nenhum gasto encontrado para ${responsavel} em 20${ano}.`);
        }
      } else {
        setMensagem('Erro ao carregar dados da planilha.');
      }
    } catch {
      setMensagem('Erro de conexão com o back-end.');
    } finally {
      setCarregando(false);
    }
  };

  // Exibição: sempre "R$ 1.234,56", independentemente de como o texto está
  // gravado na planilha (algumas células têm o R$, outras não).
  const formatarMoeda = (val: string) => {
    const texto = (val ?? '').toString().trim();
    if (texto === '') return '';
    return parseValor(texto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseValor = (val: string) => {
    if (!val) return 0;
    const limpo = val.toString().replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  };

  // ==========================================================================
  // OPÇÕES DOS FILTROS — vindas dos dados, não de listas fixas
  // ==========================================================================
  const categoriaOpcoes = useMemo(
    () => derivarOpcoes(dadosGastos, 'categoria', normalizarCategoria, ordemCategorias),
    [dadosGastos]
  );

  const subcategoriaOpcoes = useMemo(
    () => derivarOpcoes(dadosGastos, 'subcategoria', normalizarSubcategoria, ordemSubcategorias),
    [dadosGastos]
  );

  const motivoOpcoes = useMemo(
    () => derivarOpcoes(dadosGastos, 'motivo', normalizarMotivo, ordemMotivos),
    [dadosGastos]
  );

  // Opções dos campos de edição: valores exatamente como estão na planilha
  // (não normalizados), para não reescrever a grafia de um gasto sem necessidade.
  const derivarOpcoesBrutas = (campo: 'categoria' | 'subcategoria' | 'motivo') => {
    const encontrados = new Set<string>();
    dadosGastos.forEach((gasto) => {
      const valor = (gasto[campo] || '').toString().trim();
      if (valor) encontrados.add(valor);
    });
    return Array.from(encontrados).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  };

  const categoriasBrutas = useMemo(() => derivarOpcoesBrutas('categoria'), [dadosGastos]);
  const subcategoriasBrutas = useMemo(() => derivarOpcoesBrutas('subcategoria'), [dadosGastos]);
  const motivosBrutos = useMemo(() => derivarOpcoesBrutas('motivo'), [dadosGastos]);

  const cancelarEdicao = () => {
    setEditando(null);
    setFormEdicao(null);
    setErroEdicao('');
    setConfirmandoExclusao(null);
  };

  const excluirGasto = async (gasto: any) => {
    if (!contextoCarregado) return;

    setExcluindo(true);
    setErroEdicao('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      const res = await fetch(`${API_URL}/api/gasto`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responsavel: contextoCarregado.responsavel,
          ano: contextoCarregado.ano,
          linha: gasto.linha,
          original: {
            mes: gasto.mes || '',
            categoria: gasto.categoria || '',
            subcategoria: gasto.subcategoria || '',
            motivo: gasto.motivo || '',
            valor: gasto.valor || '',
            descricao: gasto.descricao || '',
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErroEdicao(data.error || 'Não foi possível excluir o gasto.');
        return;
      }

      // A linha some da planilha e tudo que estava abaixo sobe uma posição,
      // então os números de linha em memória precisam acompanhar.
      setDadosGastos((anteriores) =>
        anteriores
          .filter((g) => g.linha !== gasto.linha)
          .map((g) => (typeof g.linha === 'number' && g.linha > gasto.linha ? { ...g, linha: g.linha - 1 } : g))
      );

      setLinhaExpandida(null);
      cancelarEdicao();
    } catch {
      setErroEdicao('Erro de conexão com o back-end.');
    } finally {
      setExcluindo(false);
    }
  };

  const iniciarEdicao = (gasto: any) => {
    setEditando(gasto.linha);
    setErroEdicao('');
    setFormEdicao({
      mes: (gasto.mes || '').toString(),
      categoria: (gasto.categoria || '').toString(),
      subcategoria: (gasto.subcategoria || '').toString(),
      motivo: (gasto.motivo || '').toString(),
      valor: (gasto.valor || '').toString().replace('R$', '').trim(),
      descricao: (gasto.descricao || '').toString(),
    });
  };

  const salvarEdicao = async (gastoOriginal: any) => {
    if (!contextoCarregado || !formEdicao) return;

    setSalvandoEdicao(true);
    setErroEdicao('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      const res = await fetch(`${API_URL}/api/gasto`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responsavel: contextoCarregado.responsavel,
          ano: contextoCarregado.ano,
          linha: gastoOriginal.linha,
          original: {
            mes: gastoOriginal.mes || '',
            categoria: gastoOriginal.categoria || '',
            subcategoria: gastoOriginal.subcategoria || '',
            motivo: gastoOriginal.motivo || '',
            valor: gastoOriginal.valor || '',
            descricao: gastoOriginal.descricao || '',
          },
          novo: formEdicao,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErroEdicao(data.error || 'Não foi possível salvar a alteração.');
        return;
      }

      // Atualiza só a linha alterada, sem recarregar o ano inteiro.
      setDadosGastos((anteriores) =>
        anteriores.map((g) => (g.linha === gastoOriginal.linha ? { ...g, ...data.gasto } : g))
      );
      cancelarEdicao();
    } catch {
      setErroEdicao('Erro de conexão com o back-end.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const totalFiltrosAtivos =
    filtroMes.length + filtroCategoria.length + filtroSubcategoria.length + filtroMotivo.length;

  const limparTodosFiltros = () => {
    setLinhaExpandida(null);
    cancelarEdicao();
    setFiltroMes([]);
    setFiltroCategoria([]);
    setFiltroSubcategoria([]);
    setFiltroMotivo([]);
  };

  // OU dentro de cada campo, E entre campos.
  const dadosFiltradosTabela = useMemo(() => dadosGastos.filter((gasto) => {
    const matchMes = filtroMes.length === 0 || filtroMes.some((m) => normalizarMes(m) === normalizarMes(gasto.mes));
    const matchCat = filtroCategoria.length === 0 || filtroCategoria.includes(normalizarCategoria(gasto.categoria));
    const matchSub = filtroSubcategoria.length === 0 || filtroSubcategoria.includes(normalizarSubcategoria(gasto.subcategoria));
    const matchMot = filtroMotivo.length === 0 || filtroMotivo.includes(normalizarMotivo(gasto.motivo));
    return matchMes && matchCat && matchSub && matchMot;
  }), [dadosGastos, filtroMes, filtroCategoria, filtroSubcategoria, filtroMotivo]);

  const valorTotalFiltrado = useMemo(
    () => dadosFiltradosTabela.reduce((acc, gasto) => acc + parseValor(gasto.valor), 0),
    [dadosFiltradosTabela]
  );

  const dadosParaGraficos = useMemo(() => dadosGastos.filter((gasto) => {
    if (filtroPeriodoGrafico === 'TODOS') return true;
    return normalizarMes(gasto.mes) === normalizarMes(filtroPeriodoGrafico);
  }), [dadosGastos, filtroPeriodoGrafico]);

  const metasMap = useMemo(() => {
    const mapa: { [key: string]: number } = {};
    dadosMetas.forEach((linha) => {
      if (linha[0]) {
        const nomeCat = normalizarCategoria(linha[0]);
        if (nomeCat) mapa[nomeCat] = parseValor(linha[1]);
      }
    });
    return mapa;
  }, [dadosMetas]);

  const dadosCatMap = useMemo(() => dadosParaGraficos.reduce((acc: any, item: any) => {
    const catPadrao = normalizarCategoria(item.categoria || '');
    if (!catPadrao) return acc;
    if (!acc[catPadrao]) acc[catPadrao] = 0;
    acc[catPadrao] += parseValor(item.valor);
    return acc;
  }, {}), [dadosParaGraficos]);

  const fatorMultiplicador = filtroPeriodoGrafico === 'TODOS' ? 12 : 1;

  // Eixo do gráfico: categorias presentes nos dados do período
  // UNIÃO categorias que têm meta definida (para não sumir meta sem gasto).
  const dadosGraficoCategorias = useMemo(() => {
    const presentes = new Set<string>([
      ...Object.keys(dadosCatMap),
      ...Object.keys(metasMap),
    ]);
    return ordenarPorPreferencia(Array.from(presentes), ordemCategorias).map((cat) => ({
      categoria: cat,
      Realizado: Number((dadosCatMap[cat] || 0).toFixed(2)),
      Planejado: Number(((metasMap[cat] || 0) * fatorMultiplicador).toFixed(2)),
    }));
  }, [dadosCatMap, metasMap, fatorMultiplicador]);

  const dadosSubMap = useMemo(() => dadosParaGraficos.reduce((acc: any, item: any) => {
    const subPadrao = normalizarSubcategoria(item.subcategoria || '');
    if (!subPadrao) return acc;
    if (!acc[subPadrao]) acc[subPadrao] = 0;
    acc[subPadrao] += parseValor(item.valor);
    return acc;
  }, {}), [dadosParaGraficos]);

  const dadosGraficoSubcategorias = useMemo(
    () => ordenarPorPreferencia(Object.keys(dadosSubMap), ordemSubcategorias).map((sub) => ({
      subcategoria: sub,
      Total: Number((dadosSubMap[sub] || 0).toFixed(2)),
    })),
    [dadosSubMap]
  );

  // Pizzas: uma por categoria existente nos dados do período.
  const dadosPizzasPorCategoria = useMemo(() => {
    const categorias = ordenarPorPreferencia(Object.keys(dadosCatMap), ordemCategorias);

    return categorias.map((cat) => {
      const gastosDaCategoria = dadosParaGraficos.filter(
        (gasto) => normalizarCategoria(gasto.categoria || '') === cat
      );

      const subMapDaCategoria = gastosDaCategoria.reduce((acc: any, item: any) => {
        const sub = normalizarSubcategoria(item.subcategoria || '') || 'Outros';
        if (!acc[sub]) acc[sub] = 0;
        acc[sub] += parseValor(item.valor);
        return acc;
      }, {});

      const dataPizza = Object.keys(subMapDaCategoria)
        .map((sub) => ({
          name: sub,
          value: Number(subMapDaCategoria[sub].toFixed(2)),
        }))
        .filter((item) => item.value > 0);

      const totalDaCategoria = dataPizza.reduce((sum, item) => sum + item.value, 0);

      return {
        categoria: cat,
        total: totalDaCategoria,
        dados: dataPizza,
      };
    }).filter((pizza) => pizza.total > 0);
  }, [dadosCatMap, dadosParaGraficos]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/50">

        <h1 className="text-2xl font-bold mb-8 text-center text-blue-400 tracking-wide">
          Consulta de Gastos e Relatórios
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-8 bg-gray-900/40 p-5 rounded-xl border border-gray-700/50 shadow-inner">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Responsável</label>
            <select
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            >
              <option className="bg-gray-800 text-gray-200" value="Davi">Davi</option>
              <option className="bg-gray-800 text-gray-200" value="Stella">Stella</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Ano</label>
            <select
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            >
              {anosOpcoes.map((a) => (
                <option className="bg-gray-800 text-gray-200" key={a} value={a}>20{a}</option>
              ))}
            </select>
          </div>

          <button
            onClick={carregarDados}
            disabled={carregando}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 h-11 disabled:opacity-50"
          >
            {carregando ? 'Carregando...' : 'Carregar Dados do Ano'}
          </button>
        </div>

        {mensagem && (
          <div className="mb-6 p-4 rounded-xl font-medium text-sm border flex items-center gap-3 bg-yellow-900/20 border-yellow-500/30 text-yellow-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{mensagem}</span>
          </div>
        )}

        {dadosGastos.length > 0 && (
          <>
            <div className="flex justify-center gap-3 mb-8">
              <button
                onClick={() => setVisao('tabela')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${visao === 'tabela' ? 'bg-blue-500 text-white shadow-blue-900/20' : 'bg-gray-700/60 hover:bg-gray-700 text-gray-300'}`}
              >
                <Table className="w-4 h-4" />
                Tabela de Gastos
              </button>
              <button
                onClick={() => setVisao('graficos')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${visao === 'graficos' ? 'bg-blue-500 text-white shadow-blue-900/20' : 'bg-gray-700/60 hover:bg-gray-700 text-gray-300'}`}
              >
                <BarChart3 className="w-4 h-4" />
                Painel de Gráficos & Planejado
              </button>
            </div>

            {visao === 'tabela' && (
              <div className="space-y-4">

                {/* BARRA DE FILTROS (seleção múltipla) */}
                <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-700/50 shadow-inner space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Filtros</span>
                    <button
                      type="button"
                      onClick={limparTodosFiltros}
                      disabled={totalFiltrosAtivos === 0}
                      className="text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 disabled:opacity-30"
                    >
                      Limpar tudo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <FiltroMultiplo
                      rotulo="Todos os Meses"
                      opcoes={mesesOpcoes}
                      selecionados={filtroMes}
                      onChange={(v) => { setLinhaExpandida(null); cancelarEdicao(); setFiltroMes(v); }}
                    />
                    <FiltroMultiplo
                      rotulo="Todas as Categorias"
                      opcoes={categoriaOpcoes}
                      selecionados={filtroCategoria}
                      onChange={(v) => { setLinhaExpandida(null); cancelarEdicao(); setFiltroCategoria(v); }}
                    />
                    <FiltroMultiplo
                      rotulo="Todas as Sub-categorias"
                      opcoes={subcategoriaOpcoes}
                      selecionados={filtroSubcategoria}
                      onChange={(v) => { setLinhaExpandida(null); cancelarEdicao(); setFiltroSubcategoria(v); }}
                    />
                    <FiltroMultiplo
                      rotulo="Todos os Motivos"
                      opcoes={motivoOpcoes}
                      selecionados={filtroMotivo}
                      onChange={(v) => { setLinhaExpandida(null); cancelarEdicao(); setFiltroMotivo(v); }}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-700/50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      N° de registro(s): {dadosFiltradosTabela.length}.
                    </p>
                    <span className="bg-blue-900/30 border border-blue-500/40 text-blue-300 font-bold px-4 py-1.5 rounded-lg text-xs shadow-sm">
                      Total: {mascarar(valorTotalFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700/80 text-blue-400 text-xs font-bold uppercase tracking-wider">
                        <th className="p-3">Mês</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Sub-categoria</th>
                        <th className="p-3">Motivo</th>
                        <th className="p-3">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosFiltradosTabela.map((gasto, index) => {
                        const descricao = (gasto.descricao || '').trim();
                        const chaveLinha = typeof gasto.linha === 'number' ? gasto.linha : -index - 1;
                        const expandida = linhaExpandida === chaveLinha;
                        const emEdicao = editando === chaveLinha;
                        const podeEditar = typeof gasto.linha === 'number' && contextoCarregado !== null;

                        return (
                          <React.Fragment key={chaveLinha}>
                            <tr
                              onClick={() => {
                                if (emEdicao || excluindo) return;
                                setConfirmandoExclusao(null);
                                setErroEdicao('');
                                setLinhaExpandida(expandida ? null : chaveLinha);
                              }}
                              className={`border-b border-gray-700/40 transition-colors cursor-pointer hover:bg-gray-700/20 ${expandida ? 'bg-gray-700/20' : ''}`}
                              title="Clique para ver detalhes e editar"
                            >
                              <td className="p-3 text-sm text-gray-300">
                                <span className="flex items-center gap-2">
                                  {expandida
                                    ? <ChevronDown className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                    : <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                                  {gasto.mes}
                                </span>
                              </td>
                              <td className="p-3 text-sm text-gray-300">{gasto.categoria}</td>
                              <td className="p-3 text-sm text-gray-300">{gasto.subcategoria}</td>
                              <td className="p-3 text-sm text-gray-300">{gasto.motivo}</td>
                              <td className="p-3 text-sm font-semibold text-red-300">{mascarar(formatarMoeda(gasto.valor))}</td>
                            </tr>

                            {expandida && (
                              <tr className="border-b border-gray-700/40 bg-gray-900/50">
                                <td colSpan={5} className="px-6 py-4">

                                  {!emEdicao && (
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                      <div className="flex items-start gap-3">
                                        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Descrição</p>
                                          {descricao ? (
                                            <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{descricao}</p>
                                          ) : (
                                            <p className="text-sm text-gray-500 italic">Sem descrição.</p>
                                          )}
                                        </div>
                                      </div>

                                      {podeEditar && (
                                        <div className="flex flex-col items-start md:items-end gap-3 flex-shrink-0">
                                          {confirmandoExclusao !== chaveLinha ? (
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => iniciarEdicao(gasto)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 text-xs font-bold uppercase tracking-wider border border-gray-600"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Editar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => { setErroEdicao(''); setConfirmandoExclusao(chaveLinha); }}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs font-bold uppercase tracking-wider border border-red-500/40"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Excluir
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-start md:items-end gap-2">
                                              <p className="text-xs text-red-300 font-semibold">
                                                Excluir esta linha da planilha? Não dá para desfazer.
                                              </p>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => excluirGasto(gasto)}
                                                  disabled={excluindo}
                                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                  {excluindo ? 'Excluindo...' : 'Sim, excluir'}
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setConfirmandoExclusao(null)}
                                                  disabled={excluindo}
                                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider border border-gray-600 disabled:opacity-50"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                  Cancelar
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {erroEdicao && (
                                            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-xs max-w-md">
                                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                              <span>{erroEdicao}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {emEdicao && formEdicao && (
                                    <div className="space-y-4">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                                        Editando linha {gasto.linha} da planilha
                                      </p>

                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Mês</label>
                                          <select
                                            value={formEdicao.mes}
                                            onChange={(e) => setFormEdicao({ ...formEdicao, mes: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                                          >
                                            {!mesesOpcoes.includes(normalizarMes(formEdicao.mes)) && (
                                              <option className="bg-gray-800 text-gray-200" value={formEdicao.mes}>{formEdicao.mes || '(vazio)'}</option>
                                            )}
                                            {mesesOpcoes.map((m) => (
                                              <option className="bg-gray-800 text-gray-200" key={m} value={m}>{m}</option>
                                            ))}
                                          </select>
                                        </div>

                                        <CampoComOutro
                                          key={`cat-${chaveLinha}`}
                                          rotulo="Categoria"
                                          opcoes={categoriasBrutas}
                                          valor={formEdicao.categoria}
                                          onChange={(v) => setFormEdicao({ ...formEdicao, categoria: v })}
                                        />

                                        <CampoComOutro
                                          key={`sub-${chaveLinha}`}
                                          rotulo="Sub-categoria"
                                          opcoes={subcategoriasBrutas}
                                          valor={formEdicao.subcategoria}
                                          onChange={(v) => setFormEdicao({ ...formEdicao, subcategoria: v })}
                                        />

                                        <CampoComOutro
                                          key={`mot-${chaveLinha}`}
                                          rotulo="Motivo"
                                          opcoes={motivosBrutos}
                                          valor={formEdicao.motivo}
                                          onChange={(v) => setFormEdicao({ ...formEdicao, motivo: v })}
                                        />

                                        <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Valor (R$)</label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              value={formEdicao.valor}
                                              onChange={(e) => setFormEdicao({ ...formEdicao, valor: e.target.value })}
                                              placeholder="0,00"
                                              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Descrição (opcional)</label>
                                        <textarea
                                          value={formEdicao.descricao}
                                          onChange={(e) => setFormEdicao({ ...formEdicao, descricao: e.target.value })}
                                          rows={3}
                                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500 resize-y"
                                        />
                                      </div>

                                      {erroEdicao && (
                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-xs">
                                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                          <span>{erroEdicao}</span>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-3">
                                        <button
                                          type="button"
                                          onClick={() => salvarEdicao(gasto)}
                                          disabled={salvandoEdicao}
                                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                                        >
                                          <Save className="w-3.5 h-3.5" />
                                          {salvandoEdicao ? 'Salvando...' : 'Salvar'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={cancelarEdicao}
                                          disabled={salvandoEdicao}
                                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider border border-gray-600 disabled:opacity-50"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>

                  {dadosFiltradosTabela.length === 0 && (
                    <p className="text-center text-sm text-gray-500 py-8">
                      Nenhum gasto corresponde aos filtros selecionados.
                    </p>
                  )}
                </div>
              </div>
            )}

            {visao === 'graficos' && (
              <div className="space-y-8">
                <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Filtrar Período dos Gráficos:</span>
                  <div className="relative w-full md:w-64">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={filtroPeriodoGrafico}
                      onChange={(e) => setFiltroPeriodoGrafico(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-gray-200 text-sm outline-none focus:border-blue-500 w-full appearance-none"
                    >
                      <option className="bg-gray-800 text-gray-200" value="TODOS">Ano Todo (Acumulado)</option>
                      {mesesOpcoes.map((m) => (
                        <option className="bg-gray-800 text-gray-200" key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-gray-900/30 p-6 md:p-8 rounded-2xl border border-gray-700/50">
                  <h2 className="text-lg font-bold text-center mb-2 text-gray-200 tracking-wide">
                    Gastos por Categoria: Realizado vs Planejado ({filtroPeriodoGrafico === 'TODOS' ? 'Ano Todo' : filtroPeriodoGrafico})
                  </h2>
                  <p className="text-xs text-center text-gray-400 mb-6">Compara os gastos lançados com as metas definidas</p>

                  <div className="w-full h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGraficoCategorias}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="categoria" stroke="#9CA3AF" interval={0} angle={-15} textAnchor="end" height={60} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                        <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value: any, name: any) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, name]}
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF', borderRadius: '0.5rem' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

                        <Bar dataKey="Realizado" fill="#10B981" radius={[4, 4, 0, 0]}>
                          {dadosGraficoCategorias.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.Realizado > entry.Planejado ? '#EF4444' : '#10B981'}
                            />
                          ))}
                        </Bar>

                        <Bar dataKey="Planejado" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-900/30 p-6 md:p-8 rounded-2xl border border-gray-700/50">
                  <h2 className="text-lg font-bold text-center mb-6 text-gray-200 tracking-wide">
                    Gastos Totais por Sub-categoria ({filtroPeriodoGrafico === 'TODOS' ? 'Ano Todo' : filtroPeriodoGrafico})
                  </h2>
                  <div className="w-full h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGraficoSubcategorias}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="subcategoria" stroke="#9CA3AF" interval={0} angle={-45} textAnchor="end" height={80} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                        <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value: any, name: any) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, name]}
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF', borderRadius: '0.5rem' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="Total" fill="#818CF8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {dadosPizzasPorCategoria.length > 0 && (
                  <div className="bg-gray-900/30 p-6 md:p-8 rounded-2xl border border-gray-700/50">
                    <h2 className="text-lg font-bold text-center mb-2 text-gray-200 tracking-wide">
                      Distribuição Interna das Categorias ({filtroPeriodoGrafico === 'TODOS' ? 'Ano Todo' : filtroPeriodoGrafico})
                    </h2>
                    <p className="text-xs text-center text-gray-400 mb-8">Valor de cada categoria dividido entre suas sub-categorias</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dadosPizzasPorCategoria.map((pizza, index) => (
                        <div key={index} className="bg-gray-800/60 p-5 rounded-2xl border border-gray-700/50 flex flex-col items-center shadow-md">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-1">{pizza.categoria}</h3>
                          <p className="text-sm font-semibold text-emerald-400 mb-4">
                            Total: {mascarar(`R$ ${pizza.total.toFixed(2).replace('.', ',')}`)}
                          </p>

                          <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pizza.dados}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={75}
                                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                                >
                                  {pizza.dados.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={CORES_PIZZA[idx % CORES_PIZZA.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value: any, name: any) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, name]}
                                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF', borderRadius: '0.5rem' }}
                                />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }}/>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}