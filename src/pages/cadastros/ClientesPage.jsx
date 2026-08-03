import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Upload } from "lucide-react";
import { SimpleCadastroTable } from "../../components/cadastros/SimpleCadastroTable.jsx";
import { Panel, Badge, InfoNote } from "../../components/ui/Primitives.jsx";
import { REGIOES } from "../../config/appConfig.js";

const CAMPOS = [
  { key: "nome", label: "Nome", largura: "col-span-3", placeholder: "Ex: Mercado Central Ltda" },
  { key: "documento", label: "CNPJ/CPF", largura: "col-span-2", placeholder: "00.000.000/0001-00", obrigatorio: false },
  { key: "regiao", label: "Região", largura: "col-span-1", tipo: "select", obrigatorio: false, opcoes: REGIOES.map((r) => ({ value: r, label: r })) },
];

const normalizarTexto = (s) => (s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Import de Região em lote: casa por Nome do Cliente (mesma normalização
// tolerante a acento usada no importador de Lançamentos) e só atualiza o
// campo Região — não cria clientes novos nem toca em outros campos.
function ImportarRegiaoClientes({ clientes, updateItem }) {
  const [linhas, setLinhas] = useState(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [importado, setImportado] = useState(false);
  const [quantidadeImportada, setQuantidadeImportada] = useState(0);

  const baixarTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([["Cliente", "Região"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "template-regiao-clientes.xlsx");
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArquivo(file.name);
    setImportado(false);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "array", raw: true, codepage: 65001 });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
      const processadas = rows.map((row) => {
        const cliente = clientes.find((c) => normalizarTexto(c.nome) === normalizarTexto(row["Cliente"]));
        const regiao = REGIOES.find((r) => normalizarTexto(r) === normalizarTexto(row["Região"]));
        const erro = !cliente ? `Cliente "${row["Cliente"]}" não encontrado` : !regiao ? `Região "${row["Região"]}" inválida (use ${REGIOES.join("/")})` : null;
        return { linhaOriginal: row, cliente, regiao, erro };
      });
      setLinhas(processadas);
    };
    reader.readAsArrayBuffer(file);
  };

  const validas = linhas?.filter((l) => !l.erro) ?? [];

  const confirmar = () => {
    validas.forEach((l) => updateItem("clientes", l.cliente.id, { regiao: l.regiao }));
    setQuantidadeImportada(validas.length);
    setImportado(true);
    setLinhas(null);
  };

  return (
    <Panel title="Importar Região por CSV" subtitle="Popula o campo Região em lote — casa por Nome do Cliente já cadastrado, não cria clientes novos">
      <div className="flex items-center gap-3">
        <label className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2 cursor-pointer">
          <Upload size={15} /> Selecionar arquivo
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        </label>
        <button onClick={baixarTemplate} className="px-4 py-2 rounded text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium">Baixar template</button>
        {nomeArquivo && <span className="text-xs text-slate-500">{nomeArquivo}</span>}
      </div>
      {importado && <div className="mt-3"><InfoNote>{quantidadeImportada} cliente(s) atualizado(s) com sucesso.</InfoNote></div>}
      {linhas && (
        <div className="mt-4 overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-500 uppercase border-b border-slate-200"><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Cliente</th><th className="py-2 pr-3">Região</th><th className="py-2 pr-3">Erro</th></tr></thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3">{l.erro ? <Badge tone="rose">Inválida</Badge> : <Badge tone="emerald">Válida</Badge>}</td>
                  <td className="py-1.5 pr-3 text-slate-600">{l.linhaOriginal["Cliente"]}</td>
                  <td className="py-1.5 pr-3 text-slate-600">{l.linhaOriginal["Região"]}</td>
                  <td className="py-1.5 pr-3 text-rose-600">{l.erro ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {validas.length > 0 && (
            <button onClick={confirmar} className="mt-3 px-4 py-1.5 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
              Confirmar atualização de {validas.length} cliente(s)
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}

export default function ClientesPage({ data }) {
  const { entidades, addItem, updateItem, removeItem } = data;
  return (
    <div className="flex flex-col gap-6">
      <SimpleCadastroTable
        titulo="Clientes cadastrados" subtitulo="Usados em Contas a Receber e nos lançamentos de entrada"
        campos={CAMPOS} itens={entidades.clientes} nomeEntidadeSingular="cliente"
        onAdd={(item) => addItem("clientes", item)} onUpdate={(id, patch) => updateItem("clientes", id, patch)} onRemove={(id) => removeItem("clientes", id)}
      />
      <ImportarRegiaoClientes clientes={entidades.clientes} updateItem={updateItem} />
    </div>
  );
}
