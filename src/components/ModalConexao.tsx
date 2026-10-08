'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Link2, Loader2, Unplug, X } from 'lucide-react';
import { useDados } from './DadosContext';
import { problemaNaUrl } from '../lib/conexao';

// ============================================================================
// TELA DE CONEXÃO
// Pede a URL do Apps Script e o token. Só guarda depois que a planilha
// responde — assim ninguém sai da tela com uma configuração quebrada.
// ============================================================================

export default function ModalConexao({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { conexao, conectar, desconectar, modoDemonstracao } = useDados();

  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setUrl(conexao?.url || '');
      setToken(conexao?.token || '');
      setErro('');
    }
  }, [aberto, conexao]);

  if (!aberto) return null;

  const salvar = async () => {
    const problema = problemaNaUrl(url);
    if (problema) {
      setErro(problema);
      return;
    }
    if (token.trim() === '') {
      setErro('Informe o token gerado na planilha.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      await conectar({ url: url.trim(), token: token.trim() });
      aoFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível conectar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 my-8">

        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-blue-400">Conectar a sua planilha</h2>
            <p className="text-xs text-gray-400 mt-1">
              Os dados ficam na sua conta do Google. Este site só conversa com ela.
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="text-gray-400 hover:text-gray-200 flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              URL do Apps Script
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/…/exec"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="O código gerado pela função gerarToken"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500"
            />
          </div>

          {erro && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <details className="text-xs text-gray-400 bg-gray-900/50 border border-gray-700/50 rounded-lg p-3">
            <summary className="cursor-pointer font-semibold text-gray-300">
              Ainda não tenho isso
            </summary>
            <ol className="list-decimal pl-5 mt-3 space-y-1.5">
              <li>Crie uma planilha em branco no Google Sheets.</li>
              <li>Abra Extensões e depois Apps Script.</li>
              <li>Cole o arquivo Codigo.gs e salve.</li>
              <li>Rode criarEstrutura e, em seguida, gerarToken. Copie o token do registro de execução.</li>
              <li>Clique em Implantar, Nova implantação, tipo App da Web. Execute como você, acesso para qualquer pessoa. Copie a URL que termina em /exec.</li>
            </ol>
          </details>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {salvando ? 'Conectando...' : 'Conectar'}
            </button>

            {!modoDemonstracao && (
              <button
                type="button"
                onClick={() => { desconectar(); aoFechar(); }}
                disabled={salvando}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-700/60 hover:bg-gray-700 text-gray-300 text-sm font-bold border border-gray-600 disabled:opacity-50"
              >
                <Unplug className="w-4 h-4" />
                Desconectar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
