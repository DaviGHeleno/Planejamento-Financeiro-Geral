'use client';

import { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface ObjetivoItem {
  id: number;
  texto: string;
  concluido: boolean;
}

export default function ObjetivosPage() {
  const [objetivos, setObjetivos] = useState<ObjetivoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  
  // Estado para saber qual item está a ser guardado no momento (mostra o spinner nele)
  const [atualizandoId, setAtualizandoId] = useState<number | null>(null);

  const carregarObjetivos = async () => {
    setCarregando(true);
    setErro('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/objetivos`);
      const responseData = await res.json();

      if (res.ok && responseData.data) {
        const lista: ObjetivoItem[] = responseData.data
          .map((linha: any[], index: number) => {
            const isChecked = String(linha[0]).toUpperCase() === 'TRUE' || String(linha[0]).toUpperCase() === 'VERDADEIRO';
            const texto = linha[1] ? String(linha[1]).trim() : '';

            return {
              id: index,
              texto,
              concluido: isChecked,
            };
          })
          .filter((item: ObjetivoItem) => item.texto !== '');

        setObjetivos(lista);
      } else {
        setErro(responseData.error || 'Não foi possível carregar os objetivos.');
      }
    } catch {
      setErro('Erro de conexão com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarObjetivos();
  }, []);

  // FUNÇÃO NOVA: Para marcar e desmarcar
  const toggleObjetivo = async (id: number, estadoAtual: boolean) => {
    if (atualizandoId !== null) return; // Evita cliques múltiplos
    
    const novoEstado = !estadoAtual;
    setAtualizandoId(id);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/objetivos/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: id, concluido: novoEstado }),
      });

      if (res.ok) {
        // Atualiza a lista visualmente de forma instantânea
        setObjetivos(prev => 
          prev.map(obj => obj.id === id ? { ...obj, concluido: novoEstado } : obj)
        );
      } else {
        alert('Erro ao guardar alteração.');
      }
    } catch (error) {
      alert('Erro de conexão com o servidor.');
    } finally {
      setAtualizandoId(null);
    }
  };

  const total = objetivos.length;
  const concluidos = objetivos.filter((o) => o.concluido).length;
  const percentualGeral = total > 0 ? (concluidos / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/50">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-700/50 pb-6 gap-4">
          <div className="hidden md:block md:w-1/3" />

          
          <h1 className="text-2xl font-bold text-blue-400 tracking-wide w-full md:w-1/3 text-center flex items-center justify-center gap-2">
            <Target className="w-6 h-6" /> Objetivos do Casal
          </h1>

          <div className="w-full md:w-1/3"></div>
        </div>

        {/* CARREGANDO / ERRO / CONTEÚDO */}
        {carregando ? (
          <div className="flex justify-center items-center py-20 flex-col gap-3">
             <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
             <p className="text-gray-400 font-medium">A carregar os sonhos do casal...</p>
          </div>
        ) : erro ? (
          <div className="p-4 rounded-xl font-medium text-sm border flex items-center justify-center gap-3 bg-red-900/20 border-red-500/30 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        ) : objetivos.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum objetivo encontrado na aba "OBJETIVOS".</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* PAINEL DE PROGRESSO GERAL */}
            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700/60 shadow-inner">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Progresso dos Sonhos</span>
                <span className="text-sm font-bold text-blue-500">
                  {concluidos} de {total} realizados ({percentualGeral.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3.5 border border-gray-700 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 via-sky-500 to-purple-300 h-3.5 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${percentualGeral}%` }}
                ></div>
              </div>
            </div>

            {/* LISTA DE OBJETIVOS EM CARDS CLICÁVEIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {objetivos.map((obj) => (
                <button 
                  key={obj.id}
                  onClick={() => toggleObjetivo(obj.id, obj.concluido)}
                  disabled={atualizandoId !== null && atualizandoId !== obj.id} // Desabilita outros enquanto um atualiza
                  className={`p-4 rounded-xl border transition-all flex items-center gap-3.5 w-full text-left cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    obj.concluido 
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200 hover:bg-emerald-900/30' 
                      : 'bg-gray-900/30 border-gray-700/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800/80'
                  } ${atualizandoId !== null && atualizandoId !== obj.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* MOSTRA O SPINNER SE ESTIVER A ATUALIZAR, CASO CONTRÁRIO O CHECK */}
                  {atualizandoId === obj.id ? (
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin flex-shrink-0" />
                  ) : obj.concluido ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                  
                  <span className={`text-sm font-medium ${obj.concluido && atualizandoId !== obj.id ? 'line-through opacity-80' : ''}`}>
                    {obj.texto}
                  </span>
                </button>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}