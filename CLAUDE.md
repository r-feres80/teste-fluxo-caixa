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
