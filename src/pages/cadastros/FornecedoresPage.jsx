import React from "react";
import { SimpleCadastroTable } from "../../components/cadastros/SimpleCadastroTable.jsx";

const CAMPOS = [
  { key: "nome", label: "Nome", largura: "col-span-3", placeholder: "Ex: Fornecedor Atacadista Nacional" },
  { key: "documento", label: "CNPJ/CPF", largura: "col-span-2", placeholder: "00.000.000/0001-00", obrigatorio: false },
];

export default function FornecedoresPage({ data }) {
  const { entidades, addItem, updateItem, removeItem } = data;
  return (
    <SimpleCadastroTable
      titulo="Fornecedores cadastrados" subtitulo="Usados em Contas a Pagar e nos lançamentos de saída"
      campos={CAMPOS} itens={entidades.fornecedores} nomeEntidadeSingular="fornecedor"
      onAdd={(item) => addItem("fornecedores", item)} onUpdate={(id, patch) => updateItem("fornecedores", id, patch)} onRemove={(id) => removeItem("fornecedores", id)}
    />
  );
}
