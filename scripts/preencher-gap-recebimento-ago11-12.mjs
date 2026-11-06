// Preenche o gap de "Composição do Recebimento" nos dias úteis 11/08/2026 e
// 12/08/2026 (e1 e e2), achado real do comando "rode as automações
// aplicadas": a janela de 30 dias avançou desde a última calibração
// (b40012d/ecde68d) e esses 2 dias ficaram sem nenhum recebimento
// Realizado — não é regressão de um script, é a janela andando sem
// catch-up automático (ver comentário em verificar-massa-sintetica.mjs).
//
// Segue a regra do Grupo 3 (comando restaurar-e-prevenir): lê o estado
// ATUAL de lancamentosImportados.json (não uma cópia antiga, não regenera
// a massa do zero) e só ADICIONA lançamentos novos — não toca em nenhum
// lançamento existente.
//
// Segue a regra permanente de Composição de Recebimento AR (CLAUDE.md):
// classificação modulada dia a dia (não repete a mesma proporção nos 2
// dias) — 11/08 recebe Em dia (e1) + Antecipado (e2); 12/08 recebe
// Atrasado (e1) + Em dia (e2). Cada novo lançamento é marcado com
// observação "Gerado —" pra ficar protegido de recalibrações futuras,
// igual aos 3 já existentes (comando tesouraria-ajuste2).
import fs from "node:fs";

const REAL_PATH = new URL("../src/data/lancamentosImportados.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(REAL_PATH, "utf8"));

const novos = [
  {
    empresaId: "e1", unidadeId: null, contaGerencialId: "pc1.01.04", centroCustoId: "cc2100",
    projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: null, contaBancariaId: "cb1",
    documento: "NF-202608-GAP-E1C", dataEmissao: "2026-08-11", competencia: "2026-08",
    dataVencimento: "2026-08-11", dataPagamento: "2026-08-11", // Em dia
    tipo: "Entrada", situacao: "Realizado", valor: 18642.30,
    observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
    transferencia: false, id: "gap0811e1",
  },
  {
    empresaId: "e2", unidadeId: null, contaGerencialId: "pc1.01.04", centroCustoId: "cc2100",
    projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: null, contaBancariaId: "cb4",
    documento: "NF-202608-GAP-E2C", dataEmissao: "2026-08-08", competencia: "2026-08",
    dataVencimento: "2026-08-13", dataPagamento: "2026-08-11", // Antecipado (2 dias)
    tipo: "Entrada", situacao: "Realizado", valor: 14208.77,
    observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
    transferencia: false, id: "gap0811e2",
  },
  {
    empresaId: "e1", unidadeId: null, contaGerencialId: "pc1.01.03", centroCustoId: "cc2100",
    projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: null, contaBancariaId: "cb1",
    documento: "NF-202608-GAP-E1D", dataEmissao: "2026-08-07", competencia: "2026-08",
    dataVencimento: "2026-08-07", dataPagamento: "2026-08-12", // Atrasado (5 dias)
    tipo: "Entrada", situacao: "Realizado", valor: 21935.64,
    observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
    transferencia: false, id: "gap0812e1",
  },
  {
    empresaId: "e2", unidadeId: null, contaGerencialId: "pc1.01.04", centroCustoId: "cc2100",
    projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: null, contaBancariaId: "cb4",
    documento: "NF-202608-GAP-E2D", dataEmissao: "2026-08-12", competencia: "2026-08",
    dataVencimento: "2026-08-12", dataPagamento: "2026-08-12", // Em dia
    tipo: "Entrada", situacao: "Realizado", valor: 16374.02,
    observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
    transferencia: false, id: "gap0812e2",
  },
];

data.push(...novos);
fs.writeFileSync(REAL_PATH, JSON.stringify(data));
console.log(`Adicionados ${novos.length} lançamentos "Gerado —" pra preencher 11/08 e 12/08 (e1 + e2).`);
