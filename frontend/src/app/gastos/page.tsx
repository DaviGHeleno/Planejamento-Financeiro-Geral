'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Plus, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface ItemGasto {
  id: string;
  descricao: string;
  categoria: string;
  subcategoria: string;
  motivo: string;
  valor: string;
}

export default function GastosPage() {
  const [responsavel, setResponsavel] = useState('Davi');
  const [ano, setAno] = useState('26');
  const [mes, setMes] = useState('SETEMBRO');
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro' | 'carregando' | ''>('');
  const [enviando, setEnviando] = useState(false);

  const anosOpcoes = ['26', '27', '28', '29', '30'];
  const mesesOpcoes = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const categoriaOpcoes = ['Alimentação', 'Atividade Física', 'Cuidado Pessoal', 'Extras', 'Futilidades', 'Imprevisto', 'Lazer', 'Transporte', 'Carro Novo'];
  const subcategoriaOpcoes = ['carro', 'uber', 'restaurante', 'lanche', 'supermercado', 'bar', 'beleza', 'terapia', 'remedio', 'passeios', 'hobbies', 'eventos', 'esportes', 'mimos', 'compras'];
  const motivoOpcoes = ['AMIGOS', 'ONE', 'FAMILIA', 'GASOLINA', 'CONSERTO', 'PESSOAL', 'NAMORO', 'PRESENTE', 'ESTACIONAMENTO'];

  const [itens, setItens] = useState<ItemGasto[]>([
    { id: '1', descricao: '', categoria: '', subcategoria: '', motivo: '', valor: '' }
  ]);

  const adicionarLinha = () => {
    setItens((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        descricao: '',
        categoria: prev[prev.length - 1]?.categoria || '',
        subcategoria: prev[prev.length - 1]?.subcategoria || '',
        motivo: prev[prev.length - 1]?.motivo || '',
        valor: ''
      }
    ]);
  };

  const removerLinha = (id: string) => {
    if (itens.length === 1) return;
    setItens((prev) => prev.filter((item) => item.id !== id));
  };

  const atualizarItem = (id: string, campo: keyof ItemGasto, valor: string) => {
    setItens((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };

  const handleKeyDownValor = (e: React.KeyboardEvent<HTMLInputElement>, isUltimaLinha: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isUltimaLinha) {
        adicionarLinha();
      }
    }
  };

  const normalizarOpcaoRigorosa = (valor: string, opcoes: string[]) => {
    if (!valor) return '';
    const match = opcoes.find(opt => opt.toLowerCase() === valor.toLowerCase().trim());
    return match || '';
  };

  const mostrarMensagem = (texto: string, tipo: 'sucesso' | 'erro' | 'carregando') => {
    setMensagem(texto);
    setTipoMensagem(tipo);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (data.length === 0) {
          mostrarMensagem('O ficheiro Excel está vazio.', 'erro');
          return;
        }

        const novosItens: ItemGasto[] = data.map((row, index) => {
          const descricaoKey = Object.keys(row).find(k => k.toLowerCase().includes('descri'));
          const categoriaKey = Object.keys(row).find(k => k.toLowerCase().includes('categor'));
          const subcategoriaKey = Object.keys(row).find(k => k.toLowerCase().includes('sub'));
          const motivoKey = Object.keys(row).find(k => k.toLowerCase().includes('motivo'));
          const valorKey = Object.keys(row).find(k => k.toLowerCase().includes('valor') || k.toLowerCase().includes('r$'));

          return {
            id: (Date.now() + index).toString(),
            descricao: descricaoKey ? String(row[descricaoKey]) : '', 
            categoria: normalizarOpcaoRigorosa(categoriaKey ? String(row[categoriaKey]) : '', categoriaOpcoes),
            subcategoria: normalizarOpcaoRigorosa(subcategoriaKey ? String(row[subcategoriaKey]) : '', subcategoriaOpcoes),
            motivo: normalizarOpcaoRigorosa(motivoKey ? String(row[motivoKey]) : '', motivoOpcoes),
            valor: valorKey ? String(row[valorKey]) : ''
          };
        });

        setItens(novosItens);
        mostrarMensagem(`Ficheiro lido com sucesso! (${novosItens.length} linhas). As linhas a vermelho precisam de ser corrigidas antes do envio.`, 'sucesso');
      } catch (error) {
        console.error(error);
        mostrarMensagem('Erro ao processar o ficheiro Excel.', 'erro');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const validarFormatoMoeda = (val: string) => {
    const v = val.trim();
    if (v === '') return true;
    const regexSimples = /^\d+$/; 
    const regexDecimalVirgula = /^\d+,\d+$/; 
    const regexDecimalPonto = /^\d+\.\d+$/; 
    const regexBrasileiro = /^(\d{1,3}(\.\d{3})+)(,\d+)?$/; 
    return regexSimples.test(v) || regexDecimalVirgula.test(v) || regexDecimalPonto.test(v) || regexBrasileiro.test(v);
  };

  const formatarValorInteligente = (val: string) => {
    let v = val.trim();
    if (/^(\d{1,3}(\.\d{3})+)(,\d+)?$/.test(v)) return v.replace(/\./g, ''); 
    if (/^\d+\.\d+$/.test(v)) return v.replace('.', ','); 
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itensValidos = itens.filter((i) => i.valor.trim() !== '');

    if (itensValidos.length === 0) {
      mostrarMensagem('Preencha o valor de pelo menos um gasto antes de enviar.', 'erro');
      return;
    }

    const temValorInvalido = itensValidos.some(i => !validarFormatoMoeda(i.valor));
    if (temValorInvalido) {
      mostrarMensagem('Formato de valor inválido', 'erro');
      return; 
    }

    const temCamposVazios = itensValidos.some(i => !i.categoria || !i.subcategoria || !i.motivo);
    if (temCamposVazios) {
      mostrarMensagem('Existem campos vazios. Preencha todas as caixas delimitadas em vermelho antes de enviar.', 'erro');
      return;
    }

    setEnviando(true);
    mostrarMensagem('Enviando gastos em lote...', 'carregando');
    
    const abaNome = `Mensal ${ano} - ${responsavel}`;
    
    const itensParaEnviar = itensValidos.map((i) => ({
      mes,
      categoria: i.categoria,
      subcategoria: i.subcategoria,
      motivo: i.motivo,
      valor: formatarValorInteligente(i.valor),
      descricao: i.descricao.trim()
    }));

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${API_URL}/api/gasto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aba: abaNome, itens: itensParaEnviar }),
      });

      const data = await response.json();
      if (response.ok) {
        mostrarMensagem(`${itensParaEnviar.length} gasto(s) cadastrado(s) na aba "${abaNome}" com sucesso!`, 'sucesso');
        setItens([{ id: Date.now().toString(), descricao: '', categoria: '', subcategoria: '', motivo: '', valor: '' }]);
      } else {
        mostrarMensagem(data.error || 'Erro ao salvar gastos na base de dados.', 'erro');
      }
    } catch {
      mostrarMensagem('Erro de conexão com o servidor.', 'erro');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/50">
        
        <h1 className="text-2xl font-bold mb-8 text-center text-blue-400 tracking-wide">
          Lançamento de Gastos Mensais
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">📁 Importar Excel (.xlsx / .xls)</h3>
              <p className="text-xs text-gray-400">O arquivo deve conter as colunas: <strong>descrição (opcional) | categorias | subcategorias | motivo | valor</strong></p>
            </div>
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-900/20 text-center">
              <span>Selecionar Arquivo Excel</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-900/50 p-5 rounded-xl border border-gray-700">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Responsável</label>
              <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                <option className="bg-gray-800 text-gray-200" value="Davi">Davi</option>
                <option className="bg-gray-800 text-gray-200" value="Stella">Stella</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Ano</label>
              <select value={ano} onChange={(e) => setAno(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                {anosOpcoes.map((a) => <option className="bg-gray-800 text-gray-200" key={a} value={a}>20{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Mês</label>
              <select value={mes} onChange={(e) => setMes(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                {mesesOpcoes.map((m) => <option className="bg-gray-800 text-gray-200" key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-4 overflow-x-auto">
            {/* CABEÇALHO DO GRID COM PERCENTAGENS EXACTAS */}
            <div className="hidden md:flex flex-nowrap gap-3 text-xs font-bold uppercase text-gray-500 px-2 tracking-wider w-full md:min-w-[1050px]">
              <span className="w-[30%]">Descrição (Opcional)</span>
              <span className="w-[18%]">Categoria</span>
              <span className="w-[18%]">Sub-categoria</span>
              <span className="w-[15%]">Motivo</span>
              <span className="w-[13%]">Valor (R$)</span>
              <span className="w-[6%] text-center">Ação</span>
            </div>

            {itens.map((item, index) => {
              const isUltima = index === itens.length - 1;
              const isValidoMoeda = validarFormatoMoeda(item.valor);

              const errorCategoria = !item.categoria && item.valor.trim() !== '';
              const errorSub = !item.subcategoria && item.valor.trim() !== '';
              const errorMotivo = !item.motivo && item.valor.trim() !== '';

              return (
                <div 
                  key={item.id} 
                  className="flex flex-col md:flex-row md:flex-nowrap gap-3 bg-gray-900/30 border border-gray-700 p-2.5 rounded-xl md:items-center hover:bg-gray-800/80 transition-colors w-full md:min-w-[1050px]"
                >
                  
                  {/* DESCRIÇÃO - Agora muito mais ampla (30%) */}
                  <div className="w-full md:w-[30%]">
                    <input
                      type="text"
                      placeholder="Ex: Almoço no shopping..."
                      value={item.descricao}
                      onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-400 outline-none transition-all focus:border-gray-500 focus:ring-1 focus:ring-gray-500 italic"
                    />
                  </div>

                  <div className="w-full md:w-[18%]">
                    <select
                      value={item.categoria}
                      onChange={(e) => atualizarItem(item.id, 'categoria', e.target.value)}
                      className={`w-full bg-gray-800 border rounded-lg p-2 text-sm text-gray-200 outline-none transition-all focus:ring-1 ${errorCategoria ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-900/10' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
                    >
                      <option className="bg-gray-800 text-gray-400" value="">Selecione...</option>
                      {categoriaOpcoes.map((c) => <option className="bg-gray-800 text-gray-200" key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="w-full md:w-[18%]">
                    <select
                      value={item.subcategoria}
                      onChange={(e) => atualizarItem(item.id, 'subcategoria', e.target.value)}
                      className={`w-full bg-gray-800 border rounded-lg p-2 text-sm text-gray-200 outline-none transition-all focus:ring-1 ${errorSub ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-900/10' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
                    >
                      <option className="bg-gray-800 text-gray-400" value="">Selecione...</option>
                      {subcategoriaOpcoes.map((s) => <option className="bg-gray-800 text-gray-200" key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="w-full md:w-[15%]">
                    <select
                      value={item.motivo}
                      onChange={(e) => atualizarItem(item.id, 'motivo', e.target.value)}
                      className={`w-full bg-gray-800 border rounded-lg p-2 text-sm text-gray-200 outline-none transition-all focus:ring-1 ${errorMotivo ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-900/10' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
                    >
                      <option className="bg-gray-800 text-gray-400" value="">Selecione...</option>
                      {motivoOpcoes.map((mo) => <option className="bg-gray-800 text-gray-200" key={mo} value={mo}>{mo}</option>)}
                    </select>
                  </div>

                  <div className="w-full md:w-[13%]">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={item.valor}
                      onChange={(e) => atualizarItem(item.id, 'valor', e.target.value)}
                      onKeyDown={(e) => handleKeyDownValor(e, isUltima)}
                      className={`w-full bg-gray-800 border rounded-lg p-2 text-sm text-gray-200 outline-none transition-all focus:ring-1 ${
                        !isValidoMoeda ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
                      }`}
                    />
                  </div>

                  <div className="w-full md:w-[6%] flex justify-center mt-2 md:mt-0">
                    <button
                      type="button"
                      onClick={() => removerLinha(item.id)}
                      disabled={itens.length === 1}
                      className="text-gray-400 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-20 font-bold p-2 rounded-lg transition-all"
                      title="Remover linha"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-6 mt-2 border-t border-gray-700/50">
            <button
              type="button"
              onClick={adicionarLinha}
              className="w-full md:w-1/3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 font-semibold p-3.5 rounded-xl transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nova Linha
            </button>

            <button
              type="submit"
              disabled={enviando}
              className="w-full md:w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-bold p-3.5 rounded-xl transition-colors text-sm disabled:opacity-50 shadow-lg shadow-blue-900/20"
            >
              {enviando ? 'Processando Lote...' : 'Adicionar Gastos (Enviar Todos)'}
            </button>
          </div>
        </form>

        {mensagem && (
          <div className={`mt-6 p-4 rounded-xl font-medium text-sm border flex items-center gap-3 ${tipoMensagem === 'erro' ? 'bg-red-900/20 border-red-500/30 text-red-400' : tipoMensagem === 'sucesso' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-blue-900/20 border-blue-500/30 text-blue-400'}`}>
            {tipoMensagem === 'erro' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {tipoMensagem === 'sucesso' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {tipoMensagem === 'carregando' && <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />}
            <span>{mensagem}</span>
          </div>
        )}
      </div>
    </div>
  );
}