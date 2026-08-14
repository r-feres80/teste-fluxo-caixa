# Plano de Teste — Fluxo de Caixa (Casa da Luz Divina)

Escopo: `index.html`, cobertura de regressão de tudo que já existe hoje (sem
feature nova). Cada item tem um id curto, o passo exato e o resultado
esperado. Um item só pode ser marcado `[x]` por quem executou o passo ao
vivo no navegador (via Playwright) e anexou print + saída crua de
console/rede. Ninguém marca o próprio item que implementou.

## Nota de execução — dependência externa

O app busca dados ao vivo de uma planilha Google Sheets publicada
(`CSV_URL`, linha 329 do `index.html`). Esse domínio (`docs.google.com`)
**não é alcançável** a partir do ambiente sandbox onde este projeto roda
(confirmado: `curl` retorna `403` no proxy de saída). Isso significa:

- Testar contra a rede real é impossível neste ambiente e, mesmo que fosse
  possível, os dados da planilha mudam com o tempo — o teste não seria
  determinístico.
- Os itens de sincronização (`SYNC-*`) exigem interceptar a requisição de
  rede via `page.route()` do Playwright para controlar o que a "API"
  (a URL do CSV) responde: sucesso com CSV fixo, atraso, erro, resposta
  vazia/malformada. **Isso não é mock da funcionalidade sob teste** — é
  controle do único limite de I/O externo do app. O agente de QA continua
  interagindo com a página real, tirando prints reais e coletando
  console/rede reais; nada na verificação em si é simulado.
- Fixture de CSV de referência para os testes deve ficar em
  `tests/fixtures/sheet-fixture.csv` com pelo menos 2 anos e 3+ meses de
  dados, incluindo pelo menos um mês com saldo negativo e um com todas as
  categorias de despesa presentes.

## Bug conhecido encontrado durante o mapeamento (pré-existente)

Ao ler o `index.html` linha a linha para montar este plano, foi encontrado
um defeito real já existente no arquivo, não relacionado a nenhuma
mudança recente:

- Linha 651 tem uma tag malformada `</html;` (sem `>`, com `;`) em vez de
  `</html>`.
- Depois dela, o arquivo contém uma **segunda cópia completa** de boa
  parte do `<script>` (funções `renderPainel`, `renderMensal`, `addEntry`,
  `delEntry`, `compCards`, `compChart`, `compTable`, `renderCompMes`,
  `renderCompAno`, `renderCompCat`, `renderLancamentos`, `exportMensal`,
  `exportLancamentos`, `dl`) e uma segunda chamada solta de `syncData();`
  e `setInterval(syncData,10*60*1000);` (linhas 809-810, duplicando
  647-648).
- Efeito prático: `syncData()` roda duas vezes no carregamento da página
  (duas requisições à planilha em paralelo) e dois `setInterval`
  independentes de 10 minutos ficam ativos ao mesmo tempo — daí em diante
  a sincronização automática dispara em dobro. A tag `</html;` malformada
  também deixa o HTML fora do padrão, com risco de parsing inconsistente
  entre navegadores.
- Este plano inclui itens (`BUG-01`, `BUG-02`) para verificar a correção,
  que será feita na Fase 2 (implementação), sem tocar neste documento.

---

## 1. Sincronização e carregamento inicial (SYNC)

- [ ] **SYNC-01** Abrir a página pela primeira vez (sem cache no
  localStorage) com a requisição do CSV respondendo com sucesso e dados
  válidos → overlay de carregamento ("Carregando dados da planilha...")
  aparece imediatamente e depois some; barra de sincronização fica com
  ponto verde e texto "Sincronizado: HH:MM:SS (N registros)".
- [ ] **SYNC-02** Mesma condição do SYNC-01, mas medindo a rede → **apenas
  uma** requisição HTTP é feita para `CSV_URL` (não duas).
- [ ] **SYNC-03** Abrir a página com a requisição do CSV demorando vários
  segundos para responder → overlay de carregamento permanece visível com
  o spinner girando e o texto "Conectando ao Google Sheets" durante toda a
  espera; nenhum dado parcial ou tela quebrada aparece antes da resposta.
- [ ] **SYNC-04** Abrir a página com a requisição do CSV falhando
  (network error/abort) e **sem** cache prévio no localStorage → overlay
  some, barra de sincronização fica com ponto vermelho e mensagem
  "Erro: <mensagem>"; painel carrega vazio (sem lançamentos), sem
  travar/quebrar a UI.
- [ ] **SYNC-05** Abrir a página com a requisição do CSV falhando, mas
  **com** cache válido salvo de uma sessão anterior → overlay some, ponto
  fica vermelho, mensagem mostra "Cache de DD/MM/AAAA — <erro>"; os dados
  do cache aparecem normalmente no painel/tabelas.
- [ ] **SYNC-06** Requisição do CSV responde 200 mas com corpo vazio/sem
  linhas válidas → mesmo comportamento de erro do SYNC-04/05 (cai no
  `throw new Error("Sem dados")`), sem exceção não tratada no console.
- [ ] **SYNC-07** Clicar no botão "↻ Atualizar" da barra de sincronização
  → overlay de carregamento NÃO reaparece (ele só existe no HTML inicial;
  `syncData()` chamado manualmente não deve travar a tela), ponto muda
  para amarelo/"loading" durante a chamada e volta a verde/vermelho ao
  concluir.
- [ ] **SYNC-08** Verificar, com a página aberta por tempo controlado
  (mockando o timer ou lendo o código), que existe **exatamente um**
  `setInterval` de sincronização automática registrado, não dois.

## 2. Navegação entre abas (NAV)

- [ ] **NAV-01** Ao carregar a página, a aba "■ Painel" já vem marcada
  como ativa (destaque amarelo) e o conteúdo do painel é o único visível.
- [ ] **NAV-02** Clicar em "📅 Mes Corrente" → aba anterior perde o
  destaque, esta fica destacada, conteúdo do painel some e o de Mês
  Corrente aparece com dados do mês atual carregados.
- [ ] **NAV-03** Clicar em "📈 Comparativo" → sub-abas internas aparecem
  ("Mes a Mes" ativa por padrão) e os 3 gráficos/tabelas de comparação são
  renderizados sem erro no console.
- [ ] **NAV-04** Clicar em "📋 Lancamentos" → tabela geral de lançamentos
  do mês atual aparece, com contagem de registros correta no cabeçalho.
- [ ] **NAV-05** Alternar entre as 4 abas repetidamente (Painel → Mensal →
  Comparativo → Lançamentos → Painel) → nunca fica mais de uma `.page`
  visível ao mesmo tempo; nunca fica nenhuma visível.
- [ ] **NAV-06** Dentro de "Comparativo", clicar nas 3 sub-abas ("Mes a
  Mes", "Ano a Ano", "Por Categoria") → apenas uma `.inner-page` fica
  visível por vez, com destaque correspondente na sub-aba clicada.

## 3. Painel (PAINEL)

- [ ] **PAINEL-01** Com o filtro "Mes" em "Todos", os cards de Total
  Entradas/Saídas/Saldo somam exatamente os valores de todos os meses do
  ano selecionado (conferir contra a fixture de CSV usada).
- [ ] **PAINEL-02** Trocar o filtro "Ano" → tabela, cards e os dois
  gráficos (evolução mensal, despesas por categoria) são recalculados
  para o novo ano, sem misturar dados do ano anterior.
- [ ] **PAINEL-03** Trocar o filtro "Mes" para um mês específico → título
  "Demonstrativo Financeiro — <Mês>/<Ano>" aparece; cards/tabela passam a
  refletir só aquele mês.
- [ ] **PAINEL-04** Card "Saldo do Ano" fica com a cor azul quando o saldo
  é ≥ 0 e vermelha quando é negativo; o texto abaixo diz "Superavit" ou
  "Deficit" de acordo.
- [ ] **PAINEL-05** Card "Melhor Mes" mostra o mês de maior saldo dentro
  do filtro atual e o valor desse saldo — conferir contra o cálculo manual
  na fixture.
- [ ] **PAINEL-06** Selecionar um Ano que não existe nos dados (ex.: ano
  sem nenhum lançamento) → cards mostram "R$ 0,00", tabela fica vazia,
  gráficos não quebram (não desenham nada, sem lançar exceção no console).
- [ ] **PAINEL-07** Clicar em "🖶 Imprimir" → o preview de impressão do
  navegador abre (verificar evento `window.print` disparado); elementos
  marcados `display:none` no `@media print` (topbar, sync-bar, toolbar,
  add-form, botões) não aparecem no preview.
- [ ] **PAINEL-08** Linha TOTAL do rodapé da tabela de resumo mensal bate
  exatamente com a soma das linhas do corpo da tabela.

## 4. Mês Corrente — visualização (MES)

- [ ] **MES-01** Ao entrar na aba, o campo "Mes/Ano" já vem preenchido com
  o mês/ano atual e os dados exibidos correspondem a esse mês.
- [ ] **MES-02** Trocar o mês no seletor → cards, tabela de lançamentos,
  resumo e gráfico de evolução do saldo são todos recalculados para o novo
  mês.
- [ ] **MES-03** Selecionar um mês sem nenhum lançamento → cards mostram
  "R$ 0,00"/"-", tabela fica vazia, gráfico de saldo não é desenhado (sem
  erro no console).
- [ ] **MES-04** Cards de categoria (Aluguel, Saneamento, Energia,
  Pagamentos) mostram "-" quando o valor da categoria é zero no mês, e o
  valor formatado quando > 0.
- [ ] **MES-05** Coluna "Saldo (R$)" da tabela é o saldo acumulado
  linha-a-linha em ordem cronológica (não o saldo do mês inteiro
  repetido).
- [ ] **MES-06** Clicar em "↓ Exportar CSV" → um arquivo `fluxo-<mês>.csv`
  é baixado, com cabeçalho `Data,Historico,Categoria,Entrada,Saida,Saldo`
  e uma linha por lançamento do mês, saldo acumulado batendo com o exibido
  na tela.
- [ ] **MES-07** Exportar CSV de um mês sem lançamentos → arquivo é
  baixado só com o cabeçalho, sem erro.

## 5. Mês Corrente — adicionar lançamento (ADD)

- [ ] **ADD-01** Preencher Data, Histórico, Categoria e Valor válidos e
  clicar "+ Adicionar" → linha nova aparece na tabela do mês, cards e
  painel são recalculados, os campos Histórico e Valor voltam a ficar
  vazios (Data mantém o valor preenchido).
- [ ] **ADD-02** Clicar "+ Adicionar" com **todos os campos vazios**
  (Data também vazia) → `alert("Preencha todos os campos!")` aparece;
  nenhuma linha é adicionada à tabela nem ao localStorage.
- [ ] **ADD-03** Preencher tudo, mas deixar **Histórico vazio** (só
  espaços em branco) → alerta de validação dispara (o código faz
  `.trim()`), nada é salvo.
- [ ] **ADD-04** Deixar **Valor vazio** e tentar adicionar → alerta
  dispara (`parseFloat("")` é `NaN`), nada é salvo.
- [ ] **ADD-05** Digitar **0** no campo Valor e tentar adicionar → alerta
  dispara (`val<=0`), nada é salvo.
- [ ] **ADD-06** Digitar **valor negativo** (ex.: `-50`) no campo Valor e
  tentar adicionar → alerta dispara, nada é salvo.
- [ ] **ADD-07** Tentar digitar **texto não numérico** (ex.: `abc`) no
  campo Valor (`type="number"`) → o navegador não aceita o caractere (o
  campo permanece vazio) ou, se aceitar via paste, o clique em Adicionar
  dispara o alerta de validação; em nenhum caso um lançamento inválido é
  salvo.
- [ ] **ADD-08** Selecionar categoria "Receitas" e adicionar um valor →
  lançamento aparece como Entrada (verde) na coluna correta, não como
  Saída.
- [ ] **ADD-09** Selecionar qualquer categoria de despesa (Aluguel,
  Saneamento, Energia, Pagamentos) e adicionar → lançamento aparece como
  Saída (vermelho), e o card daquela categoria específica é atualizado.
- [ ] **ADD-10** Adicionar um lançamento com Histórico no limite de 70
  caracteres (`maxlength="70"`) → salva o texto completo; tentar digitar
  além do limite não deixa o campo ultrapassar 70 caracteres.
- [ ] **ADD-11** Duplo clique rápido em "+ Adicionar" com o formulário
  preenchido uma única vez → apenas **um** lançamento é criado (o segundo
  clique acontece com os campos já limpos pelo primeiro clique e deve
  cair na validação de campos vazios, não duplicar o registro).
- [ ] **ADD-12** Adicionar dois lançamentos com **exatamente os mesmos**
  data/descrição/categoria/valor (duplicata proposital) → ambos são
  salvos como linhas separadas (o app não bloqueia duplicatas); os dois
  aparecem na tabela e entram na soma dos cards.
- [ ] **ADD-13** Adicionar um lançamento e recarregar a página (F5) →
  o lançamento continua aparecendo (persistido em `localStorage`), mesmo
  após a nova sincronização com a planilha rodar de novo no reload.

## 6. Mês Corrente / Lançamentos — excluir lançamento (DEL)

- [ ] **DEL-01** Um lançamento **adicionado manualmente** (via ADD) mostra
  um botão "x" na última coluna da tabela.
- [ ] **DEL-02** Um lançamento **vindo da planilha** (não adicionado
  manualmente) **não** mostra botão de excluir.
- [ ] **DEL-03** Clicar no "x" de um lançamento manual → a linha some da
  tabela imediatamente, cards/painel recalculam, e o item some também do
  `localStorage` (conferir que não reaparece após F5).
- [ ] **DEL-04** Excluir o último/único lançamento manual do mês → tabela
  e resumo voltam ao estado "sem lançamentos manuais" (só os da planilha,
  se houver, permanecem).

## 7. Comparativo (COMP)

- [ ] **COMP-01** Sub-aba "Mês a Mês": trocar Ano, Mês base e "Comparar
  com" → cards, gráfico de barras e tabela detalhada atualizam para os
  dois meses selecionados.
- [ ] **COMP-02** Comparar um mês com saldo melhor contra um com saldo
  pior → a coluna "Variação"/badge de saldo usa a cor de "melhora"
  (verde) para o lado melhor e "piora" (vermelho) para o lado pior,
  coerente com o sinal calculado no código (`comp-better`/`comp-worse`).
- [ ] **COMP-03** Comparar dois meses onde um dos dois tem uma categoria
  zerada (ex.: sem Energia) → linha daquela categoria na tabela mostra
  "-" ou 0 coerentemente, sem gerar `NaN%` na coluna de percentual quando
  o valor de referência é 0 (checar o `"--"` do código para `v2===0`).
- [ ] **COMP-04** Sub-aba "Ano a Ano": trocar Mês, Ano base e "Comparar
  com" → mesmo comportamento do COMP-01, agora comparando o mesmo mês em
  dois anos diferentes.
- [ ] **COMP-05** Sub-aba "Por Categoria": trocar o Ano → gráfico de
  barras por categoria ao longo dos meses e a tabela de resumo por
  categoria são recalculados; categorias com total zero no ano inteiro
  não aparecem na tabela (o código faz `if(tot===0)return`).
- [ ] **COMP-06** Selecionar, em qualquer sub-aba, dois períodos idênticos
  (ex.: comparar Janeiro com Janeiro) → cards e tabela mostram diferença
  zero em tudo, sem erro.

## 8. Lançamentos — filtros e exportação (LANC)

- [ ] **LANC-01** Trocar o campo "Período" → tabela e contador "N
  registros" atualizam para o novo mês.
- [ ] **LANC-02** Filtrar por uma "Categoria" específica → só linhas
  daquela categoria aparecem; contador reflete a quantidade filtrada.
- [ ] **LANC-03** Digitar um termo no campo "Buscar" que **não** existe em
  nenhuma descrição do período → tabela fica vazia, contador mostra "0
  registros", sem erro no console.
- [ ] **LANC-04** Buscar um termo em **caixa alta/baixa diferente** do
  texto salvo (ex.: "ALUGUEL" vs "aluguel") → resultado aparece igual (a
  busca usa `toLowerCase()` nos dois lados).
- [ ] **LANC-05** Combinar Categoria + Busca ao mesmo tempo → filtros são
  aplicados em conjunto (AND), não isoladamente.
- [ ] **LANC-06** Clicar "↓ Exportar CSV" com um filtro de categoria/busca
  ativo → **checar se o CSV exportado ignora os filtros de tela** (o
  código de `exportLancamentos` usa só o filtro de mês, não categoria nem
  busca) — documentar o comportamento real observado, é uma pegadinha não
  óbvia.
- [ ] **LANC-07** Excluir um lançamento manual diretamente pela tela de
  Lançamentos (botão "x") → linha some e a tabela de Mês Corrente
  reflete a exclusão ao navegar até lá (mesmo estado compartilhado).

## 9. Ciclo de vida da página (PERSIST)

- [ ] **PERSIST-01** Adicionar um lançamento, trocar de aba, e recarregar
  a página (F5) → volta para a aba "Painel" (não lembra a aba anterior,
  já que não há estado de rota na URL); dado adicionado continua
  presente.
- [ ] **PERSIST-02** Recarregar a página **no meio do preenchimento** do
  formulário de novo lançamento (campos parcialmente preenchidos, sem
  clicar Adicionar) → após o reload, formulário volta ao estado padrão
  (Data = hoje, demais campos vazios); nada do que estava sendo digitado
  é salvo (comportamento esperado, sem crash).
- [ ] **PERSIST-03** Clicar o botão "Voltar" do navegador depois de trocar
  de aba dentro do app → como a navegação entre abas não usa URL/hash,
  "Voltar" não deve deixar a UI num estado inconsistente (ou sai do app
  para a página anterior do histórico do navegador, ou não faz nada
  perceptível dentro da SPA — documentar qual dos dois acontece de fato).
- [ ] **PERSIST-04** Abrir o app em duas abas do navegador e adicionar um
  lançamento em uma delas → a outra aba só reflete a mudança após um
  reload/nova leitura do `localStorage` (não há sincronização em tempo
  real entre abas) — documentar como comportamento esperado.

## 10. Teclado e foco (KEY)

- [ ] **KEY-01** Usar Tab a partir do campo "Data" do formulário de novo
  lançamento → foco percorre Histórico → Categoria → Valor → botão
  Adicionar, em ordem lógica, sem pular campo nem cair fora do formulário.
- [ ] **KEY-02** Preencher o formulário e apertar Enter dentro do campo
  Valor → **documentar o comportamento real**: como os campos não estão
  dentro de uma tag `<form>`, Enter não deve submeter automaticamente
  (diferente do que um usuário poderia esperar) — confirmar se é
  exatamente isso que acontece.
- [ ] **KEY-03** Navegar até o botão "+ Adicionar" só com o teclado (Tab)
  e ativar com Enter/Espaço → tem o mesmo efeito do clique do mouse.
- [ ] **KEY-04** Navegar pelas abas principais (nav-btn) só com Tab +
  Enter → cada aba responde a Enter exatamente como ao clique.

## 11. Casos extremos e resiliência (EDGE)

- [ ] **EDGE-01** Lista de anos/meses totalmente vazia (fixture de CSV
  sem nenhuma linha válida, sync cai em erro e sem cache) → seletores de
  Ano/Mês ficam vazios, mas a página não trava (sem exceção não tratada
  no console) e todas as abas continuam navegáveis.
- [ ] **EDGE-02** CSV da planilha com uma linha de valor **zero**
  (`0,00`) → `parseFloat` calcula `0`; o item deve ser tratado como saída
  (valor não é `>0`) e não deve quebrar o total nem gerar `NaN` em
  nenhuma soma.
- [ ] **EDGE-03** CSV com uma linha de **valor negativo explícito** vindo
  da planilha (ex.: `-150,00`) → conferir o comportamento real de
  `parseCSV`: o valor é tratado como saída pelo sinal e depois armazenado
  como `Math.abs(valor)` — confirmar que o card de Saídas soma
  corretamente e não aparece um número negativo duplicado em nenhum
  lugar.
- [ ] **EDGE-04** CSV com uma linha de **data inválida** (não bate com
  `dd/mm/aaaa`, ex.: campo vazio ou formato `mm-dd-aaaa`) → a linha é
  descartada pelo `parseCSV` (`continue`), sem quebrar o parse das
  demais linhas nem lançar exceção.
- [ ] **EDGE-05** CSV com uma linha faltando colunas (menos de 4 colunas)
  → linha é ignorada (`if(cols.length<4) continue`), resto do CSV
  processa normalmente.
- [ ] **EDGE-06** Descrição de lançamento vinda do CSV maior que 70
  caracteres → é cortada em 70 (`substring(0,70)`) na exibição, sem
  quebrar o layout da tabela.
- [ ] **EDGE-07** Nenhum lançamento manual e nenhum dado de planilha
  (listas totalmente vazias em todas as telas) → todas as 4 abas abrem
  sem erro, mostrando estado "zerado" (cards em R$ 0,00, tabelas vazias),
  nenhuma delas quebra o layout.
- [ ] **EDGE-08** Simular resposta de rede lenta (vários segundos de
  atraso) ao clicar "Atualizar" → botão continua clicável (não trava a
  aba do navegador), o ponto de sync mostra o estado "loading" durante
  toda a espera.
- [ ] **EDGE-09** Simular erro HTTP (5xx) na resposta do CSV → cai no
  mesmo tratamento de erro do SYNC-04/05 (o `fetch` não rejeita em erro
  HTTP por padrão, então verificar concretamente o que a tela mostra
  nesse caso específico e documentar).
- [ ] **EDGE-10** Sessão expirada / autenticação: **não aplicável** — o
  app não tem login nem sessão de usuário; não há item de teste aqui.

## 12. Regressão do bug de duplicação (BUG)

- [ ] **BUG-01** Inspecionar o HTML servido (view-source ou
  `page.content()`) → existe **exatamente uma** ocorrência de `</html>`
  no documento, bem formada (com `>`), e nenhuma ocorrência de `</html;`.
- [ ] **BUG-02** Inspecionar o HTML servido → cada função JS
  (`renderPainel`, `renderMensal`, `addEntry`, `delEntry`, `compCards`,
  `compChart`, `compTable`, `renderCompMes`, `renderCompAno`,
  `renderCompCat`, `renderLancamentos`, `exportMensal`,
  `exportLancamentos`, `dl`) aparece **exatamente uma vez** no
  `<script>`, e há **exatamente uma** chamada solta a `syncData()` e
  **um** `setInterval(syncData, ...)` no final do script.
- [ ] **BUG-03** Repetir o SYNC-02 (contagem de requisições HTTP à
  `CSV_URL` no carregamento inicial) → confirma **uma** requisição, não
  duas, como consequência direta da correção do BUG-02.
