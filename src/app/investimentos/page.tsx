'use client';

import { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { AlertCircle, CheckCircle, Loader2, Minus, Plus, SplitSquareHorizontal, Trash2, X } from 'lucide-react';
import { useDados } from '../../components/DadosContext';
import { useValores } from '../../components/ValoresContext';
import { evolucaoInvestimentos, saldoInvestimentos, dividirAporte } from '../../lib/calculos';
import { formatarData, formatarMoeda, hoje, paraNumero, rotuloMesCurto } from '../../lib/formato';
import type { Caixa, InvestimentoEntrada } from '../../lib/tipos';

export default function InvestimentosPage() {
  const { dados, carregando, erro, modoDemonstracao, criarInvestimento, excluirInvestimento } = useDados();
  const { mascarar } = useValores();

  const [formAberto, setFormAberto] = useState<'aporte' | 'resgate' | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [statusErro, setStatusErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  // Aporte
  const [data, setData] = useState(hoje());
  const [valor, setValor] = useState('');
  const [divisaoManual, setDivisaoManual] = useState(false);
  const [valorFuturo, setValorFuturo] = useState('');
  const [valorPessoal, setValorPessoal] = useState('');
  const [descricao, setDescricao] = useState('');

  // Resgate
  const [caixaResgate, setCaixaResgate] = useState<Caixa>('PESSOAL');

  const investimentos = dados?.investimentos || [];
  const percentualFuturo = Number(dados?.config?.percentual_futuro ?? 70);

  const saldo = useMemo(() => saldoInvestimentos(investimentos), [investimentos]);
  const evolucao = useMemo(
    () => evolucaoInvestimentos(investimentos).map((ponto) => ({ ...ponto, rotulo: rotuloMesCurto(ponto.mes) })),
    [investimentos]
  );

  const ultimos = useMemo(
    () => [...investimentos]
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .slice(0, 8),
    [investimentos]
  );

  const previsao = divisaoManual
    ? { futuro: paraNumero(valorFuturo), pessoal: paraNumero(valorPessoal) }
    : dividirAporte(paraNumero(valor), percentualFuturo);

  const limparFormulario = () => {
    setData(hoje());
    setValor('');
    setValorFuturo('');
    setValorPessoal('');
    setDescricao('');
    setDivisaoManual(false);
  };

  const fecharFormulario = () => {
    setFormAberto(null);
    setStatusErro('');
    limparFormulario();
  };

  const salvarAporte = async () => {
    const total = previsao.futuro + previsao.pessoal;
    if (total <= 0) {
      setStatusErro('Informe um valor maior que zero.');
      return;
    }

    setSalvando(true);
    setStatusErro('');
    setMensagem('');

    // Futuro e Pessoal são registros separados: um aporte pode gerar dois.
    const lancamentos: InvestimentoEntrada[] = [];
    if (previsao.futuro > 0) {
      lancamentos.push({ data, caixa: 'FUTURO', operacao: 'APORTE', valor: previsao.futuro, descricao });
    }
    if (previsao.pessoal > 0) {
      lancamentos.push({ data, caixa: 'PESSOAL', operacao: 'APORTE', valor: previsao.pessoal, descricao });
    }

    try {
      for (const lancamento of lancamentos) {
        await criarInvestimento(lancamento);
      }
      setMensagem(
        `Aporte registrado. Futuro: ${mascarar(formatarMoeda(previsao.futuro))} | Pessoal: ${mascarar(formatarMoeda(previsao.pessoal))}`
      );
      fecharFormulario();
    } catch (e) {
      setStatusErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarResgate = async () => {
    const numero = paraNumero(valor);
    if (numero <= 0) {
      setStatusErro('Informe um valor maior que zero.');
      return;
    }

    const disponivel = caixaResgate === 'FUTURO' ? saldo.futuro : saldo.pessoal;
    if (numero > disponivel) {
      setStatusErro(`O saldo de ${caixaResgate === 'FUTURO' ? 'Futuro' : 'Pessoal'} é menor que esse valor.`);
      return;
    }

    setSalvando(true);
    setStatusErro('');
    setMensagem('');

    try {
      await criarInvestimento({ data, caixa: caixaResgate, operacao: 'RESGATE', valor: numero, descricao });
      setMensagem(`Resgate de ${mascarar(formatarMoeda(numero))} registrado.`);
      fecharFormulario();
    } catch (e) {
      setStatusErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const apagar = async (id: string) => {
    setExcluindoId(id);
    setStatusErro('');
    try {
      await excluirInvestimento(id);
      setMensagem('Lançamento excluído.');
    } catch (e) {
      setStatusErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      setExcluindoId(null);
    }
  };

  const classeCampo =
    'w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500';
  const classeRotulo = 'block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-blue-400 tracking-wide">Investimentos</h1>
          {modoDemonstracao && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-amber-900/30 border border-amber-500/40 text-amber-300">
              Demonstração
            </span>
          )}
        </div>

        {erro && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        )}

        {/* PATRIMÔNIO */}
        <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 md:p-8 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 text-center mb-2">Patrimônio total</p>
          <p className="text-4xl md:text-5xl font-bold text-white text-center tracking-tight">
            {mascarar(formatarMoeda(saldo.total))}
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Futuro</p>
              <p className="text-xl font-bold text-emerald-400">{mascarar(formatarMoeda(saldo.futuro))}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Pessoal</p>
              <p className="text-xl font-bold text-amber-400">{mascarar(formatarMoeda(saldo.pessoal))}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              type="button"
              onClick={() => { setFormAberto(formAberto === 'aporte' ? null : 'aporte'); setStatusErro(''); }}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-xl text-sm"
            >
              <Plus className="w-4 h-4" />
              Novo aporte
            </button>
            <button
              type="button"
              onClick={() => { setFormAberto(formAberto === 'resgate' ? null : 'resgate'); setStatusErro(''); }}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-700/60 hover:bg-gray-700 text-gray-200 font-bold px-5 py-3 rounded-xl text-sm border border-gray-600"
            >
              <Minus className="w-4 h-4" />
              Resgatar
            </button>
          </div>

          {mensagem && !formAberto && (
            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-300 text-xs">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{mensagem}</span>
            </div>
          )}
        </div>

        {/* FORMULÁRIO */}
        {formAberto && (
          <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-400">
                {formAberto === 'aporte' ? 'Novo aporte' : 'Resgate'}
              </h2>
              <button type="button" onClick={fecharFormulario} className="text-gray-400 hover:text-gray-200" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={classeRotulo}>Data</label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={classeCampo} />
              </div>

              {formAberto === 'resgate' && (
                <div>
                  <label className={classeRotulo}>De onde sai</label>
                  <select
                    value={caixaResgate}
                    onChange={(e) => setCaixaResgate(e.target.value as Caixa)}
                    className={classeCampo}
                  >
                    <option className="bg-gray-900" value="FUTURO">Futuro</option>
                    <option className="bg-gray-900" value="PESSOAL">Pessoal</option>
                  </select>
                </div>
              )}

              {(formAberto === 'resgate' || !divisaoManual) && (
                <div>
                  <label className={classeRotulo}>Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                    className={classeCampo}
                  />
                </div>
              )}

              {formAberto === 'aporte' && divisaoManual && (
                <>
                  <div>
                    <label className={classeRotulo}>Futuro (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={valorFuturo}
                      onChange={(e) => setValorFuturo(e.target.value)}
                      placeholder="0,00"
                      className={classeCampo}
                    />
                  </div>
                  <div>
                    <label className={classeRotulo}>Pessoal (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={valorPessoal}
                      onChange={(e) => setValorPessoal(e.target.value)}
                      placeholder="0,00"
                      className={classeCampo}
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className={classeRotulo}>Descrição (opcional)</label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className={classeCampo}
              />
            </div>

            {formAberto === 'aporte' && (
              <p className="text-[11px] text-gray-500">
                {divisaoManual
                  ? <>Total do aporte: <span className="text-gray-300 font-semibold">{mascarar(formatarMoeda(previsao.futuro + previsao.pessoal))}</span></>
                  : <>Divisão {percentualFuturo}/{100 - percentualFuturo}: Futuro <span className="text-gray-300 font-semibold">{mascarar(formatarMoeda(previsao.futuro))}</span> e Pessoal <span className="text-gray-300 font-semibold">{mascarar(formatarMoeda(previsao.pessoal))}</span></>}
              </p>
            )}

            {statusErro && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{statusErro}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={formAberto === 'aporte' ? salvarAporte : salvarResgate}
                disabled={salvando}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>

              {formAberto === 'aporte' && (
                <button
                  type="button"
                  onClick={() => setDivisaoManual(!divisaoManual)}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                    divisaoManual
                      ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                      : 'bg-gray-900 border-gray-600 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <SplitSquareHorizontal className="w-4 h-4" />
                  {divisaoManual ? `Divisão ${percentualFuturo}/${100 - percentualFuturo}` : 'Dividir manual'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* EVOLUÇÃO */}
        <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-6 text-center">
            Evolução do patrimônio
          </h2>

          {evolucao.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">
              {carregando ? 'Carregando...' : 'Nenhum lançamento ainda.'}
            </p>
          ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="rotulo" stroke="#9CA3AF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any, nome: any) => [formatarMoeda(Number(v)), nome]}
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF', borderRadius: '0.5rem' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px' }} />
                  <Line type="monotone" dataKey="Total" stroke="#60A5FA" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Futuro" stroke="#34D399" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Pessoal" stroke="#FBBF24" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ÚLTIMOS LANÇAMENTOS */}
        {ultimos.length > 0 && (
          <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Últimos lançamentos</h2>

            <ul className="divide-y divide-gray-700/40">
              {ultimos.map((registro) => (
                <li key={registro.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200">
                      <span className={registro.operacao === 'RESGATE' ? 'text-red-300' : 'text-emerald-300'}>
                        {registro.operacao === 'RESGATE' ? '−' : '+'} {mascarar(formatarMoeda(Number(registro.valor)))}
                      </span>
                      <span className="text-gray-500"> · {registro.caixa === 'FUTURO' ? 'Futuro' : 'Pessoal'}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {formatarData(registro.data)}
                      {registro.descricao ? ` · ${registro.descricao}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => apagar(registro.id)}
                    disabled={excluindoId === registro.id || modoDemonstracao}
                    title={modoDemonstracao ? 'Conecte uma planilha para editar' : 'Excluir lançamento'}
                    className="text-gray-500 hover:text-red-400 disabled:opacity-30 flex-shrink-0"
                  >
                    {excluindoId === registro.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}