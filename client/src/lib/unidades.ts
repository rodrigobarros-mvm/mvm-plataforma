// ─── Configuração das Unidades Gallotti Tractor ───────────────────────────────
export type UnidadeKey = "bahia" | "piaui";

export const UNIDADES: Record<UnidadeKey, {
  key: UnidadeKey;
  nome: string;
  nomeCompleto: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  estado: string;
  cor: string;
}> = {
  bahia: {
    key: "bahia",
    nome: "Gallotti Tractor — Bahia",
    nomeCompleto: "Gallotti Tractor Comercio de Tratores e Maquinas Agricolas LTDA",
    cnpj: "54.931.200/0001-97",
    endereco: "Av. Enedino Alves da Paixao, 1654 — Santa Cruz",
    cidade: "Luis Eduardo Magalhaes",
    uf: "BA",
    cep: "47855-244",
    estado: "Bahia",
    cor: "#0a1e5a",
  },
  piaui: {
    key: "piaui",
    nome: "Gallotti Tractor — Piaui",
    nomeCompleto: "Gallotti Tractor Comercio de Tratores e Maquinas Agricolas LTDA",
    cnpj: "54.931.200/0002-78",
    endereco: "Av. Brasil, 840, Quadra D, Lote 13, Loteamento Novo",
    cidade: "Uruçui",
    uf: "PI",
    cep: "64860-000",
    estado: "Piaui",
    cor: "#7C3AED",
  },
};

export function getUnidade(key: string | null | undefined): typeof UNIDADES[UnidadeKey] {
  return UNIDADES[(key as UnidadeKey) ?? "bahia"] ?? UNIDADES.bahia;
}
