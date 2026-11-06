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

// Conta Bancária "Aplicação" (comando dashboard-causa-raiz, 1b): antes toda
// conta auto-criada pelo import nascia sem semLiquidez/modalidade/taxaAnual/
// dataAplicacao — mesmo quando a linha claramente descrevia uma aplicação
// financeira (CDB/LCI/Tesouro). Colunas opcionais "Tipo de Conta" (Líquida/
// Aplicação, default Líquida), "Modalidade", "Taxa Anual (%)" e "Data de
// Aplicação" só são lidas/usadas quando "Tipo de Conta" = "Aplicação" — pra
// conta líquida comum, fica exatamente como antes (sem esses campos, igual
// ao resto do Plano de Contas Bancárias já cadastrado manualmente).
function construirContaBancaria(id, empresaId, row, entidades, saldoInicial) {
  const ehAplicacao = normalizarTexto(row["Tipo de Conta"]) === "aplicacao";
  const conta = {
    id, empresaId, apelido: "Conta Movimento", numero: row["Conta Bancária"],
    saldoInicial, ativo: true, bancoId: garantirBanco(row["Banco"], entidades),
    semLiquidez: ehAplicacao ? "true" : "false",
  };
  if (!ehAplicacao) return conta;

  const taxaAnualTxt = row["Taxa Anual (%)"] != null ? String(row["Taxa Anual (%)"]).trim() : "";
  return {
    ...conta,
    modalidade: row["Modalidade"] || "",
    taxaAnual: taxaAnualTxt !== "" ? Number(taxaAnualTxt.replace(",", ".")) || 0 : 0,
    dataAplicacao: limparData(row["Data de Aplicação"]) || "",
  };
}

function criarEmpresa(nome, entidades, row, saldoInicial = 0) {
  const empresa = { id: gerarId("emp", entidades.empresas), nome, ativo: true };
  entidades.empresas.push(empresa);

  // Criar Conta Bancária padrão se número for fornecido
  if (row["Conta Bancária"]) {
    entidades.contasBancarias.push(construirContaBancaria(gerarId("cb", entidades.contasBancarias), empresa.id, row, entidades, saldoInicial));
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
    empresa = criarEmpresa(row["Empresa"], entidades, row, saldoInicialConta);
    avisos.push(`Empresa "${row["Empresa"]}" criada automaticamente com Conta Movimento`);
  } else if (
    // Bug corrigido: a checagem antiga era "a empresa não tem NENHUMA conta
    // bancária" — então uma empresa que já tinha 1 conta nunca ganhava a 2ª,
    // 3ª etc. quando a planilha trazia um valor diferente de "Conta
    // Bancária" pra ela (cenário comum: conta corrente + aplicação, ou
    // contas em bancos diferentes). O lançamento entrava com
    // contaBancariaId: null, sem erro nem aviso. Agora a checagem é por essa
    // conta ESPECÍFICA (apelido/número) já existir pra essa empresa — sem
    // limite de quantas contas por empresa.
    row["Conta Bancária"] &&
    !entidades.contasBancarias.some((c) => c.empresaId === empresa.id && (c.apelido === row["Conta Bancária"] || c.numero === row["Conta Bancária"]))
  ) {
    entidades.contasBancarias.push(construirContaBancaria(gerarId("cb", entidades.contasBancarias), empresa.id, row, entidades, saldoInicialConta));
    avisos.push(`Conta Bancária "${row["Conta Bancária"]}" criada para "${row["Empresa"]}"${normalizarTexto(row["Tipo de Conta"]) === "aplicacao" ? " (Aplicação)" : ""}`);
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
    // Achado (comando dashboard-causa-raiz, 1c): sem "Classificação DRE"/
    // "Grupo DFC" na planilha, a conta nascia "Não classificado"/
    // "Operacional" genérico SILENCIOSAMENTE — Receita Bruta, EBITDA e o DFC
    // simplesmente não computavam essa conta, sem nenhum sinal de que algo
    // estava errado até o usuário notar os totais zerados. Aviso agora avisa
    // explicitamente qual conta ficou incompleta e o que isso quebra.
    avisos.push(!row["Classificação DRE"] && !grupoDFC
      ? `Conta Gerencial "${row["Conta Gerencial"]}" criada como Não Classificado — Receita Bruta/EBITDA/DFC não vão computar essa conta até você classificar em Plano de Contas`
      : `Conta Gerencial "${row["Conta Gerencial"]}" criada automaticamente`);
  } else if (conta.tipo !== "Analítica") erros.push(`Conta "${conta.descricao}" é Sintética — não recebe lançamento`);

  let centro = row["Centro de Custo"] ? buscarPorNome(entidades.centrosCusto, row["Centro de Custo"], "nome") : null;
  if (row["Centro de Custo"] && !centro) {
    centro = criarCentroDeCusto(row["Centro de Custo"], entidades);
    avisos.push(`Centro de Custo "${row["Centro de Custo"]}" criado automaticamente`);
  }
  if (conta?.centroCustoObrigatorio && !centro) erros.push(`Conta "${conta?.descricao}" exige Centro de Custo`);

  const projeto = row["Projeto"] ? buscarPorNome(entidades.projetos, row["Projeto"]) : null;
  const banco = row["Banco"] ? buscarPorNome(entidades.bancos, row["Banco"]) : null;
  // Escopado por empresa (achado adicional ao corrigir a criação acima):
  // sem isso, duas empresas com contas de mesmo apelido/número (coincidência
  // plausível numa planilha real, ex.: ambas chamam "Conta Movimento") podiam
  // fazer o lançamento de uma empresa apontar pra conta bancária da OUTRA.
  const contaBancaria = row["Conta Bancária"] ? entidades.contasBancarias.find((c) => c.empresaId === empresa.id && (c.apelido === row["Conta Bancária"] || c.numero === row["Conta Bancária"])) : null;

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
//
// "Classificação DRE"/"Grupo DFC"/"Subgrupo" e "Tipo de Conta"/"Modalidade"/
// "Taxa Anual (%)"/"Data de Aplicação" (comando dashboard-causa-raiz, 1c/1b):
// normalizarLinha já aceitava as 3 primeiras — só não apareciam aqui, então
// ninguém que baixasse o template saberia que existem. As 4 últimas são
// novas: só lidas/usadas quando "Tipo de Conta" = "Aplicação" (default
// "Líquida" se vazio) — ver construirContaBancaria.
export const COLUNAS_TEMPLATE_LANCAMENTOS = [
  "Empresa", "Filial", "Data", "Competência", "Tipo", "Cliente/Fornecedor", "Documento", "Vencimento",
  "Data de baixa", "Banco", "Conta Bancária", "Saldo Inicial", "Tipo de Conta", "Modalidade", "Taxa Anual (%)", "Data de Aplicação",
  "Conta Gerencial", "Classificação DRE", "Grupo DFC", "Subgrupo", "Centro de Custo", "Projeto", "Valor", "Status", "Observação",
];
