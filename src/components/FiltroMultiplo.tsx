'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

// ============================================================================
// FILTRO COM SELEÇÃO MÚLTIPLA (dropdown com checkbox)
// Lista vazia de selecionados = sem filtro, mostra tudo.
// ============================================================================

interface Opcao {
  valor: string;
  rotulo: string;
}

interface Props {
  rotulo: string;
  opcoes: Opcao[];
  selecionados: string[];
  onChange: (novos: string[]) => void;
}

export default function FiltroMultiplo({ rotulo, opcoes, selecionados, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const cliqueFora = (e: MouseEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };

    document.addEventListener('mousedown', cliqueFora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', cliqueFora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  const alternar = (valor: string) => {
    onChange(selecionados.includes(valor) ? selecionados.filter((s) => s !== valor) : [...selecionados, valor]);
  };

  const texto =
    selecionados.length === 0
      ? rotulo
      : selecionados.length === 1
        ? opcoes.find((o) => o.valor === selecionados[0])?.rotulo || selecionados[0]
        : `${selecionados.length} selecionados`;

  return (
    <div className="relative" ref={container}>
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
              <p className="px-3 py-2 text-xs text-gray-500">Nenhuma opção no período.</p>
            )}
            {opcoes.map((opcao) => {
              const marcado = selecionados.includes(opcao.valor);
              return (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => alternar(opcao.valor)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-gray-200 hover:bg-gray-700/60 transition-colors"
                >
                  <span
                    className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center ${
                      marcado ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                    }`}
                  >
                    {marcado && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="truncate">{opcao.rotulo}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
