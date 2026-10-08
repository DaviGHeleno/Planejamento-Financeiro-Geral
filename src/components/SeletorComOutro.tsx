'use client';

import { useState } from 'react';
import { List } from 'lucide-react';

// ============================================================================
// SELETOR COM "OUTRO…"
// Mostra as opções conhecidas (aba Listas da planilha) e deixa digitar um
// valor novo quando nenhuma serve. Valor que não está na lista já abre em
// modo texto — é o caso de um gasto antigo ou importado.
// ============================================================================

interface Props {
  opcoes: string[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  invalido?: boolean;
  compacto?: boolean;
}

export default function SeletorComOutro({ opcoes, valor, onChange, placeholder = 'Selecione', invalido = false, compacto = false }: Props) {
  const [livre, setLivre] = useState(valor.trim() !== '' && !opcoes.includes(valor));

  const tamanho = compacto ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-sm';
  const borda = invalido ? 'border-red-500/70' : livre ? 'border-blue-500/50' : 'border-gray-700';
  const classe = `w-full bg-gray-900 border ${borda} rounded-lg ${tamanho} text-gray-200 outline-none focus:border-blue-500`;

  if (livre) {
    return (
      <div className="flex gap-1.5">
        <input
          type="text"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite o novo valor"
          className={classe}
          autoFocus={valor === ''}
        />
        <button
          type="button"
          onClick={() => { setLivre(false); onChange(''); }}
          title="Voltar para a lista"
          className="px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 flex-shrink-0"
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
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
      className={classe}
    >
      <option className="bg-gray-900" value="">{placeholder}</option>
      {opcoes.map((opcao) => (
        <option className="bg-gray-900" key={opcao} value={opcao}>{opcao}</option>
      ))}
      <option className="bg-gray-900 text-blue-300" value="__OUTRO__">Outro…</option>
    </select>
  );
}
