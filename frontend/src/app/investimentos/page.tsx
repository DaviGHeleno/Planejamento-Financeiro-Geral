'use client';

import { useState, useEffect } from 'react';
import { useValores } from '../../components/ValoresContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Plus, Minus, X, AlertCircle, CheckCircle, Loader2, SplitSquareHorizontal } from 'lucide-react';

export default function InvestimentosPage() {
  const { mascarar } = useValores();

  const [isAdicionando, setIsAdicionando] = useState(false);
  const [isResgatando, setIsResgatando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);
  const [totais, setTotais] = useState({
    daviFuturo: 'R$ 0,00',
    daviReserva: 'R$ 0,00',
    daviCasamento: 'R$ 0,00',
    daviPresente: 'R$ 0,00',
    stellaFuturo: 'R$ 0,00',
    stellaReserva: 'R$ 0,00',
    stellaCasamento: 'R$ 0,00',
    stellaPessoal: 'R$ 0,00',
    totalJuntos: 'R$ 0,00'
  });

  const [invAno, setInvAno] = useState(2026);
  const [invMes, setInvMes] = useState('MARÇO');
  const [invResponsavel, setInvResponsavel] = useState('Davi');
  const [invValor, setInvValor] = useState('');

  // Divisão manual: em vez de um valor total dividido 70/30, a tela mostra
  // dois campos e manda os valores exatos de Futuro e Pessoal.
  const [divisaoManual, setDivisaoManual] = useState(false);
  const [invFuturo, setInvFuturo] = useState('');
  const [invPessoal, setInvPessoal] = useState('');
  
  // Alterado para suportar estado de carregamento e erro
  const [invMensagem, setInvMensagem] = useState('');
  const [invStatus, setInvStatus] = useState<'sucesso' | 'erro' | 'carregando' | ''>('');

  const [resAno, setResAno] = useState(2026);
  const [resMes, setResMes] = useState('MARÇO');
  const [resResponsavel, setResResponsavel] = useState('Davi');
  const [resTipo, setResTipo] = useState('Futuro');
  const [resValor, setResValor] = useState('');
  
  const [resMensagem, setResMensagem] = useState('');
  const [resStatus, setResStatus] = useState<'sucesso' | 'erro' | 'carregando' | ''>('');

  const mesesOpcoes = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

  const parseValor = (val: string | undefined) => {
    if (!val) return 0;
    const limpo = val.toString().replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  };

  const parseCurrency = (val: string | undefined) => {
    if (!val) return 0;
    const clean = val.toString().replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const carregarDashboard = async () => {
    setCarregando(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/investimentos/dashboard`);
      const data = await res.json();
      
      if (res.ok) {
        if (data.totais) {
          setTotais(data.totais);
        }
        
        const linhas = data.historico || [];
        
        const anosMap: Record<number, { d: number[], s: number[] }> = {
          2025: { d: [1, 2], s: [3, 4] },
          2026: { d: [7, 8], s: [9, 10] },
          2027: { d: [11, 12], s: [13, 14] },
          2028: { d: [15, 16], s: [17, 18] },
          2029: { d: [19, 20], s: [21, 22] }
        };
        
        const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        let historico: any[] = [];
        
        let accDaviFuturo = 0;
        let accDaviPessoal = 0;
        let accStellaFuturo = 0;
        let accStellaPessoal = 0;
        
        for (let ano = 2025; ano <= 2029; ano++) {
          for (let m = 0; m < 12; m++) {
            const row = linhas[m] || [];
            const indices = anosMap[ano];
            
            const daviFuturoMes = parseValor(row[indices.d[0]]);
            const daviPessoalMes = parseValor(row[indices.d[1]]);
            const stellaFuturoMes = parseValor(row[indices.s[0]]);
            const stellaPessoalMes = parseValor(row[indices.s[1]]);
            
            const textoLinha = `${row[indices.d[0]] || ''}${row[indices.d[1]] || ''}${row[indices.s[0]] || ''}${row[indices.s[1]] || ''}`;
            const temConteudo = textoLinha.trim() !== '';
            
            accDaviFuturo += daviFuturoMes;
            accDaviPessoal += daviPessoalMes;
            accStellaFuturo += stellaFuturoMes;
            accStellaPessoal += stellaPessoalMes;
            
            historico.push({
              periodo: `${mesesAbrev[m]}/${ano.toString().slice(2)}`,
              DaviFuturo: Number(accDaviFuturo.toFixed(2)),
              DaviPessoal: Number(accDaviPessoal.toFixed(2)),
              DaviTotal: Number((accDaviFuturo + accDaviPessoal).toFixed(2)),
              StellaFuturo: Number(accStellaFuturo.toFixed(2)),
              StellaPessoal: Number(accStellaPessoal.toFixed(2)),
              StellaTotal: Number((accStellaFuturo + accStellaPessoal).toFixed(2)),
              JuntosFuturo: Number((accDaviFuturo + accStellaFuturo).toFixed(2)),
              JuntosPessoal: Number((accDaviPessoal + accStellaPessoal).toFixed(2)),
              TotalConjunto: Number((accDaviFuturo + accDaviPessoal + accStellaFuturo + accStellaPessoal).toFixed(2)),
              teveAporte: temConteudo
            });
          }
        }
        
        while(historico.length > 0 && !historico[historico.length - 1].teveAporte) {
          historico.pop();
        }
        
        setDadosGrafico(historico);
      }
    } catch (error) {
      console.error('Erro de conexão com o back-end.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDashboard();
  }, []);

  const handleInvestimentoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvStatus('carregando');
    setInvMensagem('Enviando investimento...');
    const mesFormatado = invMes.charAt(0) + invMes.slice(1).toLowerCase();

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/investimento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          divisaoManual
            ? {
                ano: Number(invAno),
                mes: mesFormatado,
                responsavel: invResponsavel,
                valorFuturo: Number(invFuturo || 0),
                valorPessoal: Number(invPessoal || 0),
              }
            : { ano: Number(invAno), mes: mesFormatado, responsavel: invResponsavel, valor: Number(invValor) }
        ),
      });

      const data = await response.json();
      if (response.ok) {
        setInvStatus('sucesso');
        setInvMensagem(
          `Aporte registrado! Futuro: ${mascarar(formatCurrency(data.aporteFuturo ?? 0))} | Pessoal: ${mascarar(formatCurrency(data.aportePessoal ?? 0))}`
        );
        setInvValor('');
        setInvFuturo('');
        setInvPessoal('');
        carregarDashboard();
      } else {
        setInvStatus('erro');
        setInvMensagem(`Erro: ${data.error || 'Erro ao salvar'}`);
      }
    } catch {
      setInvStatus('erro');
      setInvMensagem('Erro de conexão com o back-end.');
    }
  };

  const handleResgateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResStatus('carregando');
    setResMensagem('Processando resgate...');
    const mesFormatado = resMes.charAt(0) + resMes.slice(1).toLowerCase();

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/resgate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ano: Number(resAno), 
          mes: mesFormatado, 
          responsavel: resResponsavel, 
          tipo: resTipo, 
          valor: Number(resValor) 
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResStatus('sucesso');
        setResMensagem(`Resgate efetuado com sucesso!`);
        setResValor('');
        carregarDashboard();
      } else {
        setResStatus('erro');
        setResMensagem(`Erro: ${data.error || 'Erro ao realizar resgate'}`);
      }
    } catch {
      setResStatus('erro');
      setResMensagem('Erro de conexão com o back-end.');
    }
  };

  const tooltipFormatter = (value: any, name: any) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, name];

  const totalDaviNum = parseCurrency(totais.daviFuturo) + parseCurrency(totais.daviPresente);
  const totalStellaNum = parseCurrency(totais.stellaFuturo) + parseCurrency(totais.stellaPessoal);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/50">
        
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row justify-between items-center mb-8 border-b border-gray-700/50 pb-6 gap-6">
          <div className="hidden lg:block lg:w-1/4" />

          
          <h1 className="text-2xl font-bold text-blue-400 tracking-wide w-full lg:w-2/4 text-center">
            Dashboard de Investimentos
          </h1>
          
          <div className="flex gap-3 w-full lg:w-1/4 justify-end">
            <button 
              onClick={() => { 
                setIsAdicionando(!isAdicionando); 
                setIsResgatando(false);
                setInvMensagem(''); 
                setInvStatus(''); 
              }}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${isAdicionando ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20 text-white'} text-sm`}
            >
              {isAdicionando ? (
                <><X className="w-4 h-4" /> Cancelar</>
              ) : (
                <><Plus className="w-4 h-4" /> ADICIONAR</>
              )}
            </button>
            <button 
              onClick={() => { 
                setIsResgatando(!isResgatando); 
                setIsAdicionando(false);
                setResMensagem(''); 
                setResStatus('');
              }}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${isResgatando ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-sky-500 hover:bg-cyan-600 shadow-sky-900/20 text-white'} text-sm`}
            >
              {isResgatando ? (
                <><X className="w-4 h-4" /> Cancelar</>
              ) : (
                <><Minus className="w-4 h-4" /> RESGATAR</>
              )}
            </button>
          </div>
        </div>

        {/* Formulário de Adicionar Investimento */}
        {isAdicionando && (
          <div className="mb-10 bg-gray-900/40 p-6 md:p-8 rounded-2xl border border-gray-700/50 max-w-xl mx-auto shadow-inner">
            <h2 className="text-xl font-bold mb-6 text-center text-blue-400 tracking-wide">Registrar Novo Aporte</h2>
            <form onSubmit={handleInvestimentoSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Responsável</label>
                  <select value={invResponsavel} onChange={(e) => setInvResponsavel(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                    <option className="bg-gray-800 text-gray-200" value="Davi">Davi</option>
                    <option className="bg-gray-800 text-gray-200" value="Stella">Stella</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Ano</label>
                  <input type="number" value={invAno} onChange={(e) => setInvAno(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Mês</label>
                <select value={invMes} onChange={(e) => setInvMes(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                  {mesesOpcoes.map((m) => <option className="bg-gray-800 text-gray-200" key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {!divisaoManual ? (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Valor Total a Investir (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Ex: 1000,00" 
                    value={invValor} 
                    onChange={(e) => setInvValor(e.target.value)} 
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    required 
                  />
                  <p className="text-[11px] text-gray-500 mt-2">Será dividido em 70% Futuro e 30% Pessoal.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Futuro (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        value={invFuturo} 
                        onChange={(e) => setInvFuturo(e.target.value)} 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Pessoal (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        value={invPessoal} 
                        onChange={(e) => setInvPessoal(e.target.value)} 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Total do aporte: <span className="text-gray-300 font-semibold">{mascarar(formatCurrency(Number(invFuturo || 0) + Number(invPessoal || 0)))}</span>
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <button 
                  type="submit" 
                  disabled={invStatus === 'carregando' || (divisaoManual && Number(invFuturo || 0) + Number(invPessoal || 0) <= 0)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold p-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {invStatus === 'carregando' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {invStatus === 'carregando' ? 'Enviando...' : 'Salvar Investimento'}
                </button>

                <button 
                  type="button" 
                  onClick={() => { setDivisaoManual(!divisaoManual); setInvMensagem(''); setInvStatus(''); }}
                  title={divisaoManual ? 'Voltar para valor único com divisão 70/30' : 'Escolher quanto vai para Futuro e para Pessoal'}
                  className={`sm:w-auto px-4 p-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${divisaoManual ? 'bg-blue-600/15 border-blue-500/40 text-blue-300' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
                >
                  <SplitSquareHorizontal className="w-4 h-4" />
                  {divisaoManual ? 'Auto' : 'Manual'}
                </button>
              </div>
            </form>
            {invMensagem && (
              <div className={`mt-6 p-4 rounded-xl font-medium text-sm border flex items-center justify-center gap-3 ${invStatus === 'erro' ? 'bg-red-900/20 border-red-500/30 text-red-400' : invStatus === 'sucesso' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-blue-900/20 border-blue-500/30 text-blue-400'}`}>
                {invStatus === 'erro' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                {invStatus === 'sucesso' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                <span>{invMensagem}</span>
              </div>
            )}
          </div>
        )}

        {/* Formulário de Registrar Resgate */}
        {isResgatando && (
          <div className="mb-10 bg-gray-900/40 p-6 md:p-8 rounded-2xl border border-gray-700/50 max-w-xl mx-auto shadow-inner">
            <h2 className="text-xl font-bold mb-6 text-center text-sky-300 tracking-wide">Registrar Resgate</h2>
            <form onSubmit={handleResgateSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Responsável</label>
                  <select value={resResponsavel} onChange={(e) => setResResponsavel(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all">
                    <option className="bg-gray-800 text-gray-200" value="Davi">Davi</option>
                    <option className="bg-gray-800 text-gray-200" value="Stella">Stella</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Tipo de Resgate</label>
                  <select value={resTipo} onChange={(e) => setResTipo(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all">
                    <option className="bg-gray-800 text-gray-200" value="Futuro">Futuro</option>
                    <option className="bg-gray-800 text-gray-200" value="Pessoal">Pessoal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Ano</label>
                  <input type="number" value={resAno} onChange={(e) => setResAno(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all" required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Mês</label>
                  <select value={resMes} onChange={(e) => setResMes(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all">
                    {mesesOpcoes.map((m) => <option className="bg-gray-800 text-gray-200" key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Valor do Resgate (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Ex: 500,00" 
                  value={resValor} 
                  onChange={(e) => setResValor(e.target.value)} 
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={resStatus === 'carregando'}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold p-3.5 rounded-xl transition-all shadow-lg shadow-sky-900/20 mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resStatus === 'carregando' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {resStatus === 'carregando' ? 'Processando...' : 'Efetuar Resgate'}
              </button>
            </form>
            {resMensagem && (
               <div className={`mt-6 p-4 rounded-xl font-medium text-sm border flex items-center justify-center gap-3 ${resStatus === 'erro' ? 'bg-red-900/20 border-red-500/30 text-red-400' : resStatus === 'sucesso' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-sky-900/20 border-sky-500/30 text-sky-400'}`}>
               {resStatus === 'erro' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
               {resStatus === 'sucesso' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
               <span>{resMensagem}</span>
             </div>
            )}
          </div>
        )}

        {/* Cards de Totais */}
        {!carregando && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* TOTAL DAVI */}
            <div className="bg-gray-900/40 p-6 rounded-2xl border border-gray-700/50 shadow-lg flex flex-col justify-between hover:border-gray-600 transition-colors">
              <div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 text-center">Total Davi</h3>
                <p className="text-2xl font-bold text-blue-400 text-center mb-5">
                  {mascarar(totalDaviNum > 0 ? formatCurrency(totalDaviNum) : (totais.daviFuturo || 'R$ 0,00'))}
                </p>
              </div>
              <div className="border-t border-gray-700/80 pt-4 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-gray-700/50">
                  <span className="text-emerald-400 font-medium">Total Futuro:</span>
                  <span className="font-bold text-emerald-400">{mascarar(totais.daviFuturo || 'R$ 0,00')}</span>
                </div>
                <div className="flex justify-between items-center pl-2 pt-1">
                  <span className="text-gray-500">└ Reserva:</span>
                  <span className="font-medium text-emerald-400/80">{mascarar(totais.daviReserva || 'R$ 0,00')}</span>
                </div>
                <div className="flex justify-between items-center pl-2 pb-2 border-b border-gray-700/50">
                  <span className="text-gray-500">└ Casamento:</span>
                  <span className="font-medium text-emerald-400/80">{mascarar(totais.daviCasamento || 'R$ 0,00')}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-amber-400/80 font-medium">Pessoal:</span>
                  <span className="font-bold text-amber-400/90">{mascarar(totais.daviPresente || 'R$ 0,00')}</span>
                </div>
              </div>
            </div>

            {/* TOTAL STELLA */}
            <div className="bg-gray-900/40 p-6 rounded-2xl border border-gray-700/50 shadow-lg flex flex-col justify-between hover:border-gray-600 transition-colors">
              <div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 text-center">Total Stella</h3>
                <p className="text-2xl font-bold text-indigo-400 text-center mb-5">
                  {mascarar(totalStellaNum > 0 ? formatCurrency(totalStellaNum) : (totais.stellaFuturo || 'R$ 0,00'))}
                </p>
              </div>
              <div className="border-t border-gray-700/80 pt-4 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-gray-700/50">
                  <span className="text-emerald-400 font-medium">Total Futuro:</span>
                  <span className="font-bold text-emerald-400">{mascarar(totais.stellaFuturo || 'R$ 0,00')}</span>
                </div>
                <div className="flex justify-between items-center pl-2 pt-1">
                  <span className="text-gray-500">└ Reserva:</span>
                  <span className="font-medium text-emerald-400/80">{mascarar(totais.stellaReserva || 'R$ 0,00')}</span>
                </div>
                <div className="flex justify-between items-center pl-2 pb-2 border-b border-gray-700/50">
                  <span className="text-gray-500">└ Casamento:</span>
                  <span className="font-medium text-emerald-400/80">{mascarar(totais.stellaCasamento || 'R$ 0,00')}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-amber-400/80 font-medium">Pessoal:</span>
                  <span className="font-bold text-amber-400/90">{mascarar(totais.stellaPessoal || 'R$ 0,00')}</span>
                </div>
              </div>
            </div>

            {/* VALOR TOTAL JUNTOS (Destaque Principal) */}
            <div className="bg-gradient-to-br from-blue-900/40 to-gray-900/40 p-6 rounded-2xl border border-blue-500/30 text-center shadow-lg flex flex-col justify-center transform transition-transform hover:scale-[1.02]">
              <h3 className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-3">Valor Total Conjunto</h3>
              <p className="text-4xl font-bold text-white tracking-tight">{mascarar(totais.totalJuntos || 'R$ 0,00')}</p>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="flex justify-center items-center py-20 flex-col gap-3">
             <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
             <p className="text-gray-400 font-medium">A carregar evolução patrimonial...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Gráfico Davi */}
            <div className="bg-gray-900/30 p-6 md:p-8 rounded-2xl border border-gray-700/50">
              <h2 className="text-lg font-bold text-center mb-6 text-gray-200 tracking-wide">Evolução do Património - Davi</h2>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="periodo" stroke="#9CA3AF" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} />
                    <Tooltip formatter={tooltipFormatter} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF', borderRadius: '0.5rem' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="DaviFuturo" name="Futuro" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="DaviPessoal" name="Pessoal" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="DaviTotal" name="Total Davi" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Stella */}
            <div className="bg-gray-900/30 p-6 md:p-8 rounded-2xl border border-gray-700/50">
              <h2 className="text-lg font-bold text-center mb-6 text-gray-200 tracking-wide">Evolução do Património - Stella</h2>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="periodo" stroke="#9CA3AF" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} />
                    <Tooltip formatter={tooltipFormatter} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF', borderRadius: '0.5rem' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="StellaFuturo" name="Futuro" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="StellaPessoal" name="Pessoal" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="StellaTotal" name="Total Stella" stroke="#754fffff" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Juntos */}
            <div className="bg-gray-900/30 p-6 md:p-8 rounded-2xl border border-gray-700/50">
              <h2 className="text-xl font-bold text-center mb-6 text-blue-400 tracking-wide">Evolução Acumulada - Casal</h2>
              <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="periodo" stroke="#9CA3AF" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} />
                    <Tooltip formatter={tooltipFormatter} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF', borderRadius: '0.5rem' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="TotalConjunto" name="Património Total" stroke="#60A5FA" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="JuntosFuturo" name="Total Futuro Conjunto" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="JuntosPessoal" name="Total Pessoal Conjunto" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}