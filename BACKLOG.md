# Backlog — Velmetryx (CFO Finance Intelligence)

Atualizado em 2026-11-13.

Este arquivo consolida as frentes de desenvolvimento e as melhorias já levantadas.
Nada aqui é item novo: toda linha vem de uma das fontes listadas no final.

**Legenda de situação**
- `ENTREGUE` — feito e verificado
- `EM REPO` — feito no código, mas ainda não no ar
- `ABERTO` — não começou
- `BLOQUEADO` — não pode andar enquanto a causa não sair do caminho

---

## Frente 1 — Infraestrutura e deploy

### 1.1 Publicar o build atual na Vercel
- **Frente:** Infraestrutura e deploy
- **Situação:** `BLOQUEADO`
- **Por quê:** o commit `cb92045` chegou ao GitHub (`r-feres80/teste-fluxo-caixa`, branch `main`), mas o site `dist-diagnostico-netlify.vercel.app` continua servindo o bundle antigo (`index-DuDgyHB4.js`). O push não dispara deploy, o que indica que o projeto na Vercel não está ligado ao repositório — o repo não tem pasta `.vercel/` e a CLI da Vercel não está instalada nesta máquina. Enquanto isso não for resolvido, nenhuma entrega de código chega ao ar.
- **Critério de pronto:** abrir o site e encontrar um bundle diferente de `index-DuDgyHB4.js`, com o dark theme visível sem limpar cache.

### 1.2 Variáveis de ambiente na Vercel
- **Frente:** Infraestrutura e deploy
- **Situação:** `ABERTO`
- **Detalhe:** `VITE_APP_PASSWORD` entra no bundle em tempo de build (sem ela a tela de acesso mostra "senha não configurada"); `ANTHROPIC_API_KEY` é usada só no servidor, por `api/finance-ai.js`.
- **Critério de pronto:** as duas variáveis configuradas no projeto da Vercel; após um build novo, login funciona e o Finance Copilot responde.

### 1.3 Restaurar o Mini ERP via preview validada antes de produção
- **Frente:** Infraestrutura e deploy
- **Situação:** `ABERTO`
- **Origem:** "Prioridade atual" do `CLAUDE.md`.
- **Critério de pronto:** uma implantação de pré-visualização validada e aprovada antes de promover para produção.

### 1.4 Regressão das datas fixas dos dados demonstrativos
- **Frente:** Infraestrutura e deploy
- **Situação:** `ABERTO`
- **Origem:** registrada no `CLAUDE.md` como pendência a tratar depois.
- **Critério de pronto:** a base demo deixa de depender de datas fixas; `scripts/verificar-massa-sintetica.mjs` roda sem apontar regressão.

---

## Frente 2 — Visual e identidade

### 2.1 Dark theme em todas as telas
- **Frente:** Visual e identidade
- **Situação:** `EM REPO` (commit `8a562d5`)
- **Detalhe:** paleta Velmetryx aplicada nas páginas e componentes, incluindo os tooltips do Recharts, que seguiam com fundo claro. Verificado rodando local; ainda não está no ar por causa do item 1.1.
- **Critério de pronto:** nenhuma tela com resquício de tema claro, com o resultado visível no site publicado.

### 2.2 Mascote (cfobot) com fundo transparente
- **Frente:** Visual e identidade
- **Situação:** `EM REPO` (commit `d4d35ad`)
- **Detalhe:** a imagem servida em produção trazia o padrão xadrez de transparência achatado dentro do canal alpha, aparecendo como uma caixa cinza sobre o gradiente. Fundo removido com rembg (modelo u2net); recorte por limiar simples não servia, porque o branco do mascote tem o mesmo brilho do fundo.
- **Critério de pronto:** mascote sem halo sobre fundo claro e sobre fundo escuro (o escuro é o teste que denuncia resíduo).

### 2.3 Tela de login dentro da viewport
- **Frente:** Visual e identidade
- **Situação:** `EM REPO` (commit `2b3d41e`)
- **Detalhe:** a tela estourava a altura útil em monitor 1366x768. Verificado a 1366x660 sem barra de rolagem.
- **Critério de pronto:** login inteiro visível, sem rolagem, em 1366x768.

### 2.4 Dashboard estilo "Sales Dashboard" (dark, cards animados)
- **Frente:** Visual e identidade
- **Situação:** `ABERTO`
- **Detalhe:** cards com borda arredondada (`rounded-2xl`/`rounded-3xl`), tema dark predominante com cards em cores vivas (laranja, verde, vermelho, roxo). Referência: screenshots @_code_and_chill_.
- **Critério de pronto:** Dashboard reproduzindo a referência aprovada, validado pelo Rodrigo.

### 2.5 Troca de tema claro/escuro com View Transitions API
- **Frente:** Visual e identidade
- **Situação:** `ABERTO`
- **Detalhe:** animação de `clip-path` em círculo expandindo a partir do botão.
- **Critério de pronto:** alternância entre claro e escuro com a animação circular, sem piscar e sem perder o tema escolhido ao recarregar.

### 2.6 Decisão da biblioteca de animação
- **Frente:** Visual e identidade
- **Situação:** `ABERTO`
- **Detalhe:** GSAP x Framer Motion x só CSS. Decisão atribuída ao `cto` na Fase 3. Bloqueia 2.4 e 2.5 por definir a técnica.
- **Critério de pronto:** decisão registrada, com o motivo da escolha.

### 2.7 Rebrand Velmetryx
- **Frente:** Visual e identidade
- **Situação:** `ABERTO`
- **Detalhe:** o produto passa a se chamar **Velmetryx — Inteligência Financeira**, não mais "CFO Finance Intelligence". Aplicar em header, favicon, title da página, meta tags, OG image, textos de rodapé, emails, README do repo, `netlify.toml` e `package.json`. Hoje `src/config/appConfig.js` ainda usa o nome antigo.
- **Critério de pronto:** nenhum "CFO Finance Intelligence" visível ao usuário nem nos metadados dos pontos listados.

---

## Frente 3 — Módulos novos

### 3.1 Cartão Corporativo
- **Frente:** Módulos novos
- **Situação:** `ABERTO`
- **Escopo registrado:** despesas do cartão; limite disponível; valor total do mês; comparativo mês atual x mês anterior; alertas de limite (ex.: 80% usado).
- **Observação:** a especificação visual determina unificar Dashboard e Cartão Corporativo no **mesmo** layout, não em telas separadas. Referência: Finance and Payroll Dashboard (@_code_and_chill_).
- **Critério de pronto:** os cinco pontos do escopo funcionando sobre dado real do motor financeiro, dentro do layout unificado.

---

## Frente 4 — Motor financeiro e indicadores

### 4.1 Correção de DFC, DRE, Planejamento, Plano de Contas e Indicadores
- **Frente:** Motor financeiro e indicadores
- **Situação:** `ABERTO`
- **Detalhe:** o Rodrigo apontou que essas cinco áreas precisam de correção, sendo a estrutura do DFC citada nominalmente. **O defeito específico de cada uma não está registrado em lugar nenhum** — por isso o item não tem escopo fechado e não deve ser iniciado por suposição.
- **Critério de pronto:** antes de corrigir, registrar por área o que está errado hoje e qual é o número correto esperado; só então corrigir e conferir contra esse registro. Qualquer mudança respeita a regra de ouro do `esqueletofinanceiro.md` (seção 5): indicador não se calcula a partir de campo que não esteja no esqueleto.

---

## Frente 5 — IA e Finance Copilot

### 5.1 UX chat-first
- **Frente:** IA e Finance Copilot
- **Situação:** `BLOQUEADO`
- **Por quê:** depende da auditoria da Onda 0.2, que precisa primeiro dizer se o Finance Copilot atual funciona de verdade ou é fachada (item 6.1). Sem isso não dá para saber se o trabalho é evoluir ou refazer.
- **Escopo registrado:** chat do Finance Copilot como protagonista, em modelo híbrido — chat no topo, painel abaixo renderizando conforme a pergunta, e chips de áreas (AR, AP, Caixa, FP&A) como atalhos.
- **Critério de pronto:** o chat é o ponto de entrada da tela e o painel reage à pergunta.

### 5.2 Regras inegociáveis do chat financeiro
- **Frente:** IA e Finance Copilot
- **Situação:** `ABERTO`
- **Escopo registrado:** (1) toda resposta cita número e fonte (arquivo:linha, data, competência); (2) separa fato de hipótese; (3) diz "não sei" quando o dado não existe; (4) oferece drill-down — clicar no número e ver o detalhe por cliente ou centro de custo. Replicar no Copilot da UI as regras do `especialista-financeiro`.
- **Critério de pronto:** as quatro regras verificáveis em uso real, incluindo um caso em que o dado não existe e o chat admite isso.

---

## Frente 6 — Auditoria

### 6.1 Onda 0.2 — auditoria do MiniERP
- **Frente:** Auditoria
- **Situação:** `ABERTO`
- **Detalhe:** nunca executada. Era uma escolha entre Onda 0.2 (auditoria do MiniERP) e Onda 0.3 (MarkItDown + Obsidian). É pré-requisito de 5.1 e a entrada da Fase 2+.
- **Critério de pronto:** relatório da auditoria entregue, incluindo o veredito sobre o Finance Copilot.

### 6.2 Fase 2+ — pendências a priorizar
- **Frente:** Auditoria
- **Situação:** `BLOQUEADO`
- **Por quê:** o conteúdo desta fase está explicitamente marcado como "a definir com o relatório da Onda 0.2". Não há itens listados, e inventá-los contrariaria a própria nota.
- **Critério de pronto:** lista priorizada derivada do relatório de 6.1.

---

## Frente 7 — Ferramentas

### 7.1 Instalar Context7 (MCP de documentação atualizada)
- **Frente:** Ferramentas
- **Situação:** `ABERTO` — adiado
- **Por quê:** adiado a pedido do Rodrigo em 2026-11-06. Comando já definido: `claude mcp add --transport http context7 https://mcp.context7.com/mcp`.
- **Objetivo registrado:** evitar que o desenvolvedor gere código com API obsoleta.
- **Critério de pronto:** Context7 respondendo como servidor MCP.

### 7.2 Ferramenta de teste de carga
- **Frente:** Ferramentas
- **Situação:** `ABERTO`
- **Detalhe:** k6, Artillery ou equivalente. Marcado para a Fase 3, **quando o Velmetryx tiver tráfego real** — ou seja, ainda não é hora.
- **Critério de pronto:** um teste de pico de acesso executado, com resultado registrado.

### 7.3 Ferramentas avaliadas e descartadas
- **Frente:** Ferramentas
- **Situação:** `ENTREGUE` (decisão tomada)
- **Decisão:** não instalar Agent Skills 24 (duplica skills existentes), Graphite (já há `ruflo-knowledge-graph`), 21st.dev MCP (shadcn basta) nem Strix (já há `ruflo-security-audit`). Segurança, UX crítica, code review e manutenibilidade já estão cobertos pelos agentes atuais.

---

## Resumo

| Situação | Itens |
|---|---|
| `ENTREGUE` | 7.3 |
| `EM REPO` (falta publicar) | 2.1, 2.2, 2.3 |
| `BLOQUEADO` | 1.1 (Vercel não ligada ao repo), 5.1 e 6.2 (dependem da Onda 0.2) |
| `ABERTO` | 1.2, 1.3, 1.4, 2.4, 2.5, 2.6, 2.7, 3.1, 4.1, 5.2, 6.1, 7.1, 7.2 |

O item 1.1 é o gargalo mais imediato: enquanto a Vercel não publicar, três entregas prontas (2.1, 2.2, 2.3) ficam invisíveis para quem usa o sistema.

---

## Fontes

Nenhum item foi criado para este documento. A origem de cada um:

- `MiniERP-backlog.md` (Cérebro, 2026-11-05/06) — itens 2.4, 2.5, 2.6, 2.7, 3.1, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 7.3
- `CLAUDE.md` (seção "Prioridade atual") — itens 1.3, 1.4
- `esqueletofinanceiro.md` — regra de ouro referenciada em 4.1
- Pedidos do Rodrigo em sessão — itens 1.2, 2.1, 2.2, 2.3, 4.1
- Histórico do repositório — commits `8a562d5`, `d4d35ad`, `2b3d41e` citados nos itens 2.1, 2.2, 2.3
