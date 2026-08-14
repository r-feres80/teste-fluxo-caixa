// Complemento do preencher-gap-recebimento-ago11-12.mjs: usuário pediu pra
// cobrir também 13/08/2026 (quinta-feira, dia útil) — ficou de fora do
// primeiro preenchimento porque a checagem de invariantes em
// verificar-massa-sintetica.mjs exclui "ontem" de propósito (documentado
// como ponto cego conhecido: janela andando sem catch-up automático), mas
// visualmente o gráfico "Composição do Recebimento" mostrava a barra
// vazia mesmo assim.
//
// Mesma regra do Grupo 3: lê o estado ATUAL de lancamentosImportados.json
// e só ADICIONA — não toca em nenhum lançamento existente (inclusive os 4
// do preenchimento de 11-12/08, que já foram gravados no arquivo).
//
// Modulação dia a dia (regra permanente Composição de Recebimento AR):
// 11/08 = Em dia(e1) + Antecipado(e2); 12/08 = Atrasado(e1) + Em dia(e2);
// 13/08 = Antecipado(e1) + Atrasado(e2) — mix completo dos 3 tipos usado,
// nenhum dia repete o par do dia anterior.
import fs from "node:fs";

const REAL_PATH = new URL("../src/data/lancamentosImportados.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(REAL_PATH, "utf8"));

const novos = [
  {
    empresaId: "e1", unidadeId: null, contaGerencialId: "pc1.01.03", centroCustoId: "cc2100",
    projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: null, contaBancariaId: "cb1",
    documento: "NF-202608-GAP-E1E", dataEmissao: "2026-08-09", competencia: "2026-08",
    dataVencimento: "2026-08-17", dataPagamento: "2026-08-13", // Antecipado (4 dias)
    tipo: "Entrada", situacao: "Realizado", valor: 19845.50,
    observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
    transferencia: false, id: "gap0813e1",
  },
  {
    empresaId: "e2", unidadeId: null, contaGerencialId: "pc1.01.04", centroCustoId: "cc2100",
    projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: null, contaBancariaId: "cb4",
    documento: "NF-202608-GAP-E2E", dataEmissao: "2026-08-06", competencia: "2026-08",
    dataVencimento: "2026-08-06", dataPagamento: "2026-08-13", // Atrasado (7 dias)
    tipo: "Entrada", situacao: "Realizado", valor: 13672.90,
    observacao: "Gerado — preenchimento de gap de dia útil sem recebimento (Composição do Recebimento, comando rode-automacoes-aplicadas)",
    transferencia: false, id: "gap0813e2",
  },
];

data.push(...novos);
fs.writeFileSync(REAL_PATH, JSON.stringify(data));
console.log(`Adicionados ${novos.length} lançamentos "Gerado —" pra preencher 13/08 (e1 + e2).`);
