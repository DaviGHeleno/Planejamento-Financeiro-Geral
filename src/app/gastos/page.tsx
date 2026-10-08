'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertCircle, CheckCircle, FileSpreadsheet, Loader2, Plus, X } from 'lucide-react';
import { useDados } from '../../components/DadosContext';
import { useValores } from '../../components/ValoresContext';
import SeletorComOutro from '../../components/SeletorComOutro';
import { chave, formatarMoeda, hoje, normalizarData, paraNumero, valorValido } from '../../lib/formato';
import type { GastoEntrada } from '../../lib/tipos';

interface Linha {
  chave: string;      // só para o React; o id de verdade quem gera é a planilha
  data: string;
  categoria: string;
  subcategoria: string;
  motivo: string;
  valor: string;
  descricao: string;
}

type Aviso = { tipo: 'sucesso' | 'erro'; texto: string } | null;

let contador = 0;
const novaChave = () => `linha-${Date.now()}-${contador++}`;

function linhaVazia(base?: Partial<Linha>): Linha {
  return {
    chave: novaChave(),
    data: base?.data || hoje(),
    categoria: base?.categoria || '',
    subcategoria: base?.subcategoria || '',
    motivo: base?.motivo || '',
    valor: '',
    descricao: '',
  };
}

export default function GastosPage() {
  const { dados, modoDemonstracao, criarGastos } = useDados();
  const { mascarar } = useValores();

  const [linhas, setLinhas] = useState<Linha[]>([linhaVazia()]);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);
  const [tentouEnviar, setTentouEnviar] = useState(false);
  // Muda a cada importação para remontar os seletores com os valores novos.
  const [versaoImportacao, setVersaoImportacao] = useState(0);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const listas = dados?.listas || { categorias: [], subcategorias: [], motivos: [] };

  // Linha "preenchida" = tem valor. Linhas sem valor são ignoradas no envio.
  const preenchidas = linhas.filter((l) => l.valor.trim() !== '');
  const total = useMemo(() => preenchidas.reduce((soma, l) => soma + paraNumero(l.valor), 0), [preenchidas]);

  const problemasDaLinha = (l: Linha) => ({
    valor: l.valor.trim() !== '' && !valorValido(l.valor),
    categoria: l.valor.trim() !== '' && l.categoria.trim() === '',
    data: l.valor.trim() !== '' && normalizarData(l.data) === '',
  });

  // ---------- edição das linhas ----------

  const atualizar = (chaveLinha: string, campo: keyof Linha, valor: string) => {
    setLinhas((atuais) => atuais.map((l) => (l.chave === chaveLinha ? { ...l, [campo]: valor } : l)));
  };

  /** Nova linha herda data, categoria, sub e motivo da anterior: agiliza lançar vários parecidos. */
  const adicionarLinha = () => {
    setLinhas((atuais) => [...atuais, linhaVazia(atuais[atuais.length - 1])]);
  };

  const removerLinha = (chaveLinha: string) => {
    setLinhas((atuais) => (atuais.length === 1 ? [linhaVazia()] : atuais.filter((l) => l.chave !== chaveLinha)));
  };

  const limparTudo = () => {
    setLinhas([linhaVazia()]);
    setTentouEnviar(false);
    setAviso(null);
    setVersaoImportacao((v) => v + 1);
  };

  // ---------- importação de Excel ----------

  /** Acha a opção da lista ignorando acento e caixa; se não achar, mantém o texto original. */
  const casarComLista = (texto: string, opcoes: string[]) => {
    const limpo = (texto || '').toString().trim();
    if (!limpo) return '';
    return opcoes.find((o) => chave(o) === chave(limpo)) || limpo;
  };

  /**
   * Localiza a coluna pelo nome do cabeçalho. "subcategoria" é procurada antes
   * de "categoria", senão a coluna de subcategoria seria tomada por categoria.
   */
  const acharColunas = (cabecalhos: string[]) => {
    const pegar = (teste: (c: string) => boolean) => cabecalhos.find((c) => teste(chave(c)));
    const sub = pegar((c) => c.startsWith('sub'));
    return {
      data: pegar((c) => c === 'data' || c.startsWith('data ') || c === 'dia'),
      subcategoria: sub,
      categoria: pegar((c) => c.includes('categor') && !c.startsWith('sub')),
      motivo: pegar((c) => c.includes('motivo')),
      valor: pegar((c) => c.includes('valor') || c === 'r$'),
      descricao: pegar((c) => c.includes('descri')),
    };
  };

  const importarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    try {
      const conteudo = await arquivo.arrayBuffer();
      const planilha = XLSX.read(conteudo, { type: 'array', cellDates: true });
      const aba = planilha.Sheets[planilha.SheetNames[0]];
      const registros = XLSX.utils.sheet_to_json<Record<string, unknown>>(aba, { defval: '' });

      if (registros.length === 0) {
        setAviso({ tipo: 'erro', texto: 'O arquivo está vazio.' });
        return;
      }

      const col = acharColunas(Object.keys(registros[0]));
      if (!col.valor) {
        setAviso({ tipo: 'erro', texto: 'Não achei a coluna de valor. O cabeçalho precisa ter "Valor" ou "R$".' });
        return;
      }

      const ler = (registro: Record<string, unknown>, coluna?: string) =>
        coluna ? registro[coluna] : '';

      const importadas: Linha[] = registros
        .map((r) => ({
          chave: novaChave(),
          data: normalizarData(ler(r, col.data)) || hoje(),
          categoria: casarComLista(String(ler(r, col.categoria) ?? ''), listas.categorias),
          subcategoria: casarComLista(String(ler(r, col.subcategoria) ?? ''), listas.subcategorias),
          motivo: casarComLista(String(ler(r, col.motivo) ?? ''), listas.motivos),
          valor: String(ler(r, col.valor) ?? '').trim(),
          descricao: String(ler(r, col.descricao) ?? '').trim(),
        }))
        .filter((l) => l.valor !== '');

      setLinhas(importadas.length > 0 ? importadas : [linhaVazia()]);
      setVersaoImportacao((v) => v + 1);
      setTentouEnviar(true); // já destaca o que precisa de correção
      setAviso({
        tipo: 'sucesso',
        texto: `${importadas.length} linha(s) lida(s). Confira as marcadas em vermelho antes de salvar.`,
      });
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.' });
    }
  };

  // ---------- envio ----------

  const salvar = async () => {
    setTentouEnviar(true);
    setAviso(null);

    if (preenchidas.length === 0) {
      setAviso({ tipo: 'erro', texto: 'Preencha o valor de pelo menos um gasto.' });
      return;
    }

    const comProblema = preenchidas.findIndex((l) => {
      const p = problemasDaLinha(l);
      return p.valor || p.categoria || p.data;
    });

    if (comProblema !== -1) {
      setAviso({ tipo: 'erro', texto: 'Corrija os campos em vermelho antes de salvar.' });
      return;
    }

    const lote: GastoEntrada[] = preenchidas.map((l) => ({
      data: normalizarData(l.data),
      categoria: l.categoria.trim(),
      subcategoria: l.subcategoria.trim(),
      motivo: l.motivo.trim(),
      valor: paraNumero(l.valor),
      descricao: l.descricao.trim(),
    }));

    setEnviando(true);
    try {
      const gravados = await criarGastos(lote);
      setLinhas([linhaVazia(preenchidas[preenchidas.length - 1])]);
      setTentouEnviar(false);
      setVersaoImportacao((v) => v + 1);
      setAviso({
        tipo: 'sucesso',
        texto: `${gravados.length} gasto(s) salvo(s), total de ${mascarar(formatarMoeda(total))}.`,
      });
    } catch (erro) {
      // A planilha grava tudo ou nada: as linhas continuam na tela para corrigir.
      setAviso({ tipo: 'erro', texto: erro instanceof Error ? erro.message : 'Não foi possível salvar.' });
    } finally {
      setEnviando(false);
    }
  };

  const classeCampo = (invalido: boolean) =>
    `w-full bg-gray-900 border ${invalido ? 'border-red-500/70' : 'border-gray-700'} rounded-lg px-2.5 py-2 text-xs text-gray-200 outline-none focus:border-blue-500`;
  const classeRotulo = 'block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-blue-400 tracking-wide">Lançar gastos</h1>
            {modoDemonstracao && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-amber-900/30 border border-amber-500/40 text-amber-300">
                Demonstração
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input ref={inputArquivo} type="file" accept=".xlsx,.xls,.csv" onChange={importarArquivo} className="hidden" />
            <button
              type="button"
              onClick={() => inputArquivo.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-bold uppercase tracking-wider"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Importar Excel
            </button>
            <button
              type="button"
              onClick={limparTudo}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 text-xs font-bold uppercase tracking-wider"
            >
              Limpar
            </button>
          </div>
        </div>

        {aviso && (
          <div className={`flex items-start gap-3 p-4 rounded-xl text-sm border ${
            aviso.tipo === 'sucesso'
              ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300'
              : 'bg-red-900/20 border-red-500/30 text-red-300'
          }`}>
            {aviso.tipo === 'sucesso'
              ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <span>{aviso.texto}</span>
          </div>
        )}

        <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-4 md:p-6 shadow-xl space-y-3">
          {linhas.map((linha, indice) => {
            const p = tentouEnviar ? problemasDaLinha(linha) : { valor: false, categoria: false, data: false };
            const ultima = indice === linhas.length - 1;

            return (
              <div
                key={`${linha.chave}-${versaoImportacao}`}
                className="grid grid-cols-2 md:grid-cols-12 gap-2 items-end bg-gray-900/40 border border-gray-700/40 rounded-xl p-3"
              >
                <div className="col-span-1 md:col-span-2">
                  <label className={classeRotulo}>Data</label>
                  <input
                    type="date"
                    value={linha.data}
                    onChange={(e) => atualizar(linha.chave, 'data', e.target.value)}
                    className={classeCampo(p.data)}
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className={classeRotulo}>Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={linha.valor}
                    onChange={(e) => atualizar(linha.chave, 'valor', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (ultima) adicionarLinha();
                      }
                    }}
                    placeholder="0,00"
                    className={classeCampo(p.valor)}
                  />
                </div>

                <div className="col-span-2 md:col-span-2">
                  <label className={classeRotulo}>Categoria</label>
                  <SeletorComOutro
                    compacto
                    opcoes={listas.categorias}
                    valor={linha.categoria}
                    invalido={p.categoria}
                    onChange={(v) => atualizar(linha.chave, 'categoria', v)}
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className={classeRotulo}>Sub-categoria</label>
                  <SeletorComOutro
                    compacto
                    opcoes={listas.subcategorias}
                    valor={linha.subcategoria}
                    placeholder="(opcional)"
                    onChange={(v) => atualizar(linha.chave, 'subcategoria', v)}
                  />
                </div>

                <div className="col-span-1 md:col-span-1">
                  <label className={classeRotulo}>Motivo</label>
                  <SeletorComOutro
                    compacto
                    opcoes={listas.motivos}
                    valor={linha.motivo}
                    placeholder="(opcional)"
                    onChange={(v) => atualizar(linha.chave, 'motivo', v)}
                  />
                </div>

                <div className="col-span-2 md:col-span-2">
                  <label className={classeRotulo}>Descrição</label>
                  <input
                    type="text"
                    value={linha.descricao}
                    onChange={(e) => atualizar(linha.chave, 'descricao', e.target.value)}
                    placeholder="(opcional)"
                    className={classeCampo(false)}
                  />
                </div>

                <div className="col-span-2 md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removerLinha(linha.chave)}
                    title="Remover linha"
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={adicionarLinha}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-600 text-gray-400 hover:text-blue-300 hover:border-blue-500/50 text-xs font-bold uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Adicionar linha
          </button>
          <p className="text-[11px] text-gray-500 text-center">
            Enter no campo de valor da última linha cria a próxima, já com a mesma data e categoria.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-800 border border-gray-700/50 rounded-2xl p-4 md:p-5 shadow-xl">
          <p className="text-sm text-gray-400">
            {preenchidas.length} gasto(s) · total{' '}
            <span className="text-white font-bold">{mascarar(formatarMoeda(total))}</span>
          </p>
          <button
            type="button"
            onClick={salvar}
            disabled={enviando || preenchidas.length === 0}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl text-sm disabled:opacity-50"
          >
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
            {enviando ? 'Salvando...' : 'Salvar gastos'}
          </button>
        </div>
      </div>
    </div>
  );
}