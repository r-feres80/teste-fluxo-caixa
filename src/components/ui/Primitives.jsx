import React, { useState, useEffect, useId } from "react";
import { Info, AlertTriangle, X } from "lucide-react";
import { SOMBRA_CARD, SOMBRA_CARD_HOVER, BORDA_CARD, BORDA_CARD_HOVER } from "../../utils/chartTheme.js";

// Superfície padrão de todo painel/gráfico. A borda e a sombra puxam para o
// roxo da marca em vez de cinza neutro — é o que tira o aspecto de "retângulo
// branco solto" sem precisar encher a tela de cor.
export function Panel({ title, subtitle, right, children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl transition-[box-shadow,border-color] duration-200 ${className}`}
      style={{ border: `1px solid ${BORDA_CARD}`, boxShadow: SOMBRA_CARD }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = SOMBRA_CARD_HOVER;
        e.currentTarget.style.borderColor = BORDA_CARD_HOVER;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = SOMBRA_CARD;
        e.currentTarget.style.borderColor = BORDA_CARD;
      }}
    >
      {(title || right) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${BORDA_CARD}` }}>
          <div>
            {title && <h3 className="text-slate-800 font-semibold text-sm tracking-wide uppercase">{title}</h3>}
            {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// Tooltip curto (título nativo do navegador, sem estado/componente extra) que
// explica se o KPI segue Regime de Caixa (Data de Baixa/Pagamento) ou Regime
// de Competência (Data de Competência) — evita a leitura errada de "por que
// esse número não bate com aquele outro".
export const BASIS_LABEL = {
  caixa: "Regime de Caixa: considera a Data de Baixa/Pagamento (quando o dinheiro efetivamente entrou/saiu). Pode divergir do resultado por Competência.",
  competencia: "Regime de Competência: considera a Data de Competência (quando a receita/despesa foi reconhecida), independente de quando o caixa se movimentou.",
};

export function BasisHint({ basis }) {
  if (!basis || !BASIS_LABEL[basis]) return null;
  return <Info size={11} className="text-slate-300 shrink-0 cursor-help" title={BASIS_LABEL[basis]} />;
}

export function KPI({ label, value, sub, tone = "neutral", icon: Icon, basis, tooltip }) {
  const toneColor =
    tone === "positive" ? "text-emerald-600" :
    tone === "negative" ? "text-rose-600"    :
    "text-slate-800";

  // Accent line gradient by tone
  const accentGrad =
    tone === "positive" ? "from-emerald-400 to-teal-400"  :
    tone === "negative" ? "from-rose-400 to-orange-400"   :
    "from-blue-500 to-cyan-400";

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
      {/* accent line */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${accentGrad} opacity-80`} />
      <div className="p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wide flex items-center gap-1">
            {label}<BasisHint basis={basis} />
            {tooltip && <Info size={11} className="text-slate-300 shrink-0 cursor-help" title={tooltip} />}
          </span>
          {Icon && <Icon size={16} className="text-slate-400" />}
        </div>
        <span
          className={`tabular-nums text-2xl font-semibold ${toneColor}`}
          style={{ fontFamily: "'JetBrains Mono', 'Fira Mono', monospace", letterSpacing: '-.02em' }}
        >
          {value}
        </span>
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}

// Ponto no arco do velocímetro para um ângulo t em [0,180] (0 = extremo
// esquerdo/mínimo, 180 = extremo direito/máximo), passando pelo topo em 90.
function pontoVelocimetro(cx, cy, r, t) {
  const anguloPadrao = 180 - t;
  const rad = (anguloPadrao * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

/**
 * Velocímetro (gauge) semicircular com faixas verde/amarelo/vermelho.
 * `bands`: lista ascendente [{ upTo, color }] cobrindo de `min` até `max`.
 * O valor é sempre exibido por extenso (formatValue), mesmo quando excede
 * `max` — só o ponteiro fica "preso" no extremo do arco.
 */
export function Gauge({ label, value, min = 0, max, bands, formatValue = (v) => String(v), sub, meta, tooltip }) {
  const cx = 110, cy = 100, r = 82, espessura = 18;
  const needleLen = r - espessura / 2 - 8; // 65px
  // Há 3 velocímetros na mesma tela: sem id próprio por instância, os
  // gradientes colidiriam e todos herdariam a paleta do primeiro.
  const uid = useId().replace(/:/g, "");

  // Animação do ponteiro: começa apontando para mínimo (-90°) e gira até o valor real.
  // Alpha = t - 90 onde t = ((value-min)/(max-min)) * 180
  const [alpha, setAlpha] = useState(-90); // -90 = apontando para a esquerda (mínimo)
  useEffect(() => {
    if (value == null) return;
    const clamped = Math.max(min, Math.min(value, max));
    const t = ((clamped - min) / (max - min)) * 180;
    const timer = setTimeout(() => setAlpha(t - 90), 150);
    return () => clearTimeout(timer);
  }, [value, min, max]);

  if (value == null) {
    return (
      <div
        className="bg-white rounded-xl p-5 flex flex-col items-center gap-1"
        style={{ border: `1px solid ${BORDA_CARD}`, boxShadow: SOMBRA_CARD }}
      >
        <span className="text-slate-500 text-xs font-medium uppercase tracking-wide self-start flex items-center gap-1">
          {label}{tooltip && <Info size={11} className="text-slate-300 shrink-0 cursor-help" title={tooltip} />}
        </span>
        <div className="h-[110px] flex items-center justify-center text-slate-300 text-sm">Sem dados</div>
      </div>
    );
  }
  const paraAngulo = (v) => ((v - min) / (max - min)) * 180;

  // Faixa em que o valor caiu. A cor dela vai para o ponteiro e para o número —
  // antes a cor vivia só no arco, então era preciso comparar a posição do
  // ponteiro com o arco pra saber se o indicador estava bom ou ruim.
  const clamped = Math.max(min, Math.min(value, max));
  const faixaAtiva = bands.find((b) => clamped <= b.upTo) ?? bands[bands.length - 1];
  const corAtiva = faixaAtiva.color;

  // Vão angular entre faixas: com ponta arredondada, encostar uma na outra
  // vira um borrão. O vão deixa a leitura das zonas explícita.
  const VAO = 1.6;
  let anterior = min;
  const segmentos = bands.map((b, i) => {
    const bruto1 = paraAngulo(anterior);
    const bruto2 = paraAngulo(Math.min(b.upTo, max));
    anterior = b.upTo;
    const t1 = i === 0 ? bruto1 : bruto1 + VAO;
    const t2 = i === bands.length - 1 ? bruto2 : bruto2 - VAO;
    if (t2 <= t1) return null;
    const p1 = pontoVelocimetro(cx, cy, r, t1);
    const p2 = pontoVelocimetro(cx, cy, r, t2);
    return (
      <path
        key={i}
        d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`}
        stroke={`url(#gaugeBand-${uid}-${i})`}
        strokeWidth={espessura}
        strokeLinecap="round"
        fill="none"
      />
    );
  });

  // Trilho discreto por baixo: fecha a volta mesmo onde há vão, para o arco
  // ler como um instrumento e não como três traços soltos.
  const trilhoP1 = pontoVelocimetro(cx, cy, r, 0);
  const trilhoP2 = pontoVelocimetro(cx, cy, r, 180);

  // Marcador de meta: traço radial curto sobre o arco
  const metaClamped = meta != null ? Math.max(min, Math.min(meta, max)) : null;
  const metaAngulo = metaClamped != null ? paraAngulo(metaClamped) : null;
  const metaP1 = metaAngulo != null ? pontoVelocimetro(cx, cy, r - espessura - 3, metaAngulo) : null;
  const metaP2 = metaAngulo != null ? pontoVelocimetro(cx, cy, r + 3, metaAngulo) : null;

  return (
    <div
      className="bg-white rounded-xl p-5 flex flex-col items-center gap-0.5 transition-[box-shadow,border-color] duration-200"
      style={{ border: `1px solid ${BORDA_CARD}`, boxShadow: SOMBRA_CARD }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = SOMBRA_CARD_HOVER;
        e.currentTarget.style.borderColor = BORDA_CARD_HOVER;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = SOMBRA_CARD;
        e.currentTarget.style.borderColor = BORDA_CARD;
      }}
    >
      <span className="text-slate-500 text-xs font-medium uppercase tracking-wide self-start flex items-center gap-1">
        {label}{tooltip && <Info size={11} className="text-slate-300 shrink-0 cursor-help" title={tooltip} />}
      </span>
      <svg viewBox="0 0 220 112" width="100%" height="112">
        <defs>
          {bands.map((b, i) => (
            <linearGradient key={i} id={`gaugeBand-${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={b.color} stopOpacity={1} />
              <stop offset="100%" stopColor={b.color} stopOpacity={0.72} />
            </linearGradient>
          ))}
        </defs>

        <path
          d={`M ${trilhoP1.x} ${trilhoP1.y} A ${r} ${r} 0 0 1 ${trilhoP2.x} ${trilhoP2.y}`}
          stroke="#EEF0F7" strokeWidth={espessura} strokeLinecap="round" fill="none"
        />
        {segmentos}

        {metaP1 && metaP2 && (
          <line x1={metaP1.x} y1={metaP1.y} x2={metaP2.x} y2={metaP2.y}
            stroke="#475569" strokeWidth={1.5} strokeDasharray="2 2" strokeLinecap="round" />
        )}

        {/* Ponteiro afilado na cor da faixa atual. O triângulo lê como agulha
            de instrumento; a linha reta anterior lia como risco solto. */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${alpha}deg)`,
            transition: "transform 1100ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <polygon
            points={`${cx - 4.5},${cy} ${cx},${cy - needleLen} ${cx + 4.5},${cy}`}
            fill={corAtiva}
          />
        </g>
        <circle cx={cx} cy={cy} r={7} fill="#fff" />
        <circle cx={cx} cy={cy} r={5} fill={corAtiva} />
        <circle cx={cx} cy={cy} r={2} fill="#fff" />
      </svg>
      {/* mt-1 e não -mt-3: o eixo do ponteiro fica em cy=100 de um viewBox de
          112, então margem negativa jogava o número em cima do eixo. */}
      <span className="font-mono tabular-nums text-2xl font-bold mt-1" style={{ color: corAtiva }}>
        {formatValue(value)}
      </span>
      {meta != null && <span className="text-[11px] text-slate-400">Meta: {formatValue(meta)}</span>}
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

export function Badge({ children, tone = "slate" }) {
  const map = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    indigo: "bg-brand-lilac/20 text-brand-violet-deep border-brand-lilac/50",
  };
  return <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${map[tone]}`}>{children}</span>;
}

export function IconBtn({ onClick, title, children, tone = "slate", disabled = false }) {
  const map = {
    slate: "hover:bg-slate-100 text-slate-400 hover:text-slate-800",
    rose: "hover:bg-rose-50 text-slate-500 hover:text-rose-600",
    emerald: "hover:bg-emerald-50 text-slate-500 hover:text-emerald-600",
  };
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={`p-1.5 rounded transition-colors ${disabled ? "opacity-30 cursor-not-allowed" : map[tone]}`}>
      {children}
    </button>
  );
}

export function InfoNote({ children, tone = "slate" }) {
  const cls = tone === "amber" ? "text-amber-700 border-amber-200 bg-amber-50" : "text-slate-500 border-slate-200 bg-slate-50";
  return (
    <div className={`flex items-start gap-2 text-xs rounded px-3 py-2 border ${cls}`}>
      <Info size={13} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export const inputCls = "w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500";
export const selectCls = inputCls;

const isoParaBR = (iso) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : "";
};

/**
 * Substitui <input type="date"> nativo: o widget nativo do navegador exibe
 * a data no formato do locale do SISTEMA OPERACIONAL/navegador (en-US vira
 * MM/DD/AAAA), não no formato da aplicação — HTML5 não dá controle sobre
 * isso via CSS/JS. Este componente é um texto mascarado DD/MM/AAAA que
 * nunca muda de formato, e converte para ISO ("YYYY-MM-DD") só na saída
 * via onChange, mantendo o mesmo contrato de um input de data controlado.
 */
export function DateInputBR({ value, onChange, className = "" }) {
  const [texto, setTexto] = useState(isoParaBR(value));

  useEffect(() => { setTexto(isoParaBR(value)); }, [value]);

  const handleChange = (e) => {
    const digitos = e.target.value.replace(/\D/g, "").slice(0, 8);
    let formatado = digitos;
    if (digitos.length > 4) formatado = `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
    else if (digitos.length > 2) formatado = `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
    setTexto(formatado);
    if (digitos.length === 8) {
      const dd = digitos.slice(0, 2), mm = digitos.slice(2, 4), aaaa = digitos.slice(4, 8);
      onChange(`${aaaa}-${mm}-${dd}`);
    } else if (digitos.length === 0) {
      onChange("");
    }
  };

  return (
    <input type="text" inputMode="numeric" placeholder="DD/MM/AAAA" value={texto} onChange={handleChange}
      maxLength={10} className={className} />
  );
}

export function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-slate-500 text-[11px] uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}

export function EmptyState({ titulo, descricao, acao }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 gap-2">
      <div className="text-slate-800 font-medium text-sm">{titulo}</div>
      {descricao && <div className="text-slate-500 text-xs max-w-sm">{descricao}</div>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}

/** Diálogo de confirmação — usado antes de qualquer exclusão (item 22). */
export function ConfirmDialog({ open, titulo, mensagem, onConfirm, onCancel, tone = "rose" }) {
  if (!open) return null;
  const toneBtn = tone === "rose" ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500";
  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-slate-800 font-semibold text-sm">{titulo}</div>
            <div className="text-slate-500 text-xs mt-1">{mensagem}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="px-3 py-1.5 rounded text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={onConfirm} className={`px-3 py-1.5 rounded text-sm text-white font-medium ${toneBtn}`}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

/** Hook simples para controlar um ConfirmDialog a partir de qualquer página. */
export function useConfirm() {
  const [state, setState] = useState({ open: false, titulo: "", mensagem: "", onConfirm: null });
  const pedirConfirmacao = (titulo, mensagem, onConfirm) => setState({ open: true, titulo, mensagem, onConfirm });
  const fechar = () => setState((s) => ({ ...s, open: false }));
  const confirmar = () => { state.onConfirm?.(); fechar(); };
  const Dialog = () => <ConfirmDialog open={state.open} titulo={state.titulo} mensagem={state.mensagem} onConfirm={confirmar} onCancel={fechar} />;
  return { pedirConfirmacao, ConfirmDialogSlot: Dialog };
}

export function Toggle({ value, onChange, onLabel = "Ativo", offLabel = "Inativo" }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`text-[11px] px-2 py-0.5 rounded border font-medium ${value ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {value ? onLabel : offLabel}
    </button>
  );
}

export function EditableCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(String(value));
  if (editing) {
    return (
      <input autoFocus type="number" value={temp} onChange={(e) => setTemp(e.target.value)}
        onBlur={() => { onChange(Number(temp) || 0); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { onChange(Number(temp) || 0); setEditing(false); } }}
        className="w-20 bg-white border border-emerald-600 rounded px-1 py-0.5 text-right font-mono tabular-nums text-xs text-slate-800 focus:outline-none" />
    );
  }
  return (
    <button onClick={() => { setTemp(String(value)); setEditing(true); }}
      className={`w-20 text-right font-mono tabular-nums text-xs px-1 py-0.5 rounded hover:bg-slate-100 ${value < 0 ? "text-rose-600" : "text-slate-700"}`}>
      {value === 0 ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
    </button>
  );
}
