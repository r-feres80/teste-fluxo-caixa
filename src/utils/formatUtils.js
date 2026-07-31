export const uid = () => Math.random().toString(36).slice(2, 10);

export const fmtBRL = (v) =>
  (v < 0 ? "-" : "") + "R$ " + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtBRLShort = (v) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1000000) return `${sign}R$ ${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}R$ ${(abs / 1000).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
};

// Exibição sempre DD/MM/AAAA (item 21), a partir de uma data ISO armazenada.
// Suporta ambos os formatos: YYYY-MM-DD e DD/MM/YYYY para robustez
export const fmtData = (data) => {
  if (!data) return "—";
  // Se já está em formato DD/MM/YYYY, retorna como está
  if (data.includes("/")) return data;
  // Se está em formato ISO YYYY-MM-DD, converte
  const [a, m, d] = data.split("-");
  if (a && m && d) return `${d}/${m}/${a}`;
  return "—";
};

export const fmtDataHora = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
};
