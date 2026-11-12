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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg,#A78BFA 0%,#60A5FA 55%,#67E8F9 100%)" }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
          >
            <Sparkles size={36} className="text-white" />
          </div>
          <div>
            <div className="text-white font-extrabold text-3xl tracking-tight">{APP_NAME}</div>
            <div className="text-white/70 text-base mt-1">{APP_TAGLINE}</div>
          </div>
        </div>

        {/* Card de login */}
        <div
          className="w-full rounded-2xl p-7 flex flex-col gap-4"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.3)", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}
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
                  background: "rgba(255,255,255,0.9)",
                  border: erro ? "2px solid #f87171" : "2px solid transparent",
                  color: "#1e293b",
                  fontSize: "1rem",
                }}
              />
              {erro && <span className="text-sm text-red-200 font-medium">Senha incorreta.</span>}
              <button
                type="submit"
                className="w-full py-3 rounded-xl text-base font-bold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.95)", color: "#0A6CFF", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
              >
                Entrar
              </button>
            </form>
          )}
        </div>

        {/* Mascote centralizado abaixo do login */}
        <img
          src="/cfobot.png"
          alt="CFO Bot"
          style={{ width: 340, objectFit: "contain", mixBlendMode: "multiply" }}
        />

        <p className="text-white/40 text-xs text-center">
          Proteção temporária — substituída por autenticação Supabase em breve.
        </p>
      </div>
    </div>
  );
}
