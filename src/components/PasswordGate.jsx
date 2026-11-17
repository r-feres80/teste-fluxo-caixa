import React, { useState } from "react";
import { Lock, AlertTriangle, Sparkles } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "../config/appConfig.js";

// ---------------------------------------------------------------------
// REMENDO TEMPORÁRIO — proteção por senha única e compartilhada (não é
// autenticação por usuário). Deve ser removido/substituído inteiro quando
// a migração para Supabase (login real, por usuário) acontecer.
// A senha vem de VITE_APP_PASSWORD (embutida no bundle em tempo de build).
// ---------------------------------------------------------------------

const SENHA_CONFIGURADA = import.meta.env.VITE_APP_PASSWORD;
const CHAVE_SESSAO = "cfo-fi-v2-unlocked";

function jaDesbloqueadoNestaSessao() {
  try { return window.sessionStorage.getItem(CHAVE_SESSAO) === "1"; }
  catch { return false; }
}
function marcarDesbloqueado() {
  try { window.sessionStorage.setItem(CHAVE_SESSAO, "1"); }
  catch {}
}
export function limparSessaoDesbloqueio() {
  try { window.sessionStorage.removeItem(CHAVE_SESSAO); }
  catch {}
}

export default function PasswordGate({ children }) {
  const [desbloqueado, setDesbloqueado] = useState(jaDesbloqueadoNestaSessao);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);

  if (desbloqueado) return children;

  const semSenhaConfigurada = !SENHA_CONFIGURADA;

  const tentar = (e) => {
    e.preventDefault();
    if (semSenhaConfigurada) return;
    if (senha === SENHA_CONFIGURADA) { marcarDesbloqueado(); setDesbloqueado(true); }
    else setErro(true);
  };

  return (
    // h-screen + overflow-hidden, com o mascote em flex-1/min-h-0: a tela
    // inteira cabe na viewport sem rolagem em qualquer altura de monitor.
    <div
      className="h-screen overflow-hidden flex items-center justify-center px-4 py-6"
      style={{ background: "linear-gradient(145deg,#1E3A8A 0%,#1D4ED8 55%,#0EA5E9 100%)" }}
    >
      <div className="w-full max-w-sm h-full flex flex-col items-center justify-center gap-5">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center shrink-0">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.3)" }}
          >
            <Sparkles size={30} className="text-white" />
          </div>
          <div>
            <div className="font-extrabold text-2xl tracking-tight text-white drop-shadow">
              {APP_NAME}
            </div>
            <div className="text-blue-100 text-sm mt-1 opacity-80">{APP_TAGLINE}</div>
          </div>
        </div>

        {/* Card de login */}
        <div
          className="w-full rounded-2xl p-5 flex flex-col gap-3 shrink-0"
          style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 16px 48px rgba(0,0,0,0.25)", backdropFilter: "blur(16px)" }}
        >
          {semSenhaConfigurada ? (
            <div className="flex items-start gap-2 text-sm text-amber-200 bg-amber-900/30 border border-amber-400/40 rounded-lg px-3 py-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>Senha não configurada (VITE_APP_PASSWORD ausente).</span>
            </div>
          ) : (
            <form onSubmit={tentar} className="flex flex-col gap-3">
              <input
                type="password"
                autoFocus
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setErro(false); }}
                placeholder="Senha de acesso"
                className="w-full px-4 py-3 rounded-xl text-base outline-none"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  border: erro ? "2px solid #f87171" : "2px solid transparent",
                  color: "#1e293b",
                  fontSize: "1rem",
                }}
              />
              {erro && <span className="text-sm font-semibold text-red-200">Senha incorreta.</span>}
              <button
                type="submit"
                className="w-full py-3 rounded-xl text-base font-bold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#ffffff 0%,#DBEAFE 100%)", color: "#1D4ED8", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
              >
                Entrar
              </button>
            </form>
          )}
        </div>

        {/* Mascote — hue-rotate(-45deg) desloca roxo (~270°) → azul (~225°)
            preservando o corpo branco/cinza. */}
        <img
          src="/cfobot.png"
          alt="CFO Bot"
          className="flex-1 min-h-0 w-auto max-w-full object-contain"
          style={{ maxHeight: 420, filter: "hue-rotate(-45deg) saturate(1.2)" }}
        />

        <p className="text-blue-200 text-xs text-center opacity-70 shrink-0">
          Proteção temporária — substituída por autenticação Supabase em breve.
        </p>
      </div>
    </div>
  );
}
