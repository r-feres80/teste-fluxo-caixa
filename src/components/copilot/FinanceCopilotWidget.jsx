import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, AlertTriangle } from "lucide-react";
import { construirResumoExecutivo } from "../../financial-engine/resumoExecutivo.js";

const SUGESTOES = [
  "Por que o caixa diminuiu?",
  "Quais clientes mais consomem capital de giro?",
  "Quais centros de custo estão pressionando o resultado?",
  "O forecast continua confiável?",
];

/**
 * Finance Copilot — botão flutuante disponível em qualquer tela do app.
 * Envia a pergunta do usuário + o resumo executivo já calculado (mesmo
 * indicador que aparece no Dashboard) para a Netlify Function, que repassa
 * para a API da Anthropic com a chave protegida no servidor.
 */
export default function FinanceCopilotWidget({ data }) {
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState([]); // { autor: 'user'|'ia', texto, erro? }
  const [carregando, setCarregando] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensagens, carregando, aberto]);

  async function enviarPergunta(texto) {
    const perguntaFinal = (texto ?? pergunta).trim();
    if (!perguntaFinal || carregando) return;

    setMensagens((m) => [...m, { autor: "user", texto: perguntaFinal }]);
    setPergunta("");
    setCarregando(true);

    try {
      const resumoExecutivo = construirResumoExecutivo({
        entidades: data.entidades, filtros: data.filtros, parametros: data.parametros,
      });

      const resp = await fetch("/api/finance-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: perguntaFinal, resumoExecutivo }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        setMensagens((m) => [...m, { autor: "ia", erro: true, texto: json.error || "Não foi possível consultar a IA agora." }]);
      } else {
        setMensagens((m) => [...m, { autor: "ia", texto: json.resposta }]);
      }
    } catch (err) {
      setMensagens((m) => [...m, { autor: "ia", erro: true, texto: "Falha de conexão ao consultar a IA. Tente novamente." }]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          title="Finance Copilot"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg flex items-center justify-center transition-colors"
        >
          <Sparkles size={22} className="text-slate-950" />
        </button>
      )}

      {aberto && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] h-[560px] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-900">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center"><Sparkles size={14} className="text-slate-950" /></div>
              <div>
                <div className="text-white font-semibold text-sm leading-none">Finance Copilot</div>
                <div className="text-slate-400 text-[10px] mt-0.5">IA sobre os dados deste painel</div>
              </div>
            </div>
            <button onClick={() => setAberto(false)} className="text-slate-400 hover:text-white p-1 rounded"><X size={16} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-slate-50">
            {mensagens.length === 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-slate-500 text-xs">Pergunte algo sobre a situação financeira atual. Exemplos:</p>
                {SUGESTOES.map((s) => (
                  <button key={s} onClick={() => enviarPergunta(s)}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {mensagens.map((m, i) => (
              <div key={i} className={`flex ${m.autor === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.autor === "user" ? "bg-emerald-600 text-white" :
                  m.erro ? "bg-rose-50 text-rose-700 border border-rose-200 flex items-start gap-2" :
                  "bg-white text-slate-700 border border-slate-200"
                }`}>
                  {m.erro && <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
                  <span>{m.texto}</span>
                </div>
              </div>
            ))}

            {carregando && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Analisando os dados…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); enviarPergunta(); }}
            className="border-t border-slate-200 p-3 flex items-center gap-2 bg-white"
          >
            <input
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Pergunte sobre caixa, AR/AP, orçamento…"
              className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              disabled={carregando}
            />
            <button
              type="submit"
              disabled={carregando || !pergunta.trim()}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
            >
              <Send size={15} className="text-slate-950" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
