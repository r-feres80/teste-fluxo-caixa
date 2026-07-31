// Regras do item 16: ler → prévia → validar → contar válidos/inválidos →
// só então permitir confirmar. Nunca duplica um registro já importado.
// Auto-criação: registros faltantes são criados automaticamente sem perguntar.

const STATUS_PARA_SITUACAO = {
  previsto: "Previsto", "em aberto": "Em aberto", realizado: "Realizado", vencido: "Em aberto", cancelado: "Cancelado",
};

function gerarId(prefixo, lista) {
  const nrs = lista.map((i) => {
    const match = (i.id || "").match(new RegExp(`^${prefixo}(\\d+)$`));
    return match ? parseInt(match[1]) : 0;
  });
  const max = Math.max(...nrs, 0);
  return `${prefixo}${max + 1}`;
}

function criarEmpresa(nome, entidades, numeroConta) {
  const empresa = { id: gerarId("emp", entidades.empresas), nome, ativo: true };
  entidades.empresas.push(empresa);

  // Criar Conta Bancária padrão se número for fornecido
  if (numeroConta) {
    const contaBancaria = {
      id: gerarId("cb", entidades.contasBancarias),
      empresaId: empresa.id,
      apelido: "Conta Movimento",
      numero: numeroConta,
      saldoInicial: 100000,
      banco: null,
    };
    entidades.contasBancarias.push(contaBancaria);
  }

  return empresa;
}

function criarContaGerencial(descricao, entidades, classificacaoDRE, classificacaoDFC) {
  const conta = {
    id: gerarId("pc", entidades.planoDeContas),
    descricao,
    tipo: "Analítica",
    contaPaiId: null,
    classificacaoDRE: classificacaoDRE || "Não classificado",
    classificacaoDFC: classificacaoDFC || "Operacional",
    aceitaOrcamento: false,
    centroCustoObrigatorio: false,
  };
  entidades.planoDeContas.push(conta);
  return conta;
}

function criarCentroDeCusto(nome, entidades) {
  const centro = {
    id: gerarId("cc", entidades.centrosCusto),
    nome,
    centroPaiId: null,
    ativo: true,
  };
  entidades.centrosCusto.push(centro);
  return centro;
}

function criarClienteFornecedor(nome, tipo, entidades) {
  const lista = tipo === "Cliente" ? entidades.clientes : entidades.fornecedores;
  const id = gerarId(tipo === "Cliente" ? "cli" : "for", lista);
  const registro = { id, nome, ativo: true };
  lista.push(registro);
  return { id, tipo };
}

export function normalizarLinha(row, entidades) {
  const erros = [];
  const avisos = [];
  const buscarPorNome = (lista, nome, campo = "nome") => lista.find((i) => (i[campo] || "").trim().toLowerCase() === (nome || "").trim().toLowerCase());

  let empresa = buscarPorNome(entidades.empresas, row["Empresa"]);
  if (!empresa) {
    empresa = criarEmpresa(row["Empresa"], entidades, row["Conta Bancária"]);
    avisos.push(`Empresa "${row["Empresa"]}" criada automaticamente com Conta Movimento`);
  } else if (row["Conta Bancária"] && !entidades.contasBancarias.some((c) => c.empresaId === empresa.id)) {
    // Se empresa existe mas não tem conta bancária, criar uma
    const contaBancaria = {
      id: gerarId("cb", entidades.contasBancarias),
      empresaId: empresa.id,
      apelido: "Conta Movimento",
      numero: row["Conta Bancária"],
      saldoInicial: 100000,
      banco: null,
    };
    entidades.contasBancarias.push(contaBancaria);
    avisos.push(`Conta Bancária criada para "${row["Empresa"]}"`);
  }

  const unidade = row["Filial"] ? buscarPorNome(entidades.unidades.filter((u) => u.empresaId === empresa?.id), row["Filial"]) : null;

  const tipo = (row["Tipo"] || "").trim();
  if (tipo !== "Entrada" && tipo !== "Saída") erros.push(`Tipo deve ser "Entrada" ou "Saída" (veio "${row["Tipo"]}")`);

  let conta = buscarPorNome(entidades.planoDeContas, row["Conta Gerencial"], "descricao");
  if (!conta) {
    conta = criarContaGerencial(row["Conta Gerencial"], entidades, row["Classificação DRE"], row["Classificação DFC"]);
    avisos.push(`Conta Gerencial "${row["Conta Gerencial"]}" criada automaticamente`);
  } else if (conta.tipo !== "Analítica") erros.push(`Conta "${conta.descricao}" é Sintética — não recebe lançamento`);

  let centro = row["Centro de Custo"] ? buscarPorNome(entidades.centrosCusto, row["Centro de Custo"], "nome") : null;
  if (row["Centro de Custo"] && !centro) {
    centro = criarCentroDeCusto(row["Centro de Custo"], entidades);
    avisos.push(`Centro de Custo "${row["Centro de Custo"]}" criado automaticamente`);
  }
  if (conta?.centroCustoObrigatorio && !centro) erros.push(`Conta "${conta?.descricao}" exige Centro de Custo`);

  const projeto = row["Projeto"] ? buscarPorNome(entidades.projetos, row["Projeto"]) : null;
  const banco = row["Banco"] ? buscarPorNome(entidades.bancos, row["Banco"]) : null;
  const contaBancaria = row["Conta Bancária"] ? entidades.contasBancarias.find((c) => c.apelido === row["Conta Bancária"] || c.numero === row["Conta Bancária"]) : null;

  let clienteFornecedorId = null, tipoParceiro = null;
  if (row["Cliente/Fornecedor"]) {
    let cliente = buscarPorNome(entidades.clientes, row["Cliente/Fornecedor"]);
    let fornecedor = buscarPorNome(entidades.fornecedores, row["Cliente/Fornecedor"]);

    if (cliente) {
      clienteFornecedorId = cliente.id;
      tipoParceiro = "Cliente";
    } else if (fornecedor) {
      clienteFornecedorId = fornecedor.id;
      tipoParceiro = "Fornecedor";
    } else {
      const tipoParceiroAuto = tipo === "Entrada" ? "Cliente" : "Fornecedor";
      const { id, tipo: tipoAtual } = criarClienteFornecedor(row["Cliente/Fornecedor"], tipoParceiroAuto, entidades);
      clienteFornecedorId = id;
      tipoParceiro = tipoAtual;
      avisos.push(`${tipoParceiroAuto} "${row["Cliente/Fornecedor"]}" criado automaticamente`);
    }
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

  return { linhaOriginal: row, erros, avisos, lancamento };
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
