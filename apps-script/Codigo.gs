/**
 * Planejamento Financeiro — API da planilha
 *
 * Este script transforma a sua planilha no "servidor" do app. Nada sai daqui
 * sem o token, e o token fica nas Propriedades do Script, não na planilha.
 *
 * INSTALAÇÃO (uma vez só):
 *   1. Na planilha, menu Extensões → Apps Script.
 *   2. Cole este arquivo por cima do conteúdo existente e salve.
 *   3. Rode a função criarEstrutura (menu de funções → Executar).
 *      Autorize o acesso quando o Google pedir.
 *   4. Rode a função gerarToken e copie o token que aparecer no registro
 *      de execução (Ctrl+Enter abre o painel).
 *   5. Implantar → Nova implantação → Tipo: App da Web.
 *      Executar como: Eu.  Quem pode acessar: Qualquer pessoa.
 *      Copie a URL. É ela que vai no app, junto com o token.
 */

// ===========================================================================
// ESTRUTURA DAS ABAS
// ===========================================================================

var ABAS = {
  gastos: {
    nome: 'Gastos',
    colunas: ['id', 'data', 'categoria', 'subcategoria', 'motivo', 'valor', 'descricao', 'criado_em']
  },
  investimentos: {
    nome: 'Investimentos',
    colunas: ['id', 'data', 'caixa', 'operacao', 'valor', 'descricao', 'criado_em']
  },
  metas: {
    nome: 'Metas',
    colunas: ['categoria', 'valor_mensal']
  },
  listas: {
    nome: 'Listas',
    colunas: ['categorias', 'subcategorias', 'motivos']
  },
  config: {
    nome: 'Config',
    colunas: ['chave', 'valor']
  }
};

var CAIXAS = ['FUTURO', 'PESSOAL'];
var OPERACOES = ['APORTE', 'RESGATE'];

// ===========================================================================
// INSTALAÇÃO
// ===========================================================================

/**
 * Cria as cinco abas com cabeçalho e valores iniciais.
 * Abas que já existem são preservadas; só o cabeçalho é conferido.
 */
function criarEstrutura() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(ABAS).forEach(function (chave) {
    var definicao = ABAS[chave];
    var aba = planilha.getSheetByName(definicao.nome);

    if (!aba) {
      aba = planilha.insertSheet(definicao.nome);
    }

    aba.getRange(1, 1, 1, definicao.colunas.length).setValues([definicao.colunas]);
    aba.getRange(1, 1, 1, definicao.colunas.length).setFontWeight('bold');
    aba.setFrozenRows(1);
  });

  preencherIniciais_(planilha);

  SpreadsheetApp.getUi().alert(
    'Estrutura criada. Agora rode a função gerarToken e publique como App da Web.'
  );
}

function preencherIniciais_(planilha) {
  var listas = planilha.getSheetByName(ABAS.listas.nome);
  if (listas.getLastRow() <= 1) {
    var categorias = ['TRANSPORTE', 'ALIMENTAÇÃO', 'CUIDADOS PESSOAIS', 'ATIVIDADES FÍSICAS', 'LAZER', 'IMPREVISTOS'];
    var subcategorias = ['Carro', 'Uber', 'Restaurante', 'Lanche', 'Supermercado', 'Beleza', 'Remédio', 'Viagens', 'Eventos', 'Compras'];
    var motivos = ['PESSOAL', 'FAMILIA', 'AMIGOS', 'TRABALHO', 'GASOLINA'];

    var total = Math.max(categorias.length, subcategorias.length, motivos.length);
    var linhas = [];
    for (var i = 0; i < total; i++) {
      linhas.push([categorias[i] || '', subcategorias[i] || '', motivos[i] || '']);
    }
    listas.getRange(2, 1, linhas.length, 3).setValues(linhas);
  }

  var config = planilha.getSheetByName(ABAS.config.nome);
  if (config.getLastRow() <= 1) {
    config.getRange(2, 1, 2, 2).setValues([
      ['percentual_futuro', 70],
      ['titulo', 'Planejamento Financeiro']
    ]);
  }
}

/**
 * Sorteia um token novo e guarda nas Propriedades do Script.
 * O token aparece no registro de execução — copie de lá.
 */
function gerarToken() {
  var alfabeto = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var token = '';
  for (var i = 0; i < 40; i++) {
    token += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length));
  }

  PropertiesService.getScriptProperties().setProperty('TOKEN', token);
  Logger.log('Token gerado (copie esta linha inteira): ' + token);
  return token;
}

// ===========================================================================
// ENTRADAS HTTP
// ===========================================================================

function doGet(e) {
  try {
    conferirToken_(e && e.parameter ? e.parameter.token : '');
    return responder_(lerTudo_());
  } catch (erro) {
    return responder_({ ok: false, error: erro.message });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    var corpo = JSON.parse(e.postData.contents);
    conferirToken_(corpo.token);

    // Espera a vez em vez de deixar dois envios se sobreporem.
    if (!lock.tryLock(20000)) {
      throw new Error('A planilha está ocupada. Tente de novo em instantes.');
    }

    var resultado;
    switch (corpo.type) {
      case 'gasto':
        resultado = operarGasto_(corpo);
        break;
      case 'investimento':
        resultado = operarInvestimento_(corpo);
        break;
      case 'meta':
        resultado = operarMeta_(corpo);
        break;
      default:
        throw new Error('Tipo de registro desconhecido: ' + corpo.type);
    }

    return responder_(
      Array.isArray(resultado)
        ? { ok: true, registros: resultado }
        : { ok: true, registro: resultado }
    );
  } catch (erro) {
    return responder_({ ok: false, error: erro.message });
  } finally {
    try { lock.releaseLock(); } catch (ignorado) {}
  }
}

function conferirToken_(recebido) {
  var esperado = PropertiesService.getScriptProperties().getProperty('TOKEN');

  if (!esperado) {
    throw new Error('Token não configurado nesta planilha. Rode a função gerarToken.');
  }
  if (!recebido || recebido !== esperado) {
    throw new Error('Token inválido.');
  }
}

function responder_(objeto) {
  if (objeto.ok === undefined) {
    objeto.ok = true;
  }
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===========================================================================
// LEITURA
// ===========================================================================

function lerTudo_() {
  var listas = lerTabela_(ABAS.listas);

  return {
    ok: true,
    gastos: lerTabela_(ABAS.gastos),
    investimentos: lerTabela_(ABAS.investimentos),
    metas: lerTabela_(ABAS.metas),
    listas: {
      categorias: coluna_(listas, 'categorias'),
      subcategorias: coluna_(listas, 'subcategorias'),
      motivos: coluna_(listas, 'motivos')
    },
    config: lerConfig_()
  };
}

function aba_(definicao) {
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(definicao.nome);
  if (!aba) {
    throw new Error('Aba "' + definicao.nome + '" não encontrada. Rode a função criarEstrutura.');
  }
  return aba;
}

function lerTabela_(definicao) {
  var aba = aba_(definicao);
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  var valores = aba.getRange(2, 1, ultimaLinha - 1, definicao.colunas.length).getValues();

  return valores
    .map(function (linha) {
      var registro = {};
      definicao.colunas.forEach(function (coluna, i) {
        registro[coluna] = normalizar_(coluna, linha[i]);
      });
      return registro;
    })
    .filter(function (registro) {
      // Descarta linhas em branco deixadas por edição manual na planilha.
      return definicao.colunas.some(function (coluna) {
        return registro[coluna] !== '' && registro[coluna] !== null;
      });
    });
}

function normalizar_(coluna, valor) {
  if (valor instanceof Date) {
    var formato = coluna === 'criado_em' ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd';
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), formato);
  }
  if (coluna === 'valor' || coluna === 'valor_mensal') {
    return valor === '' || valor === null ? 0 : Number(valor);
  }
  return valor === null ? '' : valor;
}

function coluna_(linhas, nome) {
  var vistos = {};
  var resultado = [];

  linhas.forEach(function (linha) {
    var valor = (linha[nome] || '').toString().trim();
    if (valor && !vistos[valor]) {
      vistos[valor] = true;
      resultado.push(valor);
    }
  });

  return resultado;
}

function lerConfig_() {
  var config = {};
  lerTabela_(ABAS.config).forEach(function (linha) {
    var chave = (linha.chave || '').toString().trim();
    if (chave) config[chave] = linha.valor;
  });
  return config;
}

// ===========================================================================
// ESCRITA
// ===========================================================================

function operarGasto_(corpo) {
  if (corpo.action === 'delete') return apagarPorId_(ABAS.gastos, corpo.id);
  if (corpo.action === 'createMany') return criarVariosGastos_(corpo.data);

  var registro = montarGasto_(corpo.data || {});

  return corpo.action === 'update'
    ? atualizarPorId_(ABAS.gastos, corpo.id, registro)
    : criar_(ABAS.gastos, registro);
}

function montarGasto_(dados) {
  var registro = {
    data: exigirData_(dados.data),
    categoria: texto_(dados.categoria),
    subcategoria: texto_(dados.subcategoria),
    motivo: texto_(dados.motivo),
    valor: exigirValor_(dados.valor),
    descricao: texto_(dados.descricao)
  };

  if (!registro.categoria) {
    throw new Error('Informe a categoria do gasto.');
  }

  return registro;
}

/**
 * Lançamento em lote: valida todas as linhas antes de gravar qualquer uma.
 * Se alguma falhar, nada é escrito e o erro diz qual linha corrigir.
 * Grava tudo numa única operação, em vez de uma chamada por gasto.
 */
function criarVariosGastos_(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error('Nenhum gasto enviado.');
  }
  if (lista.length > 500) {
    throw new Error('Envie no máximo 500 gastos por vez.');
  }

  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  var registros = lista.map(function (dados, indice) {
    try {
      var registro = montarGasto_(dados || {});
      registro.id = Utilities.getUuid();
      registro.criado_em = agora;
      return registro;
    } catch (erro) {
      throw new Error('Linha ' + (indice + 1) + ': ' + erro.message);
    }
  });

  var colunas = ABAS.gastos.colunas;
  var linhas = registros.map(function (registro) {
    return colunas.map(function (coluna) {
      return registro[coluna] === undefined ? '' : registro[coluna];
    });
  });

  var aba = aba_(ABAS.gastos);
  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, colunas.length).setValues(linhas);

  return registros;
}

function operarInvestimento_(corpo) {
  if (corpo.action === 'delete') return apagarPorId_(ABAS.investimentos, corpo.id);

  var dados = corpo.data || {};
  var caixa = texto_(dados.caixa).toUpperCase();
  var operacao = texto_(dados.operacao).toUpperCase();

  if (CAIXAS.indexOf(caixa) === -1) {
    throw new Error('Caixa inválida. Use FUTURO ou PESSOAL.');
  }
  if (OPERACOES.indexOf(operacao) === -1) {
    throw new Error('Operação inválida. Use APORTE ou RESGATE.');
  }

  var registro = {
    data: exigirData_(dados.data),
    caixa: caixa,
    operacao: operacao,
    valor: exigirValor_(dados.valor),
    descricao: texto_(dados.descricao)
  };

  return corpo.action === 'update'
    ? atualizarPorId_(ABAS.investimentos, corpo.id, registro)
    : criar_(ABAS.investimentos, registro);
}

/** Metas não têm id: a chave é a categoria. */
function operarMeta_(corpo) {
  var definicao = ABAS.metas;
  var aba = aba_(definicao);
  var dados = corpo.data || {};
  var categoria = texto_(dados.categoria || corpo.id);

  if (!categoria) {
    throw new Error('Informe a categoria da meta.');
  }

  var linha = acharLinha_(aba, 1, categoria);

  if (corpo.action === 'delete') {
    if (linha === -1) throw new Error('Meta não encontrada: ' + categoria);
    aba.deleteRow(linha);
    return { categoria: categoria, removido: true };
  }

  var valorMensal = exigirValor_(dados.valor_mensal);

  if (linha === -1) {
    aba.appendRow([categoria, valorMensal]);
  } else {
    aba.getRange(linha, 1, 1, 2).setValues([[categoria, valorMensal]]);
  }

  return { categoria: categoria, valor_mensal: valorMensal };
}

function criar_(definicao, registro) {
  registro.id = Utilities.getUuid();
  registro.criado_em = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");

  var linha = definicao.colunas.map(function (coluna) {
    return registro[coluna] === undefined ? '' : registro[coluna];
  });

  aba_(definicao).appendRow(linha);
  return registro;
}

function atualizarPorId_(definicao, id, registro) {
  if (!id) throw new Error('Id do registro não informado.');

  var aba = aba_(definicao);
  var numeroLinha = acharLinha_(aba, 1, id);

  if (numeroLinha === -1) {
    throw new Error('Registro não encontrado. Recarregue os dados e tente de novo.');
  }

  var atual = aba.getRange(numeroLinha, 1, 1, definicao.colunas.length).getValues()[0];
  var atualizado = {};

  definicao.colunas.forEach(function (coluna, i) {
    if (coluna === 'id') {
      atualizado.id = id;
    } else if (coluna === 'criado_em') {
      atualizado.criado_em = normalizar_(coluna, atual[i]);
    } else {
      atualizado[coluna] = registro[coluna] === undefined ? normalizar_(coluna, atual[i]) : registro[coluna];
    }
  });

  var linha = definicao.colunas.map(function (coluna) {
    return atualizado[coluna];
  });

  aba.getRange(numeroLinha, 1, 1, definicao.colunas.length).setValues([linha]);
  return atualizado;
}

function apagarPorId_(definicao, id) {
  if (!id) throw new Error('Id do registro não informado.');

  var aba = aba_(definicao);
  var numeroLinha = acharLinha_(aba, 1, id);

  if (numeroLinha === -1) {
    throw new Error('Registro não encontrado. Recarregue os dados e tente de novo.');
  }

  aba.deleteRow(numeroLinha);
  return { id: id, removido: true };
}

function acharLinha_(aba, coluna, procurado) {
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return -1;

  var valores = aba.getRange(2, coluna, ultimaLinha - 1, 1).getValues();
  var alvo = procurado.toString().trim();

  for (var i = 0; i < valores.length; i++) {
    if (valores[i][0].toString().trim() === alvo) {
      return i + 2; // +2: a contagem começa em 1 e a linha 1 é o cabeçalho
    }
  }
  return -1;
}

// ===========================================================================
// VALIDAÇÃO
// ===========================================================================

function texto_(valor) {
  return valor === undefined || valor === null ? '' : valor.toString().trim();
}

function exigirValor_(valor) {
  var numero = Number(texto_(valor).replace(/\s/g, '').replace(',', '.'));

  if (isNaN(numero)) {
    throw new Error('Valor inválido: ' + valor);
  }
  if (numero < 0) {
    throw new Error('O valor não pode ser negativo.');
  }

  return Math.round(numero * 100) / 100;
}

function exigirData_(valor) {
  var texto = texto_(valor);

  if (!texto) {
    throw new Error('Informe a data.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    throw new Error('Data em formato inválido. Use AAAA-MM-DD.');
  }

  return texto;
}