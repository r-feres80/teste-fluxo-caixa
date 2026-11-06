// Funções puras de árvore, reutilizadas pelo Plano de Contas e pelo
// Centro de Custo — ambos são hierarquias com a mesma forma (id, paiId).

/** Converte lista plana (com paiId) em árvore navegável (com .filhos). */
export function montarArvore(itens, paiIdField) {
  const porId = new Map(itens.map((i) => [i.id, { ...i, filhos: [] }]));
  const raizes = [];
  porId.forEach((item) => {
    const paiId = item[paiIdField];
    if (paiId && porId.has(paiId)) {
      porId.get(paiId).filhos.push(item);
    } else {
      raizes.push(item);
    }
  });
  const ordenar = (nos) => {
    nos.sort((a, b) => (a.codigo || a.nome || "").localeCompare(b.codigo || b.nome || ""));
    nos.forEach((n) => ordenar(n.filhos));
  };
  ordenar(raizes);
  return raizes;
}

/** Calcula o nível hierárquico (0 = raiz) de cada item, a partir do paiId. */
export function calcularNivel(itens, itemId, paiIdField) {
  let nivel = 0;
  let atual = itens.find((i) => i.id === itemId);
  const visitados = new Set();
  while (atual && atual[paiIdField] && !visitados.has(atual.id)) {
    visitados.add(atual.id);
    nivel++;
    atual = itens.find((i) => i.id === atual[paiIdField]);
  }
  return nivel;
}

/** Todos os descendentes (ids) de um item, para impedir ciclos e para exclusão em cascata controlada. */
export function descendentesDe(itens, itemId, paiIdField) {
  const filhosDiretos = itens.filter((i) => i[paiIdField] === itemId);
  return filhosDiretos.reduce((acc, f) => [...acc, f.id, ...descendentesDe(itens, f.id, paiIdField)], []);
}

/** Um item não pode ser reatribuído como filho de si mesmo ou de um descendente seu (evita ciclo). */
export function candidatosAPai(itens, itemId, paiIdField) {
  if (!itemId) return itens;
  const bloqueados = new Set([itemId, ...descendentesDe(itens, itemId, paiIdField)]);
  return itens.filter((i) => !bloqueados.has(i.id));
}

/** Impede exclusão de item que ainda tem filhos (regra de integridade da árvore). */
export function temFilhos(itens, itemId, paiIdField) {
  return itens.some((i) => i[paiIdField] === itemId);
}
