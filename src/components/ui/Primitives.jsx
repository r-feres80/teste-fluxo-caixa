import React, { useState, useEffect } from "react";
import { Info, AlertTriangle, X } from "lucide-react";

export function Panel({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-200">
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

export function KPI({ label, value, sub, tone = "neutral", icon: Icon, basis }) {
  const toneColor = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-rose-600" : "text-slate-800";
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs font-medium uppercase tracking-wide flex items-center gap-1">{label}<BasisHint basis={basis} /></span>
        {Icon && <Icon size={16} className="text-slate-400" />}
      </div>
      <span className={`font-mono tabular-nums text-2xl font-semibold ${toneColor}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
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
export function Gauge({ label, value, min = 0, max, bands, formatValue = (v) => String(v), sub, meta }) {
  const cx = 110, cy = 100, r = 82, espessura = 18;
  if (value == null) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 flex flex-col items-center gap-1">
        <span className="text-slate-500 text-xs font-medium uppercase tracking-wide self-start">{label}</span>
        <div className="h-[110px] flex items-center justify-center text-slate-300 text-sm">Sem dados</div>
      </div>
    );
  }
  const clamped = Math.max(min, Math.min(value, max));
  const paraAngulo = (v) => ((v - min) / (max - min)) * 180;
  const ponteiro = pontoVelocimetro(cx, cy, r - espessura / 2 - 8, paraAngulo(clamped));

  let anterior = min;
  const segmentos = bands.map((b, i) => {
    const t1 = paraAngulo(anterior);
    const t2 = paraAngulo(Math.min(b.upTo, max));
    anterior = b.upTo;
    const p1 = pontoVelocimetro(cx, cy, r, t1);
    const p2 = pontoVelocimetro(cx, cy, r, t2);
    return <path key={i} d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`} stroke={b.color} strokeWidth={espessura} fill="none" />;
  });

  // Marcador de meta: traço radial curto sobre o arco, na posição do valor-alvo
  // — não recalcula nada, só indica visualmente onde a meta cai na régua.
  const metaClamped = meta != null ? Math.max(min, Math.min(meta, max)) : null;
  const metaAngulo = metaClamped != null ? paraAngulo(metaClamped) : null;
  const metaP1 = metaAngulo != null ? pontoVelocimetro(cx, cy, r - espessura - 3, metaAngulo) : null;
  const metaP2 = metaAngulo != null ? pontoVelocimetro(cx, cy, r + 3, metaAngulo) : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 flex flex-col items-center gap-0.5">
      <span className="text-slate-500 text-xs font-medium uppercase tracking-wide self-start">{label}</span>
      <svg viewBox="0 0 220 112" width="100%" height="112">
        {segmentos}
        {metaP1 && metaP2 && <line x1={metaP1.x} y1={metaP1.y} x2={metaP2.x} y2={metaP2.y} stroke="#1e293b" strokeWidth={2} strokeDasharray="1 2" />}
        <line x1={cx} y1={cy} x2={ponteiro.x} y2={ponteiro.y} stroke="#1e293b" strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill="#1e293b" />
      </svg>
      <span className="font-mono tabular-nums text-xl font-semibold text-slate-800 -mt-3">{formatValue(value)}</span>
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
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
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
