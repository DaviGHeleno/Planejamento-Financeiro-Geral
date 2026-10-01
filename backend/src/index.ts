import express, { Request, Response } from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = '1gzBwu9IF9ZO6kPRWMGYJYzvSqArhyxB9_Fqck9tdkcA';

// Lógica para carregar credenciais da variável de ambiente no Render ou do arquivo local no PC
const auth = new google.auth.GoogleAuth({
  ...(process.env.GOOGLE_CREDENTIALS
    ? { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS) }
    : { keyFile: path.join(__dirname, '../credentials.json') }),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// ============================================================================
// FUNÇÃO AUXILIAR: TEXTO LIVRE SEGURO
// Impede que um texto colado pelo usuário vire fórmula na planilha
// (valueInputOption: USER_ENTERED interpreta =, +, - e @ como fórmula).
// ============================================================================
function textoSeguro(valor: unknown): string {
  const texto = (valor ?? '').toString().trim();
  if (texto === '') return '';
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

// ============================================================================
// RESPONSÁVEIS ACEITOS (evita montar nome de aba com texto arbitrário)
// ============================================================================
const RESPONSAVEIS_VALIDOS = ['Davi', 'Stella'];

// ============================================================================
// FUNÇÃO AUXILIAR: VALOR NO FORMATO DA PLANILHA (1.234,56)
// Aceita "123", "12,5", "12.5" e "1.234,56".
// ============================================================================
function formatarValorPlanilha(valor: unknown): string {
  const bruto = (valor ?? '').toString().replace('R$', '').trim();
  if (bruto === '') return '';

  let limpo = bruto.replace(/\s/g, '');

  if (limpo.includes(',')) {
    // Formato brasileiro: ponto é separador de milhar.
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  }

  const numero = parseFloat(limpo);
  if (isNaN(numero)) return '';

  return numero.toFixed(2).replace('.', ',');
}

// ============================================================================
// FUNÇÃO AUXILIAR: REGISTRO DE HISTÓRICO AUTOMÁTICO
// ============================================================================
async function registrarHistorico(acao: string, descricao: string, valor: string) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });

    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const horaFormatada = dataAtual.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const abaExiste = spreadsheetInfo.data.sheets?.some((s) => s.properties?.title === 'HISTORICO');

    if (!abaExiste) {
      // Cria a aba HISTORICO se não existir
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: 'HISTORICO' } } }],
        },
      });

      // Adiciona o cabeçalho
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "'HISTORICO'!A1:E1",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['DATA', 'HORA', 'AÇÃO', 'DESCRIÇÃO', 'VALOR']] },
      });
    }

    // Registra a nova linha no histórico
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'HISTORICO'!A2:E",
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[dataFormatada, horaFormatada, acao, descricao, valor]],
      },
    });
  } catch (error) {
    console.error('Erro ao salvar no histórico:', error);
  }
}
// ============================================================================


// 1. LER INVESTIMENTOS (Dashboard Completo com Reserva de Emergência e Casamento)
app.get('/api/investimentos/dashboard', async (req: Request, res: Response) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });
    
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: [
        'Investimentos!A3:W14', 
        'Investimentos!B21',     
        'Investimentos!C21',     
        'Investimentos!D21',     
        'Investimentos!E21',     
        'Investimentos!B23',     
      ],
    });

    const valueRanges = response.data.valueRanges || [];

    const daviFuturoTotal = valueRanges[1]?.values?.[0]?.[0] || 'R$ 0,00';
    const daviPresente = valueRanges[2]?.values?.[0]?.[0] || 'R$ 0,00';
    const stellaFuturoTotal = valueRanges[3]?.values?.[0]?.[0] || 'R$ 0,00';
    const stellaPessoal = valueRanges[4]?.values?.[0]?.[0] || 'R$ 0,00';
    const totalJuntos = valueRanges[5]?.values?.[0]?.[0] || 'R$ 0,00';

    const calcularFracoes = (valStr: string) => {
      const num = parseFloat(valStr.toString().replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
      const reserva = num * (1 / 3);
      const casamento = num * (2 / 3);
      return {
        reserva: reserva.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        casamento: casamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      };
    };

    const daviReserva = calcularFracoes(daviFuturoTotal).reserva;
    const daviCasamento = calcularFracoes(daviFuturoTotal).casamento;
    const stellaReserva = calcularFracoes(stellaFuturoTotal).reserva;
    const stellaCasamento = calcularFracoes(stellaFuturoTotal).casamento;

    res.json({
      historico: valueRanges[0]?.values || [],
      totais: {
        daviFuturo: daviFuturoTotal,
        daviReserva,
        daviCasamento,
        daviPresente,
        stellaFuturo: stellaFuturoTotal,
        stellaReserva,
        stellaCasamento,
        stellaPessoal,
        totalJuntos
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Erro ao ler dados de Investimentos.' });
  }
});

// 2. ESCREVER INVESTIMENTO (divisão padrão 70/30, ajustável) + HISTÓRICO COM SOMA
app.post('/api/investimento', async (req: Request, res: Response) => {
  try {
    const { ano, mes, responsavel, valor, percentualFuturo, valorFuturo, valorPessoal } = req.body;

    // Três formas de informar o aporte, nesta ordem de prioridade:
    // 1) valorFuturo + valorPessoal: valores exatos escolhidos na tela;
    // 2) valor + percentualFuturo: divisão por percentual;
    // 3) valor apenas: divisão padrão 70% Futuro / 30% Pessoal.
    const divisaoManual = valorFuturo !== undefined || valorPessoal !== undefined;

    let aporteFuturo = 0;
    let aportePessoal = 0;
    let descricaoDivisao = '';

    if (divisaoManual) {
      aporteFuturo = Number(valorFuturo || 0);
      aportePessoal = Number(valorPessoal || 0);

      if (isNaN(aporteFuturo) || isNaN(aportePessoal) || aporteFuturo < 0 || aportePessoal < 0) {
        return res.status(400).send({ error: 'Valores de Futuro e Pessoal inválidos.' });
      }

      if (aporteFuturo + aportePessoal <= 0) {
        return res.status(400).send({ error: 'Informe ao menos um valor maior que zero.' });
      }

      aporteFuturo = Number(aporteFuturo.toFixed(2));
      aportePessoal = Number(aportePessoal.toFixed(2));
      descricaoDivisao = 'divisão manual';
    } else {
      const valorAporte = Number(valor);
      if (isNaN(valorAporte) || valorAporte <= 0) {
        return res.status(400).send({ error: 'Valor de aporte inválido.' });
      }

      const percentual = percentualFuturo === undefined || percentualFuturo === null
        ? 70
        : Number(percentualFuturo);

      if (isNaN(percentual) || percentual < 0 || percentual > 100) {
        return res.status(400).send({ error: 'Percentual do Futuro inválido (use de 0 a 100).' });
      }

      aporteFuturo = Number(((valorAporte * percentual) / 100).toFixed(2));
      aportePessoal = Number((valorAporte - aporteFuturo).toFixed(2));
      descricaoDivisao = `Futuro ${percentual}% / Pessoal ${100 - percentual}%`;
    }

    const valorAporte = Number((aporteFuturo + aportePessoal).toFixed(2));

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const linhaMes = meses.indexOf(mes) + 3; 
    if (linhaMes < 3) return res.status(400).send({ error: 'Mês inválido' });

    let colFuturo = '';
    let colPessoal = '';

    if (ano === 2026) {
      if (responsavel === 'Davi') { colFuturo = 'H'; colPessoal = 'I'; }
      else if (responsavel === 'Stella') { colFuturo = 'J'; colPessoal = 'K'; }
    } else if (ano === 2025) {
      if (responsavel === 'Davi') { colFuturo = 'B'; colPessoal = 'C'; }
      else if (responsavel === 'Stella') { colFuturo = 'D'; colPessoal = 'E'; }
    } else if (ano === 2027) {
      if (responsavel === 'Davi') { colFuturo = 'L'; colPessoal = 'M'; }
      else if (responsavel === 'Stella') { colFuturo = 'N'; colPessoal = 'O'; }
    } else if (ano === 2028) {
      if (responsavel === 'Davi') { colFuturo = 'P'; colPessoal = 'Q'; }
      else if (responsavel === 'Stella') { colFuturo = 'R'; colPessoal = 'S'; }
    } else if (ano === 2029) {
      if (responsavel === 'Davi') { colFuturo = 'T'; colPessoal = 'U'; }
      else if (responsavel === 'Stella') { colFuturo = 'V'; colPessoal = 'W'; }
    }

    const rangeUpdate = `Investimentos!${colFuturo}${linhaMes}:${colPessoal}${linhaMes}`;
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });

      // LER OS VALORES ATUAIS DA PLANILHA ANTES DE SUBSTITUIR
    const leitura = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: rangeUpdate,
    });

    const valoresAtuais = leitura.data.values?.[0] || ['0', '0'];
    
    const valorFuturoAtual = parseFloat(valoresAtuais[0]?.toString().replace(/[R$\s.]/g, '').replace(',', '.') || '0');
    const valorPessoalAtual = parseFloat(valoresAtuais[1]?.toString().replace(/[R$\s.]/g, '').replace(',', '.') || '0');

    // 2. SOMAR O APORTE NOVO COM O VALOR EXISTENTE
    const novoValorFuturo = valorFuturoAtual + aporteFuturo;
    const novoValorPessoal = valorPessoalAtual + aportePessoal;

    // 3. ATUALIZAR A PLANILHA COM A SOMA TOTAL
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: rangeUpdate,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[novoValorFuturo, novoValorPessoal]] },
    });

    // Registra a ação no Histórico
    await registrarHistorico(
      'INVESTIMENTO',
      `${responsavel} realizou aporte referente a ${mes}/${ano}`,
      `R$ ${valorAporte.toFixed(2).replace('.', ',')} (${descricaoDivisao} — Futuro: R$ ${aporteFuturo.toFixed(2)} | Pessoal: R$ ${aportePessoal.toFixed(2)})`
    );

    res.json({
      message: 'Investimento registrado e somado!',
      // Acumulado da célula depois do aporte:
      valorFuturo: novoValorFuturo,
      valorPessoal: novoValorPessoal,
      // Quanto entrou agora:
      aporteFuturo,
      aportePessoal,
      aporteTotal: valorAporte,
    });
  } catch (error) {
    res.status(500).send({ error: 'Erro ao registrar investimento.' });
  }
});

// 2.1. ESCREVER RESGATE DE INVESTIMENTO (Subtração) + HISTÓRICO
app.post('/api/resgate', async (req: Request, res: Response) => {
  try {
    const { ano, mes, responsavel, tipo, valor } = req.body; 
    const valorResgate = Number(valor);

    if (isNaN(valorResgate) || valorResgate <= 0) {
      return res.status(400).send({ error: 'Valor de resgate inválido.' });
    }

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const linhaMes = meses.indexOf(mes) + 3; 
    if (linhaMes < 3) return res.status(400).send({ error: 'Mês inválido' });

    const mapaColunas: Record<number, { Davi: { Futuro: string, Pessoal: string }, Stella: { Futuro: string, Pessoal: string } }> = {
      2025: { Davi: { Futuro: 'B', Pessoal: 'C' }, Stella: { Futuro: 'D', Pessoal: 'E' } },
      2026: { Davi: { Futuro: 'H', Pessoal: 'I' }, Stella: { Futuro: 'J', Pessoal: 'K' } },
      2027: { Davi: { Futuro: 'L', Pessoal: 'M' }, Stella: { Futuro: 'N', Pessoal: 'O' } },
      2028: { Davi: { Futuro: 'P', Pessoal: 'Q' }, Stella: { Futuro: 'R', Pessoal: 'S' } },
      2029: { Davi: { Futuro: 'T', Pessoal: 'U' }, Stella: { Futuro: 'V', Pessoal: 'W' } },
    };

    const configAno = mapaColunas[Number(ano)];
    if (!configAno) return res.status(400).send({ error: 'Ano inválido' });

    const colunaAlvo = configAno[responsavel as 'Davi' | 'Stella']?.[tipo as 'Futuro' | 'Pessoal'];
    if (!colunaAlvo) return res.status(400).send({ error: 'Parâmetros inválidos' });

    const celulaAlvo = `Investimentos!${colunaAlvo}${linhaMes}`;
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });

    const leitura = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: celulaAlvo,
    });

    const valorAtualStr = leitura.data.values?.[0]?.[0] || '0';
    const valorAtualNum = parseFloat(valorAtualStr.toString().replace(/[R$\s.]/g, '').replace(',', '.')) || 0;

    const novoValor = valorAtualNum - valorResgate;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: celulaAlvo,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[novoValor]] },
    });

    // Registra a ação no Histórico
    await registrarHistorico(
      'RESGATE',
      `${responsavel} resgatou do saldo de ${tipo} referente a ${mes}/${ano}`,
      `- R$ ${valorResgate.toFixed(2).replace('.', ',')}`
    );

    res.json({ message: 'Resgate registrado com sucesso!', novoValor });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Erro ao registrar resgate.' });
  }
});

// 3. LER METAS MENSAIS
app.get('/api/metas/:responsavel/:ano', async (req: Request, res: Response) => {
  try {
    const { responsavel, ano } = req.params;
    const anoAbreviado = ano.length === 4 ? ano.slice(2) : ano;
    const aba = `Mensal ${anoAbreviado} - ${responsavel}`;
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${aba}'!A5:B12`, 
    });
    res.json({ metas: response.data.values || [] });
  } catch (error) {
    res.status(500).send({ error: 'Erro ao buscar metas.' });
  }
});

// 4. LER GASTOS
app.get('/api/gastos/:responsavel/:ano', async (req: Request, res: Response) => {
  try {
    const { responsavel, ano } = req.params; 
    const anoAbreviado = ano.length === 4 ? ano.slice(2) : ano; 
    const abaNome = `Mensal ${anoAbreviado} - ${responsavel}`; 

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });

    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const abaExiste = spreadsheetInfo.data.sheets?.some(
      (s) => s.properties?.title === abaNome
    );

    if (!abaExiste) {
      return res.json({ gastos: [] });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${abaNome}'!A48:F`,
    });

    const rows = response.data.values || [];
    
    // "linha" é o número real da linha na planilha (os dados começam em A48).
    // É o que permite editar o registro depois.
    const gastos = rows.map((row, indice) => ({
      linha: indice + 48,
      mes: row[0] || '',
      categoria: row[1] || '',
      subcategoria: row[2] || '',
      motivo: row[3] || '',
      valor: row[4] || '',
      descricao: row[5] || '',
    }));

    res.json({ gastos });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Erro ao buscar gastos da planilha.' });
  }
});

// 5. ESCREVER GASTOS EM LOTE + HISTÓRICO
app.post('/api/gasto', async (req: Request, res: Response) => {
  try {
    const { aba, itens } = req.body; 

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).send({ error: 'Nenhum gasto enviado para salvar.' });
    }
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });

    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const abaExiste = spreadsheetInfo.data.sheets?.some((s) => s.properties?.title === aba);

    if (!abaExiste) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: aba } } }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${aba}'!A47:F47`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['MES', 'CATEGORIA', 'SUB-CATEGORIA', 'MOTIVO', 'R$', 'DESCRIÇÃO']],
        },
      });
    }

    const linhasParaInserir = itens.map((item: any) => [
      item.mes,
      item.categoria,
      item.subcategoria,
      item.motivo,
      item.valor,
      textoSeguro(item.descricao)
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${aba}'!A48:F`, 
      valueInputOption: 'USER_ENTERED', 
      requestBody: {
        values: linhasParaInserir,
      },
    });

    // Calcula o valor total do lote para o histórico
    const totalLote = itens.reduce((acc: number, item: any) => {
      const val = parseFloat(item.valor.replace(/\./g, '').replace(',', '.')) || 0;
      return acc + val;
    }, 0);

    // Registra a ação no Histórico
    await registrarHistorico(
      'GASTO (LOTE)',
      `Lançados ${itens.length} gasto(s) na aba "${aba}"`,
      `R$ ${totalLote.toFixed(2).replace('.', ',')}`
    );

    res.json({ message: `${itens.length} gasto(s) adicionado(s) com sucesso!` });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Erro ao adicionar gastos.' });
  }
});

// 5.1. EDITAR UM GASTO JÁ LANÇADO
// Regrava uma única linha. Antes de escrever, confere se o conteúdo atual da
// planilha ainda é o mesmo que o front-end carregou — se alguém editou a
// planilha nesse meio-tempo, recusa em vez de sobrescrever.
app.put('/api/gasto', async (req: Request, res: Response) => {
  try {
    const { responsavel, ano, linha, original, novo } = req.body;

    if (!RESPONSAVEIS_VALIDOS.includes(responsavel)) {
      return res.status(400).send({ error: 'Responsável inválido.' });
    }

    const numeroLinha = Number(linha);
    if (!Number.isInteger(numeroLinha) || numeroLinha < 48) {
      return res.status(400).send({ error: 'Linha inválida.' });
    }

    if (!novo || !original) {
      return res.status(400).send({ error: 'Dados do gasto não enviados.' });
    }

    const anoAbreviado = (ano || '').toString().length === 4 ? ano.toString().slice(2) : (ano || '').toString();
    if (!/^[0-9]{2}$/.test(anoAbreviado)) {
      return res.status(400).send({ error: 'Ano inválido.' });
    }

    const abaNome = `Mensal ${anoAbreviado} - ${responsavel}`;

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });

    const atual = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${abaNome}'!A${numeroLinha}:F${numeroLinha}`,
    });

    const linhaAtual = (atual.data.values || [[]])[0] || [];
    const comparar = (valor: unknown) => (valor ?? '').toString().trim();

    const originalNaPlanilha = [
      comparar(linhaAtual[0]),
      comparar(linhaAtual[1]),
      comparar(linhaAtual[2]),
      comparar(linhaAtual[3]),
      comparar(linhaAtual[4]),
      comparar(linhaAtual[5]),
    ];

    const originalDoCliente = [
      comparar(original.mes),
      comparar(original.categoria),
      comparar(original.subcategoria),
      comparar(original.motivo),
      comparar(original.valor),
      comparar(original.descricao),
    ];

    const mudouPorFora = originalNaPlanilha.some((v, i) => v !== originalDoCliente[i]);

    if (mudouPorFora) {
      return res.status(409).send({
        error: 'Esta linha foi alterada na planilha depois que você carregou os dados. Recarregue o ano e tente de novo.',
      });
    }

    // Mantém o estilo da célula: se o valor original já tinha "R$", a edição
    // continua com "R$"; se não tinha, continua sem.
    const tinhaPrefixo = /^R\$/i.test(originalDoCliente[4]);
    const valorNumerico = formatarValorPlanilha(novo.valor);
    const valorFormatado = tinhaPrefixo && valorNumerico !== '' ? `R$ ${valorNumerico}` : valorNumerico;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${abaNome}'!A${numeroLinha}:F${numeroLinha}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          textoSeguro(novo.mes),
          textoSeguro(novo.categoria),
          textoSeguro(novo.subcategoria),
          textoSeguro(novo.motivo),
          valorFormatado,
          textoSeguro(novo.descricao),
        ]],
      },
    });

    await registrarHistorico(
      'GASTO (EDIÇÃO)',
      `Linha ${numeroLinha} da aba "${abaNome}": de [${originalDoCliente.slice(0, 5).join(' | ')}] para [${comparar(novo.mes)} | ${comparar(novo.categoria)} | ${comparar(novo.subcategoria)} | ${comparar(novo.motivo)} | ${valorFormatado}]`,
      `R$ ${valorFormatado}`
    );

    res.json({
      message: 'Gasto atualizado com sucesso!',
      gasto: {
        linha: numeroLinha,
        mes: comparar(novo.mes),
        categoria: comparar(novo.categoria),
        subcategoria: comparar(novo.subcategoria),
        motivo: comparar(novo.motivo),
        valor: valorFormatado,
        descricao: comparar(novo.descricao),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Erro ao atualizar o gasto.' });
  }
});

// 5.2. EXCLUIR UM GASTO
// Apaga a linha inteira da planilha (as linhas de baixo sobem uma posição).
// Confere o conteúdo atual antes de apagar, para não excluir a linha errada
// caso a planilha tenha sido mexida depois do carregamento.
app.delete('/api/gasto', async (req: Request, res: Response) => {
  try {
    const { responsavel, ano, linha, original } = req.body;

    if (!RESPONSAVEIS_VALIDOS.includes(responsavel)) {
      return res.status(400).send({ error: 'Responsável inválido.' });
    }

    const numeroLinha = Number(linha);
    if (!Number.isInteger(numeroLinha) || numeroLinha < 48) {
      return res.status(400).send({ error: 'Linha inválida.' });
    }

    if (!original) {
      return res.status(400).send({ error: 'Dados do gasto não enviados.' });
    }

    const anoAbreviado = (ano || '').toString().length === 4 ? ano.toString().slice(2) : (ano || '').toString();
    if (!/^[0-9]{2}$/.test(anoAbreviado)) {
      return res.status(400).send({ error: 'Ano inválido.' });
    }

    const abaNome = `Mensal ${anoAbreviado} - ${responsavel}`;

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });

    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const aba = spreadsheetInfo.data.sheets?.find((s) => s.properties?.title === abaNome);

    if (!aba || aba.properties?.sheetId === undefined || aba.properties?.sheetId === null) {
      return res.status(404).send({ error: `Aba "${abaNome}" não encontrada.` });
    }

    const atual = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${abaNome}'!A${numeroLinha}:F${numeroLinha}`,
    });

    const linhaAtual = (atual.data.values || [[]])[0] || [];
    const comparar = (valor: unknown) => (valor ?? '').toString().trim();

    const campos: Array<'mes' | 'categoria' | 'subcategoria' | 'motivo' | 'valor' | 'descricao'> =
      ['mes', 'categoria', 'subcategoria', 'motivo', 'valor', 'descricao'];

    const mudouPorFora = campos.some(
      (campo, i) => comparar(linhaAtual[i]) !== comparar(original[campo])
    );

    if (mudouPorFora) {
      return res.status(409).send({
        error: 'Esta linha foi alterada na planilha depois que você carregou os dados. Recarregue o ano e tente de novo.',
      });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: aba.properties.sheetId,
                dimension: 'ROWS',
                startIndex: numeroLinha - 1, // a API conta a partir do zero
                endIndex: numeroLinha,
              },
            },
          },
        ],
      },
    });

    await registrarHistorico(
      'GASTO (EXCLUSÃO)',
      `Linha ${numeroLinha} da aba "${abaNome}" excluída: [${campos.slice(0, 5).map((c) => comparar(original[c])).join(' | ')}]`,
      `R$ ${comparar(original.valor).replace(/^R\$\s*/i, '')}`
    );

    res.json({ message: 'Gasto excluído com sucesso!', linha: numeroLinha });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Erro ao excluir o gasto.' });
  }
});

// 6. LER OBJETIVOS (Bucket List / Lista de Sonhos)
app.get('/api/objetivos', async (req: Request, res: Response) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });
    
    // Lê as colunas A e B a partir da linha 2 (ignorando o título da A1:B1)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'OBJETIVOS!A2:B', 
    });

    res.json({ data: response.data.values || [] });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Erro ao ler Objetivos.' });
  }
});

// 6.1. ATUALIZAR STATUS DO OBJETIVO (Marcar/Desmarcar)
app.post('/api/objetivos/toggle', async (req: Request, res: Response) => {
  try {
    const { index, concluido } = req.body;
    
    // Como lemos a partir da linha 2 (A2), o index 0 do array corresponde à linha 2 na planilha.
    const linhaSheets = Number(index) + 2; 
    const rangeUpdate = `OBJETIVOS!A${linhaSheets}`;
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: rangeUpdate,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[concluido ? 'TRUE' : 'FALSE']] },
    });

    res.json({ message: 'Objetivo atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar objetivo:', error);
    res.status(500).send({ error: 'Erro ao atualizar objetivo.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});