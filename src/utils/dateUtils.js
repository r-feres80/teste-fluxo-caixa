// Datas são sempre armazenadas em ISO ("YYYY-MM-DD") internamente, para
// evitar ambiguidade de fuso e permitir comparação por string. A exibição
// para o usuário é sempre DD/MM/AAAA (fmtData, em formatUtils.js).

export const pad2 = (n) => String(n).padStart(2, "0");
export const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const parseISO = (s) => new Date(s + "T00:00:00");
export const todayISO = () => toISO(new Date());

// Módulos de FATO (o que já aconteceu — Dashboard, Tesouraria, Fluxo de Caixa,
// DFC, Contas a Pagar/Receber, DRE) nunca leem filtros.dataReferencia/mesRef/
// anoRef do estado editável: sempre a data real do dispositivo, sem exceção.
// Isso elimina de raiz qualquer dessincronia entre "Data de Referência" e
// "Mês/Ano" — não existe mais estado para dessincronizar nesses módulos.
// Módulos de PROJEÇÃO (Forecast, Cenários, Orçado x Realizado, Orçamento)
// continuam usando filtros.dataReferencia/mesRef/anoRef normalmente.
export const getDataAtualSistema = () => todayISO();

export const endOfMonthISO = (ano, mesIdx) => toISO(new Date(ano, mesIdx + 1, 0));
export const startOfMonthISO = (ano, mesIdx) => toISO(new Date(ano, mesIdx, 1));
export const startOfYearISO = (ano) => `${ano}-01-01`;
export const endOfYearISO = (ano) => `${ano}-12-31`;

export const addDaysISO = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
export const addMonthsISO = (iso, n) => { const d = parseISO(iso); d.setMonth(d.getMonth() + n); return toISO(d); };
export const diffDaysISO = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);

// Comparação unificada: uma data está vencida se anterior à data de referência.
// Usa diffDaysISO para robustez contra diferentes formatos internos.
export const isDataVencida = (dataVencimento, dataReferencia) => {
  if (!dataVencimento) return false;
  return diffDaysISO(dataVencimento, dataReferencia) > 0;
};

/**
 * Resolve o intervalo [inicio, fim] em ISO para um tipo de período,
 * dado o ano de referência, mês de referência (0-11) e data de referência.
 * Centraliza a regra do item 18: a Data de Referência nunca pode gerar
 * um intervalo inconsistente (ex.: projeção terminando em ano diferente
 * do ano selecionado).
 */
export function resolverIntervaloPeriodo({ tipoPeriodo, anoRef, mesRef, dataReferencia }) {
  switch (tipoPeriodo) {
    case "mes":
      return { inicio: startOfMonthISO(anoRef, mesRef), fim: endOfMonthISO(anoRef, mesRef) };
    case "ytd":
      return { inicio: startOfYearISO(anoRef), fim: dataReferencia };
    case "anoCompleto":
      return { inicio: startOfYearISO(anoRef), fim: endOfYearISO(anoRef) };
    case "ultimos12meses":
      return { inicio: addMonthsISO(dataReferencia, -11).slice(0, 8) + "01", fim: dataReferencia };
    default:
      return { inicio: startOfMonthISO(anoRef, mesRef), fim: endOfMonthISO(anoRef, mesRef) };
  }
}

/**
 * Meses (índices 0-11, dentro do anoRef) cobertos pelo tipo de período
 * selecionado nos Filtros Globais. Usado por DRE, Orçado x Realizado e
 * Orçamento, que trabalham por Ano + Mês (não por data corrida).
 * Nota: "Últimos 12 meses" é aproximado ao ano corrente completo nesta
 * versão, já que Orçamento/DRE estão ancorados a um único "ano" — uma
 * comparação virando o exercício fica para uma evolução futura.
 */
export function mesesDoPeriodo(filtros) {
  if (filtros.tipoPeriodo === "mes") return [filtros.mesRef];
  if (filtros.tipoPeriodo === "ytd") {
    const hoje = parseISO(filtros.dataReferencia);
    return Array.from({ length: hoje.getMonth() + 1 }, (_, i) => i);
  }
  return Array.from({ length: 12 }, (_, i) => i); // anoCompleto | ultimos12meses
}
