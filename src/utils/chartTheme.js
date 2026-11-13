// Tema único dos gráficos (Recharts).
//
// Antes cada página repetia stroke="#94a3b8", contentStyle do Tooltip, raio de
// barra e duração de animação na mão — 43 containers, 7 arquivos, sem nada
// compartilhado. Qualquer ajuste de identidade virava busca-e-substitui.
//
// A linguagem visual segue a paleta da marca (roxo → azul → ciano), a mesma
// do login, da sidebar e dos títulos.

// ── Paleta ────────────────────────────────────────────────────────────────
// Marca: usada para séries neutras (receita, saldo, volume).
export const BRAND = {
  roxo: "#7C3AED",
  roxoClaro: "#9F67F5",
  azul: "#2563EB",
  ciano: "#06B6D4",
  lilas: "#8B5CF6",
};

// Semântica: usada quando a série TEM significado de bom/ruim/atenção.
// Não trocar por cor de marca — aqui a cor é informação, não decoração.
export const SEMANTIC = {
  verde: "#059669",
  verdeClaro: "#10B981",
  vermelho: "#DC2626",
  vermelhoClaro: "#EF4444",
  laranja: "#D97706",
  laranjaClaro: "#F59E0B",
  cinza: "#94A3B8",
};

// Sequência para séries categóricas sem significado próprio (pizza, mix).
export const SERIES = [
  BRAND.roxo, BRAND.azul, BRAND.ciano, BRAND.lilas,
  SEMANTIC.verde, SEMANTIC.laranja, BRAND.roxoClaro, SEMANTIC.vermelho,
];

// ── Eixos e grade ─────────────────────────────────────────────────────────
export const EIXO = {
  stroke: "#6B6888",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

export const GRID = {
  stroke: "rgba(100,80,180,0.09)",
  strokeDasharray: "3 3",
  vertical: false,
};

// ── Tooltip ───────────────────────────────────────────────────────────────
export const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid rgba(124,58,237,0.18)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(124,58,237,0.14)",
};

export const TOOLTIP_CURSOR = { fill: "rgba(124,58,237,0.06)" };
export const TOOLTIP_CURSOR_LINHA = { stroke: "rgba(124,58,237,0.35)", strokeWidth: 1 };

export const TOOLTIP_LABEL_STYLE = { color: "#1A1535", fontWeight: 600, marginBottom: 2 };
export const TOOLTIP_ITEM_STYLE = { color: "#6B6888", padding: 0 };

// Props prontas do <Tooltip> — espalhar com {...tooltipProps()}.
// `linha` troca o cursor de faixa (barra) por linha vertical (linha/área).
export function tooltipProps({ linha = false } = {}) {
  return {
    contentStyle: TOOLTIP_STYLE,
    labelStyle: TOOLTIP_LABEL_STYLE,
    itemStyle: TOOLTIP_ITEM_STYLE,
    cursor: linha ? TOOLTIP_CURSOR_LINHA : TOOLTIP_CURSOR,
  };
}

// ── Animação ──────────────────────────────────────────────────────────────
// Uma entrada só, com leve atraso para o gráfico "montar" depois do card.
export const ANIM = {
  isAnimationActive: true,
  animationBegin: 120,
  animationDuration: 750,
  animationEasing: "ease-out",
};

// ── Formas ────────────────────────────────────────────────────────────────
export const RAIO_BARRA = [4, 4, 0, 0];           // coluna vertical
export const RAIO_BARRA_H = [0, 4, 4, 0];         // barra horizontal
export const RAIO_BARRA_CHEIA = [4, 4, 4, 4];     // waterfall / valor negativo

// Linha com ponto que cresce no hover — é daqui que vem a sensação de "vivo".
export function linhaProps(cor, { espessura = 2.25 } = {}) {
  return {
    type: "monotone",
    stroke: cor,
    strokeWidth: espessura,
    dot: { r: 0 },
    activeDot: { r: 5, fill: cor, stroke: "#fff", strokeWidth: 2 },
    ...ANIM,
  };
}

export function areaProps(cor, idGradiente, { espessura = 2 } = {}) {
  return {
    type: "monotone",
    stroke: cor,
    strokeWidth: espessura,
    fill: `url(#${idGradiente})`,
    activeDot: { r: 5, fill: cor, stroke: "#fff", strokeWidth: 2 },
    ...ANIM,
  };
}

// <defs> de gradiente vertical — o preenchimento esmaecido das áreas.
// Usar dentro de <defs>: {gradienteDef("gradCaixa", BRAND.ciano)}
export function gradienteStops(cor, { topo = 0.28, base = 0.02 } = {}) {
  return [
    { offset: "5%", stopColor: cor, stopOpacity: topo },
    { offset: "95%", stopColor: cor, stopOpacity: base },
  ];
}

// ── Superfícies ───────────────────────────────────────────────────────────
// Sombra levemente arroxeada em vez de cinza neutro: é o que faz o card
// "pertencer" à paleta em vez de parecer um retângulo branco solto.
export const SOMBRA_CARD = "0 1px 6px rgba(124,58,237,0.05)";
export const SOMBRA_CARD_HOVER = "0 4px 16px rgba(124,58,237,0.10)";
export const BORDA_CARD = "rgba(100,80,180,0.12)";
export const BORDA_CARD_HOVER = "rgba(100,80,180,0.24)";

// Faixa de 2px no topo do KPI — a cor carrega o significado do número.
export const KPI_ACENTO = {
  neutral: BRAND.roxo,
  positive: SEMANTIC.verde,
  negative: SEMANTIC.vermelho,
  warning: SEMANTIC.laranja,
  info: BRAND.ciano,
};

// Gradiente vertical para barra: topo saturado, base mais clara. Dá volume
// sem precisar de sombra, que em barra fica suja.
export function gradienteBarraStops(cor, { topo = 1, base = 0.62 } = {}) {
  return [
    { offset: "0%", stopColor: cor, stopOpacity: topo },
    { offset: "100%", stopColor: cor, stopOpacity: base },
  ];
}
