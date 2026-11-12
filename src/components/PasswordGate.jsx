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
    return false; // sessionStorage indisponível (ex.: modo privado restrito) — pede senha de novo
  }
}

function marcarDesbloqueado() {
  try {
    window.sessionStorage.setItem(CHAVE_SESSAO, "1");
  } catch {
    // Sem sessionStorage a sessão simplesmente não persiste entre reloads — não é crítico.
  }
}

// Usado pelo botão "Sair" em App.jsx — encerra a sessão autenticada. Quem
// chama ainda precisa recarregar a página (window.location.reload()) pra
// PasswordGate remontar e voltar a pedir a senha; só limpar a chave não
// tira a tela atual, já que o estado "desbloqueado" vive no componente.
export function limparSessaoDesbloqueio() {
  try {
    window.sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // Sem sessionStorage não há sessão pra limpar.
  }
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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, #a78bfa 0%, #60a5fa 55%, #67e8f9 100%)" }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <Sparkles size={36} className="text-white" />
          </div>
          <div className="text-white font-extrabold text-3xl tracking-tight">{APP_NAME}</div>
          <div className="text-white/70 text-base mt-1">{APP_TAGLINE}</div>
        </div>

        {/* Form card */}
        <div
          className="w-full rounded-2xl p-7 flex flex-col gap-4"
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          }}
        >
          {semSenhaConfigurada ? (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>Senha de acesso não configurada (VITE_APP_PASSWORD ausente neste build). Contate quem administra o projeto.</span>
            </div>
          ) : (
            <form onSubmit={tentar} className="flex flex-col gap-4">
              <input
                type="password"
                autoFocus
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setErro(false); }}
                placeholder="Senha de acesso"
                className="w-full px-4 py-3 rounded-xl text-base outline-none"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  border: erro ? "2px solid #f43f5e" : "2px solid transparent",
                  color: "#1e293b",
                  fontSize: "1rem",
                }}
              />
              {erro && <span className="text-xs text-rose-200 -mt-2">Senha incorreta.</span>}
              <button
                type="submit"
                className="w-full py-3 rounded-xl text-base font-bold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.95)",
                  color: "#0a6cff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                }}
              >
                Entrar
              </button>
            </form>
          )}
        </div>

        {/* Robot */}
        <img
          src="/cfobot.png"
          alt="CFO Bot"
          style={{ width: 340, objectFit: "contain", filter: "drop-shadow(0 8px 28px rgba(0,0,0,0.2))" }}
        />

        <p className="text-white/40 text-xs text-center">
          Proteção temporária — substituída por autenticação Supabase em breve.
        </p>
      </div>
    </div>
  );
}
