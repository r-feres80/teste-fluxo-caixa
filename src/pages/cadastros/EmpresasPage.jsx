import React from "react";
import { SimpleCadastroTable } from "../../components/cadastros/SimpleCadastroTable.jsx";

const CAMPOS = [
  { key: "nome", label: "Nome", largura: "col-span-3", placeholder: "Ex: Comércio ABC Ltda" },
  { key: "cnpj", label: "CNPJ", largura: "col-span-2", placeholder: "00.000.000/0001-00", obrigatorio: false },
];

export default function EmpresasPage({ data }) {
  const { entidades, addItem, updateItem, removeItem } = data;
  return (
    <SimpleCadastroTable
      titulo="Empresas cadastradas" subtitulo="Empresas do grupo — usadas em Unidades, Contas Bancárias, Centros de Custo e Lançamentos"
      campos={CAMPOS} itens={entidades.empresas} nomeEntidadeSingular="empresa"
      onAdd={(item) => addItem("empresas", item)} onUpdate={(id, patch) => updateItem("empresas", id, patch)} onRemove={(id) => removeItem("empresas", id)}
    />
  );
}
