// Importação de orçamentos: Conta Gerencial, Ano, Mês, Valor

export function normalizarLinhaOrcamento(row, entidades) {
  const erros = [];
  const avisos = [];
  const buscarPorNome = (lista, nome, campo = "nome") => lista.find((i) => (i[campo] || "").trim().toLowerCase() === (nome || "").trim().toLowerCase());

  const conta = buscarPorNome(entidades.planoDeContas, row["Conta Gerencial"], "descricao");
  if (!conta) erros.push(`Conta Gerencial "${row["Conta Gerencial"]}" não encontrada`);
  else if (conta.tipo !== "Analítica") erros.push(`Conta "${conta.descricao}" é Sintética — não recebe orçamento`);

  const ano = parseInt(row["Ano"]);
  if (!ano || isNaN(ano) || ano < 2000 || ano > 2100) erros.push(`Ano inválido: "${row["Ano"]}"`);

  const mes = parseInt(row["Mês"]);
  if (!mes || isNaN(mes) || mes < 1 || mes > 12) erros.push(`Mês deve ser 1-12 (veio "${row["Mês"]}")`);

  const valor = Number(String(row["Valor"] || "").replace(",", "."));
  if (isNaN(valor)) erros.push(`Valor inválido: "${row["Valor"]}"`);

  const orcamentoItem = erros.length === 0 ? {
    contaGerencialId: conta.id,
    ano,
    mes,
    valor,
  } : null;

  return { linhaOriginal: row, erros, avisos, orcamentoItem };
}

export function marcarDuplicadosOrcamento(linhasNormalizadas, orcamentosExistentes) {
  return linhasNormalizadas.map((l) => {
    if (!l.orcamentoItem) return l;
    const duplicado = orcamentosExistentes.some((e) =>
      e.contaGerencialId === l.orcamentoItem.contaGerencialId &&
      e.ano === l.orcamentoItem.ano &&
      e.mes === l.orcamentoItem.mes
    );
    if (duplicado) return { ...l, erros: [...l.erros, "Já existe orçamento para essa conta/período"], orcamentoItem: null };
    return l;
  });
}

export const COLUNAS_TEMPLATE_ORCAMENTO = [
  "Conta Gerencial", "Ano", "Mês", "Valor",
];
