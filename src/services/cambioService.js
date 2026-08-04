// Câmbio (Dólar/Euro) — API SGS do Banco Central, série PTAX, gratuita, sem
// chave, CORS liberado. Chamada direta do frontend, sem proxy/Function.
// Cache em localStorage (TTL de algumas horas) para não bater na API do BCB
// a cada render/reload — a cotação PTAX não muda intra-dia de forma que
// justifique buscar de novo a cada poucos minutos.

import { STORAGE_KEY } from "../config/appConfig.js";
import { calcularIndicadoresCambio } from "../financial-engine/cambio.js";

// Séries SGS do BCB: 1 = Dólar americano (venda) PTAX diário;
// 21619 = Euro (venda) PTAX diário.
const SERIES_SGS = { USD: 1, EUR: 21619 };
const CACHE_KEY = `${STORAGE_KEY}-cambio-cache`;
const TTL_MS = 4 * 60 * 60 * 1000; // 4 horas

function lerCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.timestamp || Date.now() - parsed.timestamp > TTL_MS) return null;
    return parsed.dados;
  } catch {
    return null;
  }
}

function gravarCache(dados) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), dados }));
  } catch {
    // Falha ao gravar cache (ex.: quota) não deve quebrar a tela — só não cacheia.
  }
}

async function buscarSerieSGS(codigo, ultimos = 15) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/${ultimos}?formato=json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`SGS ${codigo} respondeu ${resp.status}`);
  const bruto = await resp.json();
  const serie = bruto
    .map((d) => ({ data: d.data, valor: Number(String(d.valor).replace(",", ".")) }))
    .filter((d) => d.data && !isNaN(d.valor));
  if (serie.length === 0) throw new Error(`SGS ${codigo} sem dados válidos`);
  return serie;
}

/**
 * Busca Dólar e Euro (PTAX), com cache. Nunca lança erro — cada moeda que
 * falhar volta como { indisponivel: true }, as outras seguem normalmente.
 * Retorno: { USD: {...} | { indisponivel: true }, EUR: {...} | { indisponivel: true } }
 */
export async function buscarCambio() {
  const cache = lerCache();
  if (cache) return cache;

  const resultado = {};
  await Promise.all(
    Object.entries(SERIES_SGS).map(async ([moeda, codigo]) => {
      try {
        const serie = await buscarSerieSGS(codigo);
        resultado[moeda] = calcularIndicadoresCambio(serie);
      } catch {
        resultado[moeda] = { indisponivel: true };
      }
    })
  );

  // Só cacheia se pelo menos uma moeda veio com sucesso — evita "travar"
  // o TTL inteiro num momento de instabilidade pontual da API do BCB.
  if (Object.values(resultado).some((r) => !r.indisponivel)) gravarCache(resultado);
  return resultado;
}
