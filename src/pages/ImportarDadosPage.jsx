import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, CheckCircle2, XCircle } from "lucide-react";
import { Panel, Badge, InfoNote } from "../components/ui/Primitives.jsx";
import { fmtBRL } from "../utils/formatUtils.js";
import { normalizarLinha, marcarDuplicados, COLUNAS_TEMPLATE_LANCAMENTOS } from "../financial-engine/importacao.js";

export default function ImportarDadosPage({ data }) {
  const { entidades, addItem, sincronizarPeriodoComReferencia } = data;
  const [linhas, setLinhas] = useState(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [importado, setImportado] = useState(false);

  const baixarTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([COLUNAS_TEMPLATE_LANCAMENTOS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    XLSX.writeFile(wb, "template-lancamentos.xlsx");
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArquivo(file.name);
    setImportado(false);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
      const normalizadas = rows.map((r) => normalizarLinha(r, entidades));
      const finais = marcarDuplicados(normalizadas, entidades.lancamentos);
      setLinhas(finais);
    };
    reader.readAsBinaryString(file);
  };

  const validos = linhas?.filter((l) => l.lancamento) ?? [];
  const invalidos = linhas?.filter((l) => !l.lancamento) ?? [];

  const confirmarImportacao = () => {
    validos.forEach((l) => addItem("lancamentos", l.lancamento));
    sincronizarPeriodoComReferencia();
    setImportado(true);
    setLinhas(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <InfoNote>Fluxo: 1) ler arquivo → 2) prévia → 3) validar campos → 4) mostrar válidos/inválidos → 5) só então confirmar. Registros faltantes (Empresa, Conta, Centro de Custo, Cliente/Fornecedor) são criados automaticamente. Registros já existentes não são duplicados.</InfoNote>

      <Panel title="Importar Lançamentos (XLSX ou CSV)">
        <div className="flex items-center gap-3">
          <label className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2 cursor-pointer">
            <Upload size={15} /> Selecionar arquivo
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </label>
          <button onClick={baixarTemplate} className="px-4 py-2 rounded text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2">
            <Download size={15} /> Baixar template (XLSX)
          </button>
          {nomeArquivo && <span className="text-xs text-slate-500">{nomeArquivo}</span>}
        </div>
        {importado && <div className="mt-3"><InfoNote tone="amber">{validos.length} lançamento(s) importado(s) com sucesso.</InfoNote></div>}
      </Panel>

      {linhas && (
        <Panel title="Prévia da Importação" subtitle={`${linhas.length} linha(s) lida(s) — ${validos.length} válida(s), ${invalidos.length} inválida(s)`}
          right={validos.length > 0 && <button onClick={confirmarImportacao} className="px-4 py-1.5 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium">Confirmar importação de {validos.length} lançamento(s)</button>}
        >
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500 uppercase border-b border-slate-200"><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Empresa</th><th className="py-2 pr-3">Documento</th><th className="py-2 pr-3">Valor</th><th className="py-2 pr-3">Avisos</th><th className="py-2 pr-3">Erros</th></tr></thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5 pr-3 text-slate-400">{i + 1}</td>
                    <td className="py-1.5 pr-3">{l.lancamento ? <Badge tone="emerald">Válida</Badge> : <Badge tone="rose">Inválida</Badge>}</td>
                    <td className="py-1.5 pr-3 text-slate-600">{l.linhaOriginal["Empresa"]}</td>
                    <td className="py-1.5 pr-3 text-slate-600">{l.linhaOriginal["Documento"]}</td>
                    <td className="py-1.5 pr-3 text-slate-600">{l.linhaOriginal["Valor"]}</td>
                    <td className="py-1.5 pr-3 text-blue-600 text-xs">{l.avisos?.length > 0 ? l.avisos.join("; ") : ""}</td>
                    <td className="py-1.5 pr-3 text-rose-600">{l.erros.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
