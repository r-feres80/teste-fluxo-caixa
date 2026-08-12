# Notas de processo para builds de teste

## Senha de acesso (PasswordGate) em builds de teste

O app é protegido por `src/components/PasswordGate.jsx`, gated pela env var
`VITE_APP_PASSWORD` (embutida no bundle em tempo de build — ver comentário no
próprio componente sobre a limitação de troca sem rebuild).

**Decisão do usuário (válida até ele informar o contrário):** todo build
gerado durante a fase de desenvolvimento/teste (dist.zip enviado pra ele
validar antes de produção) deve usar a senha de teste padrão:

```
VITE_APP_PASSWORD=cfo-teste-2026 npm run build
```

Não perguntar de novo a cada build — usar esse valor automaticamente sempre
que o pedido for "gera um build", "manda o zip pra eu ver/testar" etc.

Só parar de usar `cfo-teste-2026` quando o usuário informar explicitamente
uma senha definitiva de produção diferente — nesse caso, usar a senha nova
informada e considerar perguntar se o padrão de teste deve ser atualizado
também, ou se `cfo-teste-2026` continua valendo pros builds intermediários
até o próximo pedido de build "final"/produção.

## Regra permanente — Composição de Recebimento AR (Antecipado/Em
dia/Atrasado)

Toda vez que dado sintético de AR Realizado for gerado ou recalibrado
(preenchimento de gap em "Composição do Recebimento", regeneração de
massa sintética, ou qualquer script que crie/edite dataPagamento de
títulos de Entrada), seguir estas faixas — MODULADAS DIA A DIA, nunca
uma proporção fixa idêntica todo dia:

- Em dia: 65%-70% (maioria)
- Atrasado: 10%-15%
- Antecipado: o restante (~15%-25%)

Inadimplência (AR vencido ÷ AR em aberto): manter entre 3,0%-4,0%,
consistente entre TODAS as empresas do dataset (não deixar uma empresa
com perfil de risco muito diferente da outra sem motivo de negócio
explícito).

Ao aplicar essa regra, sempre proteger de recalibração:
- Lançamentos do cenário de aperto de tesouraria (Impostos/Folha com
  vencimento marcado especificamente pra criar os vales de caixa já
  validados)
- Lançamentos marcados com observacao contendo "Gerado —" (rastro de
  preenchimento de gap já feito)

Antes de aplicar, rode scripts/verificar-massa-sintetica.mjs pra saber
o estado atual por empresa, e depois de aplicar, rode de novo e
reporte a comparação antes/depois — nunca presuma que a calibração
anterior ainda vale sem checar.

## Regra permanente — Hábito de verificação em scripts de calibração

Nasceu de um caso real (commit b40012d): um script de recalibração de
inadimplência mexeu em dataPagamento de forma mais ampla do que o
necessário e, como efeito colateral não previsto (não intencional,
não percebido antes do commit), derrubou um dia inteiro de
"Composição do Recebimento" e zerou parte do "Previsto p/ hoje" —
calibrações de rodadas anteriores que ninguém tinha pedido pra mexer.
Corrigido no comando seguinte (restaurar-e-prevenir), que também
criou a seção "Invariantes de calibração" em
scripts/verificar-massa-sintetica.mjs pra pegar esse tipo de coisa
ANTES do commit, não depois que o usuário reportar que algo sumiu.

Daqui pra frente, todo script de recalibração de dado
(`scripts/*.mjs` que edita `lancamentosImportados.json` ou
`demoData.js`) segue este hábito:

1. Roda `node scripts/verificar-massa-sintetica.mjs` ANTES de editar
   qualquer coisa — esse é o baseline, incluindo a seção de
   Invariantes de calibração.
2. Aplica a mudança.
3. Roda `node scripts/verificar-massa-sintetica.mjs` de novo DEPOIS —
   compara com o baseline.
4. Se aparecer "⚠️ REGRESSÃO DETECTADA" na seção de Invariantes que
   NÃO for a mudança pretendida daquele comando específico, o script
   PARA e reporta o achado antes de commitar — não commita "torcendo
   pra estar certo". Investiga a causa raiz (qual parte do script
   mexeu no que não devia) antes de decidir se corrige o script ou
   se pede confirmação ao usuário.
5. Todo script de calibração começa lendo o estado ATUAL do arquivo
   (nunca uma cópia local antiga, nunca regenera a massa do zero) e
   aplica a mudança em cima dele — documentar isso num comentário no
   topo do próprio script.

## Regra permanente — Sweep automático de caixa (Modelo B)

Comando sweep-automatico-b: o sweep de caixa (varrer saldo de conta
líquida acima do Caixa Mínimo Operacional pra Aplicação) dispara
sozinho 1x/dia, na virada de data real (nunca em runtime além disso —
nunca a cada reload/render dentro do mesmo dia), sempre logado em
`entidades.sweepLog` com trilha de auditoria completa (data/hora,
valor, contas de origem/destino, mínimo vigente). Gatilho em
`useAppData.js`; cálculo puro reaproveitado de
`financial-engine/sweepCaixa.js` (mesma lógica do script manual
`scripts/varredura-caixa-aplicacao.mjs`, que continua existindo à
parte pra execução avulsa).

sweepLog sobrevive a "Limpar Base" (é trilha de auditoria, não dado
transacional descartável) — só "Resetar Tudo" apaga. Isso inclui
sobreviver à regeneração automática de base demo "obsoleta" (quando
`origemBase === "demo"` e o dia mudou desde a última carga) — achado
real desta rodada: sem esse cuidado, cada virada de dia apagava o
sweepLog inteiro e recomeçava do zero, porque essa regeneração foi
pensada originalmente só pra manter texto/data relativa da demo
"fresca", sem saber que o sweep agora também vive nessa mesma base.

Alerta "Sweep executado: R$X → Aplicação (data)" aparece em Alertas
Executivos com severidade "Informativa" (não é risco) só no dia em
que o sweep de fato varreu algo — dias "sem excedente" ficam só no
log, sem alerta no Dashboard.

**"Limpar Base" preserva sweepLog x "Carregar Dados Demonstrativos"
limpa sweepLog — não confundir os dois (comando
fix-sweeplog-carregar-demo):**
- "Limpar Base" preserva sweepLog porque mantém a MESMA linha de
  dados (só reseta transacional) — o log continua descrevendo
  fielmente o que aconteceu com aquele cenário.
- "Carregar Dados Demonstrativos" **limpa** sweepLog (e os
  lançamentos `SWEEP-*` associados) porque SUBSTITUI o cenário
  inteiro por um novo baseline calibrado — um log referenciando saldo
  de um cenário que acabou de deixar de existir não é auditoria
  válida, é lixo. `demoFresco()` já devolve `sweepLog: []` nesse
  fluxo. "Resetar Tudo" também limpa (sempre limpou).
- Achado real desta rodada: limpar o log sozinho não bastava — o
  guard de "já rodei hoje" do sweep (`sweepChecadoParaRef`, uma trava
  só de double-invoke do React.StrictMode dentro do MESMO render) não
  se resetava quando o cenário mudava no meio da sessão, então o
  sweep ficava "travado" sem rodar de novo até um reload de página —
  saldo recém-recalibrado ficava visivelmente sem sweep por um tempo
  indeterminado. `carregarDemo`, `limparBase` e `resetarTudo` agora
  resetam esse ref também, pra o sweep poder reavaliar e disparar de
  novo na mesma sessão, sem exigir reload.
