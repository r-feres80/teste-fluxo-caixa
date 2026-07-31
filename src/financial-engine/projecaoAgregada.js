import { fmtData } from "../utils/formatUtils.js";

export function aggregateSerie(serie, modo) {
  if (modo === "diaria") return serie.map((p) => ({ label: fmtData(p.data), saldoFim: p.saldo, entradas: p.entradas, saidas: p.saidas }));
  if (modo === "semanal") {
    const out = [];
    for (let i = 0; i < serie.length; i += 7) {
      const chunk = serie.slice(i, i + 7);
      out.push({
        label: `${fmtData(chunk[0].data)}–${fmtData(chunk[chunk.length - 1].data)}`,
        saldoFim: chunk[chunk.length - 1].saldo,
        entradas: chunk.reduce((s, c) => s + c.entradas, 0),
        saidas: chunk.reduce((s, c) => s + c.saidas, 0),
      });
    }
    return out;
  }
  const map = new Map();
  serie.forEach((p) => { const key = p.data.slice(0, 7); if (!map.has(key)) map.set(key, []); map.get(key).push(p); });
  return Array.from(map.entries()).map(([key, chunk]) => ({
    label: key, saldoFim: chunk[chunk.length - 1].saldo,
    entradas: chunk.reduce((s, c) => s + c.entradas, 0), saidas: chunk.reduce((s, c) => s + c.saidas, 0),
  }));
}
