// Regras do item 16: ler → prévia → validar → contar válidos/inválidos →
// só então permitir confirmar. Nunca duplica um registro já importado.

const STATUS_PARA_SITUACAO = {
  previsto: "Previsto", "em aberto": "Em aberto", realizado: "Realizado", vencido: "Em aberto", cancelado: "Cancelado",
};

export function normalizarLinha(row, entidades) {
  const erros = [];
  const buscarPorNome = (lista, nome, campo = "nome") => lista.find((i) => (i[campo] || "").trim().toLowerCase() === (nome || "").trim().toLowerCase());

  const empresa = buscarPorNome(entidades.empresas, row["Empresa"]);
  if (!empresa) erros.push(`Empresa "${row["Empresa"]}" não encontrada`);

  const unidade = row["Filial"] ? buscarPorNome(entidades.unidades.filter((u) => u.empresaId === empresa?.id), row["Filial"]) : null;

  const tipo = (row["Tipo"] || "").trim();
  if (tipo !== "Entrada" && tipo !== "Saída") erros.push(`Tipo deve ser "Entrada" ou "Saída" (veio "${row["Tipo"]}")`);

  const conta = buscarPorNome(entidades.planoDeContas, row["Conta Gerencial"], "descricao");
  if (!conta) erros.push(`Conta Gerencial "${row["Conta Gerencial"]}" não encontrada`);
  else if (conta.tipo !== "Analítica") erros.push(`Conta "${conta.descricao}" é Sintética — não recebe lançamento`);

  const centro = row["Centro de Custo"] ? buscarPorNome(entidades.centrosCusto, row["Centro de Custo"], "nome") : null;
  if (conta?.centroCustoObrigatorio && !centro) erros.push(`Conta "${conta?.descricao}" exige Centro de Custo`);

  const projeto = row["Projeto"] ? buscarPorNome(entidades.projetos, row["Projeto"]) : null;
  const banco = row["Banco"] ? buscarPorNome(entidades.bancos, row["Banco"]) : null;
  const contaBancaria = row["Conta Bancária"] ? entidades.contasBancarias.find((c) => c.apelido === row["Conta Bancária"] || c.numero === row["Conta Bancária"]) : null;

  let clienteFornecedorId = null, tipoParceiro = null;
  if (row["Cliente/Fornecedor"]) {
    const cliente = buscarPorNome(entidades.clientes, row["Cliente/Fornecedor"]);
    const fornecedor = buscarPorNome(entidades.fornecedores, row["Cliente/Fornecedor"]);
    if (cliente) { clienteFornecedorId = cliente.id; tipoParceiro = "Cliente"; }
    else if (fornecedor) { clienteFornecedorId = fornecedor.id; tipoParceiro = "Fornecedor"; }
    else erros.push(`Cliente/Fornecedor "${row["Cliente/Fornecedor"]}" não encontrado`);
  }

  const valor = Number(String(row["Valor"] || "").replace(",", "."));
  if (!valor || isNaN(valor) || valor <= 0) erros.push(`Valor inválido: "${row["Valor"]}"`);

  const situacao = STATUS_PARA_SITUACAO[(row["Status"] || "").trim().toLowerCase()];
  if (!situacao) erros.push(`Status "${row["Status"]}" não reconhecido (use Previsto/Em aberto/Realizado/Cancelado)`);

  const dataVencimento = row["Vencimento"] || "";
  const dataEmissao = row["Data"] || dataVencimento;
  const competencia = row["Competência"] || dataEmissao?.slice(0, 7) || "";
  if (!dataVencimento) erros.push("Data de Vencimento não informada");
  if (!competencia) erros.push("Competência não informada");

  const lancamento = erros.length === 0 ? {
    empresaId: empresa.id, unidadeId: unidade?.id ?? null, contaGerencialId: conta.id, centroCustoId: centro?.id ?? null,
    projetoId: projeto?.id ?? null, tipoParceiro, clienteFornecedorId, bancoId: banco?.id ?? null, contaBancariaId: contaBancaria?.id ?? null,
    documento: row["Documento"] || "", dataEmissao, competencia, dataVencimento, dataPagamento: row["Data de baixa"] || null,
    tipo, situacao, valor, observacao: row["Observação"] || "", transferencia: false,
  } : null;

  return { linhaOriginal: row, erros, lancamento };
}

/** Evita duplicar um lançamento já existente (mesma empresa + documento + vencimento + valor). */
export function marcarDuplicados(linhasNormalizadas, lancamentosExistentes) {
  return linhasNormalizadas.map((l) => {
    if (!l.lancamento) return l;
    const duplicado = lancamentosExistentes.some((e) =>
      e.empresaId === l.lancamento.empresaId && e.documento === l.lancamento.documento &&
      e.dataVencimento === l.lancamento.dataVencimento && e.valor === l.lancamento.valor
    );
    if (duplicado) return { ...l, erros: [...l.erros, "Já existe um lançamento igual (mesma empresa/documento/vencimento/valor) — não importado para evitar duplicidade"], lancamento: null };
    return l;
  });
}

export const COLUNAS_TEMPLATE_LANCAMENTOS = [
  "Empresa", "Filial", "Data", "Competência", "Tipo", "Cliente/Fornecedor", "Documento", "Vencimento",
  "Data de baixa", "Banco", "Conta Bancária", "Conta Gerencial", "Centro de Custo", "Projeto", "Valor", "Status", "Observação",
];
