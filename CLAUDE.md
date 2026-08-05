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
