'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReceiptText, ChartColumn, TrendingUp, Eye, EyeOff, Settings } from 'lucide-react';
import { useValores } from './ValoresContext';
import { useDados } from './DadosContext';
import ModalConexao from './ModalConexao';

const ITENS = [
  { href: '/investimentos', rotulo: 'Investimentos', curto: 'Invest.', Icone: TrendingUp, cor: 'text-emerald-400' },
  { href: '/gastos', rotulo: 'Lançar Gastos', curto: 'Lançar', Icone: ReceiptText, cor: 'text-amber-300' },
  { href: '/resumo', rotulo: 'Consulta e Relatórios', curto: 'Consulta', Icone: ChartColumn, cor: 'text-purple-400' },
];

export default function Navegacao() {
  const caminho = usePathname();
  const { oculto, alternar } = useValores();
  const { dados, modoDemonstracao, pronto } = useDados();
  const [conexaoAberta, setConexaoAberta] = useState(false);

  const ativo = (href: string) => caminho === href || caminho.startsWith(`${href}/`);
  const titulo = (dados?.config?.titulo || 'Planejamento Financeiro').toString();

  const botaoRedondo = (destacado: boolean) =>
    `flex items-center justify-center w-9 h-9 rounded-full border transition-all flex-shrink-0 ${
      destacado
        ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
        : 'bg-gray-900/50 border-gray-700/50 text-gray-400 hover:text-blue-400 hover:border-blue-500/50'
    }`;

  return (
    <>
      {/* DESKTOP: barra lateral fixa */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 bg-gray-800 border-r border-gray-700/50 p-5 z-40">
        <div className="mb-8 flex items-start justify-between gap-3">
          <h1 className="text-lg font-bold text-blue-400 tracking-wide leading-tight break-words min-w-0">
            {titulo}
          </h1>

          {/* Esconder/mostrar os valores em R$ de todas as telas */}
          <button
            type="button"
            onClick={alternar}
            title={oculto ? 'Mostrar os valores' : 'Esconder os valores'}
            aria-label={oculto ? 'Mostrar os valores' : 'Esconder os valores'}
            className={botaoRedondo(oculto)}
          >
            {oculto ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {ITENS.map(({ href, rotulo, Icone, cor }) => {
            const selecionado = ativo(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  selecionado
                    ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                    : 'bg-transparent border-transparent text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
                }`}
              >
                <Icone className={`w-5 h-5 flex-shrink-0 ${selecionado ? 'text-blue-300' : cor}`} />
                <span className="truncate">{rotulo}</span>
              </Link>
            );
          })}
        </nav>

        {/* Conexão com a planilha, no rodapé da lateral */}
        <button
          type="button"
          onClick={() => setConexaoAberta(true)}
          className={`mt-auto flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
            pronto && modoDemonstracao
              ? 'bg-amber-900/20 border-amber-500/40 text-amber-300 hover:bg-amber-900/30'
              : 'bg-transparent border-gray-700/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">
            {pronto && modoDemonstracao ? 'Conectar planilha' : 'Planilha conectada'}
          </span>
        </button>
      </aside>

      {/* CELULAR: barra de ícones fixa no rodapé */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-800 border-t border-gray-700/50 flex justify-around pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {ITENS.map(({ href, curto, Icone, cor }) => {
          const selecionado = ativo(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                selecionado ? 'text-blue-300' : 'text-gray-400'
              }`}
            >
              <Icone className={`w-5 h-5 ${selecionado ? 'text-blue-300' : cor}`} />
              <span className="text-[10px] font-semibold">{curto}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={alternar}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${oculto ? 'text-blue-300' : 'text-gray-400'}`}
          title={oculto ? 'Mostrar os valores' : 'Esconder os valores'}
        >
          {oculto ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          <span className="text-[10px] font-semibold">{oculto ? 'Mostrar' : 'Ocultar'}</span>
        </button>

        <button
          type="button"
          onClick={() => setConexaoAberta(true)}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
            pronto && modoDemonstracao ? 'text-amber-300' : 'text-gray-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Planilha</span>
        </button>
      </nav>

      <ModalConexao aberto={conexaoAberta} aoFechar={() => setConexaoAberta(false)} />
    </>
  );
}
