import React, { useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "../config/appConfig.js";

// ---------------------------------------------------------------------
// REMENDO TEMPORÁRIO — proteção por senha única e compartilhada (não é
// autenticação por usuário). Existe só para não deixar o app 100% aberto
// enquanto a migração para Supabase (login real, por usuário) não sai.
// Deve ser removido/substituído inteiro quando essa migração acontecer —
// não estender este mecanismo com mais lógica de acesso.
//
// A senha vem de VITE_APP_PASSWORD (variável de ambiente), nunca
// hardcoded no código-fonte — mas como o Vite embute variáveis VITE_* no
// bundle em tempo de BUILD (não de runtime), trocar a senha exige gerar
// um novo build/dist.zip; não é "trocar sem novo deploy" de verdade nesse
// fluxo. Isso só seria possível com uma checagem em servidor (function)
// lendo a env var a cada requisição — fora de escopo deste remendo.
// ---------------------------------------------------------------------

const SENHA_CONFIGURADA = import.meta.env.VITE_APP_PASSWORD;
const CHAVE_SESSAO = "cfo-fi-v2-unlocked";

function jaDesbloqueadoNestaSessao() {
  try {
    return window.sessionStorage.getItem(CHAVE_SESSAO) === "1";
  } catch {
    return false;
  }
}

function marcarDesbloqueado() {
  try {
    window.sessionStorage.setItem(CHAVE_SESSAO, "1");
  } catch {}
}

export function limparSessaoDesbloqueio() {
  try {
    window.sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {}
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
    if (senha === SENHA_CONFIGURADA) {
      marcarDesbloqueado();
      setDesbloqueado(true);
    } else {
      setErro(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #a78bfa 0%, #6366f1 25%, #3b82f6 50%, #38bdf8 75%, #67e8f9 100%)" }}>

      <div className="absolute inset-0 opacity-30"
        style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(99,102,241,0.4) 0%, transparent 50%)" }} />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-2xl tracking-tight drop-shadow-lg">{APP_NAME}</h1>
            <p className="text-white/70 text-sm mt-1">{APP_TAGLINE}</p>
          </div>
        </div>

        <div className="w-full bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-6 shadow-2xl">
          {semSenhaConfigurada ? (
            <div className="flex items-start gap-2 text-sm text-amber-200 bg-amber-500/20 border border-amber-400/30 rounded-lg px-3 py-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>Senha de acesso não configurada (VITE_APP_PASSWORD ausente neste build). Contate quem administra o projeto.</span>
            </div>
          ) : (
            <form onSubmit={tentar} className="flex flex-col gap-3">
              <input
                type="password"
                autoFocus
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setErro(false); }}
                placeholder="Senha de acesso"
                className="w-full bg-white/90 border-0 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-inner"
              />
              {erro && <span className="text-xs text-rose-200 font-medium">Senha incorreta.</span>}
              <button type="submit" className="px-4 py-3 rounded-xl text-sm bg-white hover:bg-white/90 text-blue-600 font-bold transition-colors shadow-lg">
                Entrar
              </button>
            </form>
          )}
        </div>

        <img
          src="/cfobot.png"
          alt="CFO Bot"
          className="w-40 drop-shadow-2xl"
          style={{ filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.18))" }}
        />

        <p className="text-[10px] text-white/50 text-center leading-snug">
          Proteção temporária por senha única — será substituída por autenticação Supabase em breve.
        </p>
      </div>
    </div>
  );
}
