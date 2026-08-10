// Regras do item 16: ler → prévia → validar → contar válidos/inválidos →
// só então permitir confirmar. Nunca duplica um registro já importado.
// Auto-criação: registros faltantes são criados automaticamente sem perguntar.

import { SUBGRUPOS_POR_GRUPO_DFC } from "../config/appConfig.js";

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

// Bug corrigido: Conta Bancária auto-criada (aqui e no fallback dentro de
// normalizarLinha, mais abaixo) sempre nascia com bancoId: null — a
// planilha de lançamentos não traz coluna "Banco", só "Conta Bancária"
// (número). Isso deixava "Saldo por Conta"/"Saldo por Banco" em Tesouraria
// sem nome de banco pra exibir (linha/grupo "sem nome", só o total). Toda
// Conta Bancária agora ganha um Banco — usa `nomeBanco` se vier informado,
// senão cai no placeholder "Banco não informado" (find-or-create, nunca
// duplica) — nunca mais fica sem vínculo.
function garantirBanco(nomeBanco, entidades) {
  const nome = (nomeBanco || "").trim() || "Banco não informado";
  let banco = entidades.bancos.find((b) => normalizarTexto(b.nome) === normalizarTexto(nome));
  if (!banco) {
    banco = { id: gerarId("b", entidades.bancos), nome, codigo: "", ativo: true };
    entidades.bancos.push(banco);
  }
  return banco.id;
}

function criarEmpresa(nome, entidades, numeroConta, nomeBanco, saldoInicial = 0) {
  const empresa = { id: gerarId("emp", entidades.empresas), nome, ativo: true };
  entidades.empresas.push(empresa);

  // Criar Conta Bancária padrão se número for fornecido
  if (numeroConta) {
    const contaBancaria = {
      id: gerarId("cb", entidades.contasBancarias),
      empresaId: empresa.id,
      apelido: "Conta Movimento",
      numero: numeroConta,
      saldoInicial,
      ativo: true,
      bancoId: garantirBanco(nomeBanco, entidades),
    };
    entidades.contasBancarias.push(contaBancaria);
  }

  return empresa;
}

function criarContaGerencial(descricao, entidades, classificacaoDRE, classificacaoDFC, subgrupoDFC) {
  const id = gerarId("pc", entidades.planoDeContas);
  const conta = {
    id,
    // Toda conta precisa de código não-vazio para poder ser salva depois via
    // Plano de Contas (a tela exige form.codigo preenchido) -- sem isso, uma
    // conta auto-criada pela importação nunca mais conseguiria ser editada.
    codigo: `AUTO.${id.replace(/\D/g, "")}`,
    descricao,
    tipo: "Analítica",
    contaPaiId: null,
    classificacaoDRE: classificacaoDRE || "Não classificado",
    classificacaoDFC: classificacaoDFC || "Operacional",
    subgrupoDFC: subgrupoDFC || "",
    aceitaOrcamento: true,
    centroCustoObrigatorio: false,
    ativo: true,
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

// Remove acentos para comparação (ex.: "Comércio" === "Comercio"), evitando
// que a mesma Empresa/Conta/Cliente seja criada em duplicidade por causa
// de acentuação divergente entre planilhas.
const normalizarTexto = (s) => (s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Campo de data vindo da planilha: no CSV puro (com XLSX.read raw:true) chega
// como texto "YYYY-MM-DD" sem alteracao -- nunca passa por new Date(), entao
// nao ha round-trip de fuso horario para corromper o dia. Se vier de uma
// celula de data nativa do Excel (.xlsx, lida com cellDates:true), chega como
// um ISO completo em UTC ("YYYY-MM-DDTHH:mm:ss.sssZ"); aqui so cortamos a
// parte da data (primeiros caracteres), sem reconverter com getMonth()/
// getDate() locais -- e essa reconversao local que deslocava o dia no fuso
// do Brasil (UTC-3).
const limparData = (v) => (v == null ? "" : String(v)).slice(0, 10);
const limparCompetencia = (v) => (v == null ? "" : String(v)).slice(0, 7);

export function normalizarLinha(row, entidades) {
  const erros = [];
  const avisos = [];
  const buscarPorNome = (lista, nome, campo = "nome") => lista.find((i) => normalizarTexto(i[campo]) === normalizarTexto(nome));

  // Hotfix: saldoInicial fixo em 100000 não tinha relação nenhuma com a
  // planilha — a calibração do Bloco 1 não sobrevivia a um reimport real.
  // "Saldo Inicial" é o saldo de abertura da Conta Bancária (dia de corte
  // antes do primeiro lançamento), não um valor por lançamento — só é lido
  // na linha que dispara a CRIAÇÃO da conta (primeira vez que ela aparece
  // na planilha). Ausente/vazio nessa linha = 0, nunca um valor inventado.
  const saldoInicialConta = row["Saldo Inicial"] != null && String(row["Saldo Inicial"]).trim() !== ""
    ? Number(String(row["Saldo Inicial"]).replace(",", ".")) || 0
    : 0;

  let empresa = buscarPorNome(entidades.empresas, row["Empresa"]);
  if (!empresa) {
    empresa = criarEmpresa(row["Empresa"], entidades, row["Conta Bancária"], row["Banco"], saldoInicialConta);
    avisos.push(`Empresa "${row["Empresa"]}" criada automaticamente com Conta Movimento`);
  } else if (row["Conta Bancária"] && !entidades.contasBancarias.some((c) => c.empresaId === empresa.id)) {
    // Se empresa existe mas não tem conta bancária, criar uma
    const contaBancaria = {
      id: gerarId("cb", entidades.contasBancarias),
      empresaId: empresa.id,
      apelido: "Conta Movimento",
      numero: row["Conta Bancária"],
      saldoInicial: saldoInicialConta,
      ativo: true,
      bancoId: garantirBanco(row["Banco"], entidades),
    };
    entidades.contasBancarias.push(contaBancaria);
    avisos.push(`Conta Bancária criada para "${row["Empresa"]}"`);
  }

  const unidade = row["Filial"] ? buscarPorNome(entidades.unidades.filter((u) => u.empresaId === empresa?.id), row["Filial"]) : null;

  const tipo = (row["Tipo"] || "").trim();
  if (tipo !== "Entrada" && tipo !== "Saída") erros.push(`Tipo deve ser "Entrada" ou "Saída" (veio "${row["Tipo"]}")`);

  // "Grupo DFC" é o nome atual da coluna; "Classificação DFC" aceito por
  // compatibilidade com planilhas de rodadas anteriores.
  const grupoDFC = row["Grupo DFC"] || row["Classificação DFC"] || "";
  const subgrupoDFC = row["Subgrupo"] || "";
  if (subgrupoDFC && grupoDFC && !(SUBGRUPOS_POR_GRUPO_DFC[grupoDFC] || []).includes(subgrupoDFC)) {
    erros.push(`Subgrupo "${subgrupoDFC}" não pertence ao Grupo DFC "${grupoDFC}" (use ${(SUBGRUPOS_POR_GRUPO_DFC[grupoDFC] || []).join("/") || "nenhum subgrupo válido para esse grupo"})`);
  }

  let conta = buscarPorNome(entidades.planoDeContas, row["Conta Gerencial"], "descricao");
  if (!conta) {
    conta = criarContaGerencial(row["Conta Gerencial"], entidades, row["Classificação DRE"], grupoDFC, subgrupoDFC);
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

  const dataVencimento = limparData(row["Vencimento"]);
  const dataEmissao = limparData(row["Data"]) || dataVencimento;
  const competencia = limparCompetencia(row["Competência"]) || dataEmissao?.slice(0, 7) || "";
  if (!dataVencimento) erros.push("Data de Vencimento não informada");
  if (!competencia) erros.push("Competência não informada");

  const lancamento = erros.length === 0 ? {
    empresaId: empresa.id, unidadeId: unidade?.id ?? null, contaGerencialId: conta.id, centroCustoId: centro?.id ?? null,
    projetoId: projeto?.id ?? null, tipoParceiro, clienteFornecedorId, bancoId: banco?.id ?? null, contaBancariaId: contaBancaria?.id ?? null,
    documento: row["Documento"] || "", dataEmissao, competencia, dataVencimento, dataPagamento: limparData(row["Data de baixa"]) || null,
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

// "Saldo Inicial" (hotfix): preenchida só na(s) linha(s) da PRIMEIRA vez que
// a Conta Bancária aparece na planilha — é o saldo de abertura daquela
// conta, não um valor por lançamento. Vazio nas demais linhas.
export const COLUNAS_TEMPLATE_LANCAMENTOS = [
  "Empresa", "Filial", "Data", "Competência", "Tipo", "Cliente/Fornecedor", "Documento", "Vencimento",
  "Data de baixa", "Banco", "Conta Bancária", "Saldo Inicial", "Conta Gerencial", "Centro de Custo", "Projeto", "Valor", "Status", "Observação",
];
