'use client';

import { Fragment, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';
import {
  AlertCircle, BarChart3, Calendar, ChevronDown, ChevronRight, FileText,
  Loader2, Pencil, RefreshCw, Save, Table, Trash2, X,
} from 'lucide-react';
import { useDados } from '../../components/DadosContext';
import { useValores } from '../../components/ValoresContext';
import FiltroMultiplo from '../../components/FiltroMultiplo';
import SeletorComOutro from '../../components/SeletorComOutro';
import { criarAgrupador, mesesDePlanejamento } from '../../lib/calculos';
import { formatarData, formatarMoeda, mesDe, normalizarData, paraNumero, rotuloMes, valorValido } from '../../lib/formato';
import type { Gasto } from '../../lib/tipos';

const CORES_PIZZA = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C', '#818CF8', '#C084FC'];

interface FormEdicao {
  data: string;
  categoria: string;
  subcategoria: string;
  motivo: string;
  valor: string;
  descricao: string;
}

/** Valores exatos usados nos dados, somados à lista — sem repetir grafias idênticas. */
function unir(lista: string[], usados: string[]): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];
  [...lista, ...usados].forEach((v) => {
    const t = (v || '').trim();
    if (t && !vistos.has(t)) {
      vistos.add(t);
      resultado.push(t);
    }
  });
  return resultado;
}

export default function ResumoPage() {
  const { dados, carregando, erro, modoDemonstracao, recarregar, atualizarGasto, excluirGasto } = useDados();
  const { mascarar } = useValores();

  const gastos = useMemo(() => dados?.gastos || [], [dados]);
  const metas = useMemo(() => dados?.metas || [], [dados]);
  const listas = dados?.listas || { categorias: [], subcategorias: [], motivos: [] };

  const [visao, setVisao] = useState<'tabela' | 'graficos'>('tabela');

  // ---------- ano ----------

  const anoAtual = new Date().getFullYear();

  const anosComGasto = useMemo(() => {
    const anos = new Set<number>();
    gastos.forEach((g) => {
      const a = Number((g.data || '').slice(0, 4));
      if (a) anos.add(a);
    });
    return anos;
  }, [gastos]);

  const anosOpcoes = useMemo(
    () => Array.from(new Set([anoAtual, ...anosComGasto])).sort((a, b) => b - a),
    [anoAtual, anosComGasto]
  );

  // Abre no ano corrente; se ele ainda não tiver gasto, no ano mais recente que tenha.
  const anoPadrao = anosComGasto.has(anoAtual)
    ? anoAtual
    : Array.from(anosComGasto).sort((a, b) => b - a)[0] ?? anoAtual;

  const [anoEscolhido, setAnoEscolhido] = useState<number | null>(null);
  const ano = anoEscolhido ?? anoPadrao;

  const gastosDoAno = useMemo(
    () => gastos.filter((g) => (g.data || '').startsWith(`${ano}-`)),
    [gastos, ano]
  );

  // ---------- agrupadores (ignoram acento e maiúscula) ----------

  const agCategoria = useMemo(
    () => criarAgrupador([...gastosDoAno.map((g) => g.categoria), ...metas.map((m) => m.categoria)], listas.categorias),
    [gastosDoAno, metas, listas.categorias]
  );
  const agSub = useMemo(
    () => criarAgrupador(gastosDoAno.map((g) => g.subcategoria), listas.subcategorias),
    [gastosDoAno, listas.subcategorias]
  );
  const agMotivo = useMemo(
    () => criarAgrupador(gastosDoAno.map((g) => g.motivo), listas.motivos),
    [gastosDoAno, listas.motivos]
  );

  // ---------- filtros da tabela (opções vêm dos dados do ano) ----------

  const [filtroMes, setFiltroMes] = useState<string[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string[]>([]);
  const [filtroSub, setFiltroSub] = useState<string[]>([]);
  const [filtroMotivo, setFiltroMotivo] = useState<string[]>([]);

  const opcoesMes = useMemo(
    () => Array.from(new Set(gastosDoAno.map((g) => mesDe(g.data)).filter(Boolean)))
      .sort()
      .map((m) => ({ valor: m, rotulo: rotuloMes(m) })),
    [gastosDoAno]
  );

  const opcoesDe = (ag: typeof agCategoria, campo: 'categoria' | 'subcategoria' | 'motivo') => {
    const presentes = new Set(gastosDoAno.map((g) => ag.rotuloDe(g[campo])).filter(Boolean));
    return ag.rotulos.filter((r) => presentes.has(r)).map((r) => ({ valor: r, rotulo: r }));
  };

  const opcoesCategoria = useMemo(() => opcoesDe(agCategoria, 'categoria'), [agCategoria, gastosDoAno]);
  const opcoesSub = useMemo(() => opcoesDe(agSub, 'subcategoria'), [agSub, gastosDoAno]);
  const opcoesMotivo = useMemo(() => opcoesDe(agMotivo, 'motivo'), [agMotivo, gastosDoAno]);

  const filtrosAtivos = filtroMes.length + filtroCategoria.length + filtroSub.length + filtroMotivo.length;

  // OU dentro de cada filtro, E entre filtros. Mais recentes primeiro.
  const filtrados = useMemo(
    () => gastosDoAno
      .filter((g) =>
        (filtroMes.length === 0 || filtroMes.includes(mesDe(g.data))) &&
        (filtroCategoria.length === 0 || filtroCategoria.includes(agCategoria.rotuloDe(g.categoria))) &&
        (filtroSub.length === 0 || filtroSub.includes(agSub.rotuloDe(g.subcategoria))) &&
        (filtroMotivo.length === 0 || filtroMotivo.includes(agMotivo.rotuloDe(g.motivo)))
      )
      .sort((a, b) =>
        (b.data || '').localeCompare(a.data || '') || (b.criado_em || '').localeCompare(a.criado_em || '')
      ),
    [gastosDoAno, filtroMes, filtroCategoria, filtroSub, filtroMotivo, agCategoria, agSub, agMotivo]
  );

  const totalFiltrado = useMemo(() => filtrados.reduce((s, g) => s + (Number(g.valor) || 0), 0), [filtrados]);

  // ---------- linha aberta, edição e exclusão ----------

  const [aberta, setAberta] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<FormEdicao | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erroLinha, setErroLinha] = useState('');

  const fecharLinha = () => {
    setAberta(null);
    setEditando(null);
    setForm(null);
    setConfirmandoExclusao(null);
    setErroLinha('');
  };

  const trocarAno = (novo: number) => {
    setAnoEscolhido(novo);
    setFiltroMes([]);
    setFiltroCategoria([]);
    setFiltroSub([]);
    setFiltroMotivo([]);
    setPeriodoGrafico('');
    fecharLinha();
  };

  const limparFiltros = () => {
    setFiltroMes([]);
    setFiltroCategoria([]);
    setFiltroSub([]);
    setFiltroMotivo([]);
    fecharLinha();
  };

  const comFechamento = (setter: (v: string[]) => void) => (v: string[]) => {
    fecharLinha();
    setter(v);
  };

  const opcoesEdicao = useMemo(() => ({
    categorias: unir(listas.categorias, gastos.map((g) => g.categoria)),
    subcategorias: unir(listas.subcategorias, gastos.map((g) => g.subcategoria)),
    motivos: unir(listas.motivos, gastos.map((g) => g.motivo)),
  }), [listas, gastos]);

  const iniciarEdicao = (g: Gasto) => {
    setEditando(g.id);
    setConfirmandoExclusao(null);
    setErroLinha('');
    setForm({
      data: g.data || '',
      categoria: (g.categoria || '').trim(),
      subcategoria: (g.subcategoria || '').trim(),
      motivo: (g.motivo || '').trim(),
      valor: (Number(g.valor) || 0).toFixed(2).replace('.', ','),
      descricao: g.descricao || '',
    });
  };

  const salvarEdicao = async (id: string) => {
    if (!form) return;

    if (!normalizarData(form.data)) return setErroLinha('Informe uma data válida.');
    if (!valorValido(form.valor)) return setErroLinha('Valor inválido. Use, por exemplo, 1.234,56.');
    if (!form.categoria.trim()) return setErroLinha('Informe a categoria.');

    setOcupado(true);
    setErroLinha('');
    try {
      await atualizarGasto(id, {
        data: normalizarData(form.data),
        categoria: form.categoria.trim(),
        subcategoria: form.subcategoria.trim(),
        motivo: form.motivo.trim(),
        valor: paraNumero(form.valor),
        descricao: form.descricao.trim(),
      });
      setEditando(null);
      setForm(null);
    } catch (e) {
      setErroLinha(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setOcupado(false);
    }
  };

  const excluir = async (id: string) => {
    setOcupado(true);
    setErroLinha('');
    try {
      await excluirGasto(id);
      fecharLinha();
    } catch (e) {
      setErroLinha(e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      setOcupado(false);
    }
  };

  // ---------- gráficos ----------

  const [periodoGrafico, setPeriodoGrafico] = useState(''); // '' = ano todo; senão AAAA-MM

  const gastosGrafico = useMemo(
    () => (periodoGrafico ? gastosDoAno.filter((g) => mesDe(g.data) === periodoGrafico) : gastosDoAno),
    [gastosDoAno, periodoGrafico]
  );

  const fatorMeta = mesesDePlanejamento(ano, periodoGrafico || null);

  const metaPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    metas.forEach((m) => {
      const r = agCategoria.rotuloDe(m.categoria);
      if (r) mapa.set(r, (mapa.get(r) || 0) + (Number(m.valor_mensal) || 0));
    });
    return mapa;
  }, [metas, agCategoria]);

  const realizadoPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    gastosGrafico.forEach((g) => {
      const r = agCategoria.rotuloDe(g.categoria);
      if (r) mapa.set(r, (mapa.get(r) || 0) + (Number(g.valor) || 0));
    });
    return mapa;
  }, [gastosGrafico, agCategoria]);

  // Categorias com gasto no período OU com meta: meta sem gasto também aparece.
  const dadosCategorias = useMemo(
    () => agCategoria.rotulos
      .filter((r) => realizadoPorCategoria.has(r) || (metaPorCategoria.get(r) || 0) > 0)
      .map((r) => ({
        categoria: r,
        Realizado: Number((realizadoPorCategoria.get(r) || 0).toFixed(2)),
        Planejado: Number(((metaPorCategoria.get(r) || 0) * fatorMeta).toFixed(2)),
      })),
    [agCategoria, realizadoPorCategoria, metaPorCategoria, fatorMeta]
  );

  const dadosSub = useMemo(() => {
    const mapa = new Map<string, number>();
    gastosGrafico.forEach((g) => {
      const r = agSub.rotuloDe(g.subcategoria);
      if (r) mapa.set(r, (mapa.get(r) || 0) + (Number(g.valor) || 0));
    });
    return agSub.rotulos
      .filter((r) => (mapa.get(r) || 0) > 0)
      .map((r) => ({ subcategoria: r, Total: Number((mapa.get(r) || 0).toFixed(2)) }));
  }, [gastosGrafico, agSub]);

  const pizzas = useMemo(
    () => agCategoria.rotulos
      .filter((cat) => (realizadoPorCategoria.get(cat) || 0) > 0)
      .map((cat) => {
        const mapa = new Map<string, number>();
        gastosGrafico
          .filter((g) => agCategoria.rotuloDe(g.categoria) === cat)
          .forEach((g) => {
            const sub = agSub.rotuloDe(g.subcategoria) || 'Sem sub-categoria';
            mapa.set(sub, (mapa.get(sub) || 0) + (Number(g.valor) || 0));
          });
        const fatias = Array.from(mapa.entries())
          .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
          .filter((f) => f.value > 0);
        return { categoria: cat, total: fatias.reduce((s, f) => s + f.value, 0), fatias };
      }),
    [agCategoria, agSub, realizadoPorCategoria, gastosGrafico]
  );

  const rotuloPeriodo = periodoGrafico
    ? rotuloMes(periodoGrafico)
    : ano === anoAtual ? `${ano} até agora` : `${ano}`;

  // ---------- estilos ----------

  const classeCampo = 'w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500';
  const classeRotulo = 'block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5';
  const estiloTooltip = { backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF', borderRadius: '0.5rem' };
  const formatarTooltip = (v: unknown, nome: unknown) => [formatarMoeda(Number(v)), String(nome)] as [string, string];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-blue-400 tracking-wide">Consulta e relatórios</h1>
            {modoDemonstracao && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-amber-900/30 border border-amber-500/40 text-amber-300">
                Demonstração
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={ano}
              onChange={(e) => trocarAno(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
            >
              {anosOpcoes.map((a) => (
                <option className="bg-gray-800" key={a} value={a}>{a}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => recarregar()}
              disabled={carregando}
              title="Buscar de novo na planilha"
              className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-blue-300 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {erro && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        )}

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setVisao('tabela')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${visao === 'tabela' ? 'bg-blue-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
          >
            <Table className="w-4 h-4" />
            Tabela
          </button>
          <button
            type="button"
            onClick={() => setVisao('graficos')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${visao === 'graficos' ? 'bg-blue-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Gráficos e planejado
          </button>
        </div>

        {gastosDoAno.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-12">
            {carregando ? 'Carregando...' : `Nenhum gasto lançado em ${ano}.`}
          </p>
        )}

        {/* ================= TABELA ================= */}
        {visao === 'tabela' && gastosDoAno.length > 0 && (
          <div className="space-y-4">
            <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Filtros</span>
                <button
                  type="button"
                  onClick={limparFiltros}
                  disabled={filtrosAtivos === 0}
                  className="text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 disabled:opacity-30"
                >
                  Limpar tudo
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FiltroMultiplo rotulo="Todos os meses" opcoes={opcoesMes} selecionados={filtroMes} onChange={comFechamento(setFiltroMes)} />
                <FiltroMultiplo rotulo="Todas as categorias" opcoes={opcoesCategoria} selecionados={filtroCategoria} onChange={comFechamento(setFiltroCategoria)} />
                <FiltroMultiplo rotulo="Todas as sub-categorias" opcoes={opcoesSub} selecionados={filtroSub} onChange={comFechamento(setFiltroSub)} />
                <FiltroMultiplo rotulo="Todos os motivos" opcoes={opcoesMotivo} selecionados={filtroMotivo} onChange={comFechamento(setFiltroMotivo)} />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-700/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {filtrados.length} registro(s)
                </p>
                <span className="bg-blue-900/30 border border-blue-500/40 text-blue-300 font-bold px-4 py-1.5 rounded-lg text-xs">
                  Total: {mascarar(formatarMoeda(totalFiltrado))}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto bg-gray-800 border border-gray-700/50 rounded-2xl shadow-xl">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-700/80 text-blue-400 text-xs font-bold uppercase tracking-wider">
                    <th className="p-3">Data</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Sub-categoria</th>
                    <th className="p-3">Motivo</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((g) => {
                    const estaAberta = aberta === g.id;
                    const emEdicao = editando === g.id && form !== null;

                    return (
                      <Fragment key={g.id}>
                        <tr
                          onClick={() => {
                            if (ocupado || emEdicao) return;
                            if (estaAberta) fecharLinha();
                            else { fecharLinha(); setAberta(g.id); }
                          }}
                          className={`border-b border-gray-700/40 cursor-pointer transition-colors hover:bg-gray-700/20 ${estaAberta ? 'bg-gray-700/20' : ''}`}
                        >
                          <td className="p-3 text-sm text-gray-300">
                            <span className="flex items-center gap-2">
                              {estaAberta
                                ? <ChevronDown className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                : <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                              {formatarData(g.data)}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-gray-300">{g.categoria}</td>
                          <td className="p-3 text-sm text-gray-300">{g.subcategoria}</td>
                          <td className="p-3 text-sm text-gray-300">{g.motivo}</td>
                          <td className="p-3 text-sm font-semibold text-red-300 text-right whitespace-nowrap">
                            {mascarar(formatarMoeda(Number(g.valor)))}
                          </td>
                        </tr>

                        {estaAberta && (
                          <tr className="border-b border-gray-700/40 bg-gray-900/50">
                            <td colSpan={5} className="px-5 py-4">

                              {!emEdicao && (
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                      <p className={classeRotulo}>Descrição</p>
                                      {g.descricao
                                        ? <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{g.descricao}</p>
                                        : <p className="text-sm text-gray-500 italic">Sem descrição.</p>}
                                    </div>
                                  </div>

                                  {modoDemonstracao ? (
                                    <p className="text-xs text-gray-500">Conecte uma planilha para editar.</p>
                                  ) : confirmandoExclusao === g.id ? (
                                    <div className="flex flex-col items-start md:items-end gap-2 flex-shrink-0">
                                      <p className="text-xs text-red-300 font-semibold">Excluir este gasto? Não dá para desfazer.</p>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => excluir(g.id)}
                                          disabled={ocupado}
                                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                                        >
                                          {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                          Sim, excluir
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmandoExclusao(null)}
                                          disabled={ocupado}
                                          className="px-4 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider border border-gray-600"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2 flex-shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => iniciarEdicao(g)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 text-xs font-bold uppercase tracking-wider border border-gray-600"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Editar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setErroLinha(''); setConfirmandoExclusao(g.id); }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs font-bold uppercase tracking-wider border border-red-500/40"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Excluir
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {emEdicao && form && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                      <label className={classeRotulo}>Data</label>
                                      <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={classeCampo} />
                                    </div>
                                    <div>
                                      <label className={classeRotulo}>Valor (R$)</label>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.valor}
                                        onChange={(e) => setForm({ ...form, valor: e.target.value })}
                                        className={classeCampo}
                                      />
                                    </div>
                                    <div>
                                      <label className={classeRotulo}>Categoria</label>
                                      <SeletorComOutro
                                        key={`cat-${g.id}`}
                                        opcoes={opcoesEdicao.categorias}
                                        valor={form.categoria}
                                        onChange={(v) => setForm({ ...form, categoria: v })}
                                      />
                                    </div>
                                    <div>
                                      <label className={classeRotulo}>Sub-categoria</label>
                                      <SeletorComOutro
                                        key={`sub-${g.id}`}
                                        opcoes={opcoesEdicao.subcategorias}
                                        valor={form.subcategoria}
                                        placeholder="(nenhuma)"
                                        onChange={(v) => setForm({ ...form, subcategoria: v })}
                                      />
                                    </div>
                                    <div>
                                      <label className={classeRotulo}>Motivo</label>
                                      <SeletorComOutro
                                        key={`mot-${g.id}`}
                                        opcoes={opcoesEdicao.motivos}
                                        valor={form.motivo}
                                        placeholder="(nenhum)"
                                        onChange={(v) => setForm({ ...form, motivo: v })}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className={classeRotulo}>Descrição (opcional)</label>
                                    <textarea
                                      value={form.descricao}
                                      onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                      rows={2}
                                      className={`${classeCampo} resize-y`}
                                    />
                                  </div>

                                  <div className="flex gap-3">
                                    <button
                                      type="button"
                                      onClick={() => salvarEdicao(g.id)}
                                      disabled={ocupado}
                                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                                    >
                                      {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                      Salvar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setEditando(null); setForm(null); setErroLinha(''); }}
                                      disabled={ocupado}
                                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider border border-gray-600"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}

                              {erroLinha && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-xs">
                                  <span className="flex items-start gap-2 flex-1">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {erroLinha}
                                  </span>
                                  {erroLinha.toLowerCase().includes('recarregue') && (
                                    <button
                                      type="button"
                                      onClick={() => { fecharLinha(); recarregar(); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 font-bold"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      Recarregar dados
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>

              {filtrados.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-8">Nenhum gasto corresponde aos filtros.</p>
              )}
            </div>
          </div>
        )}

        {/* ================= GRÁFICOS ================= */}
        {visao === 'graficos' && gastosDoAno.length > 0 && (
          <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Período dos gráficos</span>
              <div className="relative w-full md:w-64">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={periodoGrafico}
                  onChange={(e) => setPeriodoGrafico(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-sm text-gray-200 outline-none focus:border-blue-500 appearance-none"
                >
                  <option className="bg-gray-900" value="">Ano todo ({ano})</option>
                  {opcoesMes.map((m) => (
                    <option className="bg-gray-900" key={m.valor} value={m.valor}>{m.rotulo}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 md:p-8 shadow-xl">
              <h2 className="text-base font-bold text-center text-gray-200 mb-1">Realizado vs planejado por categoria</h2>
              <p className="text-xs text-center text-gray-500 mb-6">
                {rotuloPeriodo} · planejado = meta mensal × {fatorMeta} {fatorMeta === 1 ? 'mês' : 'meses'}
              </p>
              <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosCategorias}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="categoria" stroke="#9CA3AF" interval={0} angle={-15} textAnchor="end" height={60} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={formatarTooltip} contentStyle={estiloTooltip} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Realizado" fill="#10B981" radius={[4, 4, 0, 0]}>
                      {dadosCategorias.map((d, i) => (
                        <Cell key={i} fill={d.Planejado > 0 && d.Realizado > d.Planejado ? '#EF4444' : '#10B981'} />
                      ))}
                    </Bar>
                    <Bar dataKey="Planejado" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {metas.length === 0 && (
                <p className="text-xs text-center text-gray-500 mt-4">
                  Nenhuma meta definida. Preencha a aba Metas da planilha para ver o planejado.
                </p>
              )}
            </div>

            <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 md:p-8 shadow-xl">
              <h2 className="text-base font-bold text-center text-gray-200 mb-6">Total por sub-categoria · {rotuloPeriodo}</h2>
              {dadosSub.length === 0 ? (
                <p className="text-sm text-center text-gray-500 py-8">Nenhum gasto com sub-categoria no período.</p>
              ) : (
                <div className="w-full h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosSub}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="subcategoria" stroke="#9CA3AF" interval={0} angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={formatarTooltip} contentStyle={estiloTooltip} />
                      <Bar dataKey="Total" fill="#818CF8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {pizzas.length > 0 && (
              <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 md:p-8 shadow-xl">
                <h2 className="text-base font-bold text-center text-gray-200 mb-1">Dentro de cada categoria</h2>
                <p className="text-xs text-center text-gray-500 mb-8">{rotuloPeriodo} · divisão por sub-categoria</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pizzas.map((pizza) => (
                    <div key={pizza.categoria} className="bg-gray-900/50 p-5 rounded-2xl border border-gray-700/50 flex flex-col items-center">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-1 text-center">{pizza.categoria}</h3>
                      <p className="text-sm font-semibold text-emerald-400 mb-4">{mascarar(formatarMoeda(pizza.total))}</p>
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pizza.fatias}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={75}
                              label={({ percent }) => `${(((percent as number) ?? 0) * 100).toFixed(0)}%`}
                            >
                              {pizza.fatias.map((_, i) => (
                                <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={formatarTooltip} contentStyle={estiloTooltip} />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
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
      </div>
    </div>
  );
}