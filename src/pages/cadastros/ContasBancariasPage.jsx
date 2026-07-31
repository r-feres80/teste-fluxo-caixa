import React from "react";
import { SimpleCadastroTable } from "../../components/cadastros/SimpleCadastroTable.jsx";

export default function ContasBancariasPage({ data }) {
  const { entidades, addItem, updateItem, removeItem } = data;
  const campos = [
    { key: "apelido", label: "Apelido", placeholder: "Ex: Conta Movimento" },
    { key: "bancoId", label: "Banco", tipo: "select", opcoes: entidades.bancos.map((b) => ({ value: b.id, label: b.nome })) },
    { key: "empresaId", label: "Empresa", tipo: "select", opcoes: entidades.empresas.map((e) => ({ value: e.id, label: e.nome })) },
    { key: "agencia", label: "Agência", obrigatorio: false },
    { key: "numero", label: "Número da Conta", obrigatorio: false },
    { key: "saldoInicial", label: "Saldo Inicial (R$)", tipo: "number", obrigatorio: false },
    { key: "semLiquidez", label: "Sem Liquidez?", tipo: "select", obrigatorio: false, opcoes: [{ value: "false", label: "Não (compõe Caixa Livre)" }, { value: "true", label: "Sim (aplicação/reserva)" }] },
  ];
  return (
    <SimpleCadastroTable
      titulo="Contas Bancárias cadastradas" subtitulo="Marque 'sem liquidez' depois na listagem para aplicações que não compõem o Caixa Livre"
      campos={campos} itens={entidades.contasBancarias} nomeEntidadeSingular="conta bancária"
      onAdd={(item) => addItem("contasBancarias", { ...item, semLiquidez: item.semLiquidez || "false", saldoInicial: Number(item.saldoInicial) || 0 })}
      onUpdate={(id, patch) => updateItem("contasBancarias", id, patch.saldoInicial !== undefined ? { ...patch, saldoInicial: Number(patch.saldoInicial) || 0 } : patch)}
      onRemove={(id) => removeItem("contasBancarias", id)}
    />
  );
}
