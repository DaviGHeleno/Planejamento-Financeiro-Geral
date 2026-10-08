# Planejamento Financeiro

Controle de gastos e investimentos pessoais. Os dados ficam numa planilha do
Google da própria pessoa — este site não guarda nada.

## Como funciona

O site é estático e não tem servidor próprio. Cada usuário publica um Google
Apps Script na própria planilha, e o site conversa direto com ela, usando uma
URL e um token que ficam guardados só no navegador de quem usa.

```
navegador ──► Apps Script ──► planilha do usuário
```

Sem configurar nada, o app abre em modo demonstração, com dados fictícios.

## Instalação para quem vai usar

1. **Criar a planilha.** Abra [sheets.new](https://sheets.new) e dê um nome,
   por exemplo "Planejamento Financeiro".

2. **Abrir o editor de script.** Na planilha, menu **Extensões → Apps Script**.

3. **Colar o script.** Apague o conteúdo do `Código.gs`, cole o arquivo
   [`apps-script/Codigo.gs`](apps-script/Codigo.gs) deste repositório e salve
   com Ctrl+S.

4. **Criar as abas.** Na barra do editor, escolha a função `criarEstrutura` e
   clique em **Executar**. O Google vai pedir autorização: Revisar permissões
   → sua conta → Avançado → Acessar projeto → Permitir. É o aviso normal de
   script próprio.

5. **Gerar o token.** Escolha a função `gerarToken`, clique em **Executar** e
   abra o registro de execução (Ctrl+Enter). Copie o token que aparece — ele é
   a senha da sua planilha.

6. **Publicar.** Clique em **Implantar → Nova implantação**, escolha o tipo
   **App da Web**, com "Executar como: Eu" e "Quem pode acessar: Qualquer
   pessoa". Copie a URL, que termina em `/exec`.

7. **Conectar.** Abra o site, clique em **Conectar planilha** na barra lateral
   e cole a URL e o token.

## Estrutura da planilha

O script cria cinco abas. Todas têm cabeçalho na linha 1 e dados a partir da 2.

| Aba | Colunas |
|---|---|
| `Gastos` | id, data, categoria, subcategoria, motivo, valor, descricao, criado_em |
| `Investimentos` | id, data, caixa, operacao, valor, descricao, criado_em |
| `Metas` | categoria, valor_mensal |
| `Listas` | categorias, subcategorias, motivos |
| `Config` | chave, valor |

- `caixa` é `FUTURO` ou `PESSOAL`; `operacao` é `APORTE` ou `RESGATE`. O saldo
  é sempre calculado a partir dos lançamentos.
- `Listas` alimenta os menus dos formulários. Edite direto na planilha para
  mudar as opções; valores fora da lista continuam possíveis pelo "Outro…".
- `Metas` define o planejado por categoria, usado no gráfico de comparação.
- `Config` aceita `percentual_futuro` (divisão padrão do aporte, 70) e
  `titulo` (nome exibido na barra lateral).

Se mexer na planilha, mantenha os cabeçalhos. A ordem das linhas pode ser
alterada à vontade: cada registro é localizado pelo `id`, não pela posição.

## Rodando o site localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3001`.

## Publicando

Qualquer host de site estático serve. Na Vercel, basta importar o repositório
— não há variável de ambiente nem segredo a configurar, já que a conexão de
cada pessoa fica no navegador dela.

## Estrutura do código

```
src/
├── app/            telas (investimentos, gastos, resumo)
├── components/     estado global e componentes compartilhados
└── lib/            funções puras: formatação, cálculos, cliente da API
```

As telas não fazem requisições: pedem os dados ao `DadosContext`, que carrega
tudo numa chamada só e mantém em memória. Quem fala com a rede é o `lib/api.ts`.

## Atualizando o script depois

Ao trocar o `Codigo.gs` por uma versão nova, vá em **Implantar → Gerenciar
implantações**, clique no lápis, escolha **Nova versão** e implante. Assim a
URL continua a mesma e não é preciso reconectar o site.