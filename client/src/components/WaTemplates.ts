
// ─── WhatsApp Templates por Segmento LS Tractor Gallotti ─────────────────────
export type WaTemplate = {
  id: string;
  label: string;
  segmentos: string[];
  modelos?: string[];
  message: (vars: { empresa: string; modelo?: string; cidade?: string; decisor?: string }) => string;
};

export const WA_TEMPLATES: WaTemplate[] = [
  {
    id: "abertura_geral",
    label: "Abertura Geral",
    segmentos: [],
    message: ({ empresa, modelo, decisor }) =>
      `Olá${decisor ? `, *${decisor}*` : ""}! 👋\n\nSou consultor da *Gallotti Tractor | LS Tractor* e entrei em contato pois identificamos a *${empresa}* como potencial parceira.\n\n🚜 A LS Tractor é líder sul-coreana em tratores agrícolas com planta no Brasil — linha completa de *25cv a 149cv* com aprovação *FINAME e BNDES*.\n\nPosso apresentar uma proposta personalizada para vocês? Não tomo mais de 5 minutos! 🙏`
  },
  {
    id: "cafeicultura",
    label: "Cafeicultura ☕",
    segmentos: ["Cafeicultura"],
    modelos: ["MT7.80F", "MT7.90F", "MT4"],
    message: ({ empresa, modelo, decisor }) =>
      `Olá${decisor ? `, *${decisor}*` : ""}! 👋\n\nSou consultor da *Gallotti Tractor | LS Tractor*.\n\nIdentificamos que a *${empresa}* trabalha com *café* e quero apresentar uma solução especial: o *${modelo || "MT7.80F Cabinado (82cv)"}* é o ÚNICO trator fruteiro com *cabine original abaixo de 95cv* no Brasil 🏆\n\n✅ Rodagem 280/70R20 específica para ruas de café\n✅ Cabine com ar-condicionado de série\n✅ Aprovação *FINAME* — parcelas acessíveis\n\nPostaria enviar uma comparação com John Deere e Yanmar? Posso mostrar uma diferença de até *R$25.000* a favor da LS. 💰`
  },
  {
    id: "cana",
    label: "Cana-de-Açúcar 🌾",
    segmentos: ["Cana-de-Açúcar"],
    modelos: ["H145", "H125", "Plus 100"],
    message: ({ empresa, modelo, decisor }) =>
      `Olá${decisor ? `, *${decisor}*` : ""}! 👋\n\nSou consultor da *Gallotti Tractor | LS Tractor*.\n\nA *${empresa}* trabalha com cana — nosso *${modelo || "H145 Cabinado (149cv)"}* tem custo de manutenção *até 20% menor* que concorrentes e peças disponíveis aqui no Nordeste.\n\n🔧 Garantia de 2 anos\n💳 Aprovação BNDES e FINAME\n📦 Entrega em até 30 dias\n\nQuando seria uma boa semana para apresentar uma proposta? Tenho condições especiais para esse trimestre! 🤝`
  },
  {
    id: "pecuaria",
    label: "Pecuária 🐄",
    segmentos: ["Pecuária de Corte / Mista", "Suinocultura / Avicultura"],
    modelos: ["MT4", "G40", "Plus 100"],
    message: ({ empresa, modelo, decisor }) =>
      `Olá${decisor ? `, *${decisor}*` : ""}! 👋\n\nSou consultor da *Gallotti Tractor | LS Tractor*.\n\nPara pecuária como a *${empresa}*, temos a linha perfeita: o *${modelo || "MT4 70 Cabinado (70cv)"}* é ideal para movimentação de ração, silagem e manutenção de pastagens.\n\n🐄 Baixo consumo de combustível\n🔧 Assistência técnica no Nordeste\n💳 Financiamento FINAME — entrada a partir de 10%\n\nPosso enviar uma ficha técnica + simulação de financiamento? 📋`
  },
  {
    id: "fruticultura",
    label: "Fruticultura 🍊",
    segmentos: ["Fruticultura / Lavoura Permanente", "Citricultura"],
    modelos: ["MT7.80F", "MT7.90F", "MT4"],
    message: ({ empresa, modelo, decisor }) =>
      `Olá${decisor ? `, *${decisor}*` : ""}! 👋\n\nSou consultor da *Gallotti Tractor | LS Tractor*.\n\nPara fruticultura como a *${empresa}*, nosso *${modelo || "MT7.80F Cabinado (82cv)"}* é referência no Brasil — cabine original, carregadora frontal opcional e altura de engate perfeita para pomares.\n\n🍊 Rodagem estreita para entre-linhas\n❄️ Cabine climatizada de série\n✅ Aprovação BNDES — financiamento facilitado\n\nPosso visitar ou fazer uma apresentação online esta semana? 📱`
  },
  {
    id: "graos",
    label: "Grãos / Lavouras 🌱",
    segmentos: ["Grãos / Lavouras Temporárias", "Serviços Agrícolas / Pós-Colheita"],
    modelos: ["H145", "H125", "Plus 100", "MT7.90F"],
    message: ({ empresa, modelo, decisor }) =>
      `Olá${decisor ? `, *${decisor}*` : ""}! 👋\n\nSou consultor da *Gallotti Tractor | LS Tractor*.\n\nPara operações de *lavoura* como a *${empresa}*, o *${modelo || "H125 Cabinado (134cv)"}* oferece potência e economia que fazem diferença no custo por hectare.\n\n📊 Consumo até 15% menor que concorrentes\n🔩 Transmissão PowerShuttle 16x16\n💳 FINAME + BNDES disponíveis\n\nTenho disponibilidade para apresentar uma comparação técnica esta semana. Qual o melhor horário? ⏰`
  },
  {
    id: "servicos_agro",
    label: "Serviços Agrícolas 🚜",
    segmentos: ["Manutenção de Máquinas Agrícolas", "Serviços Agrícolas / Pós-Colheita"],
    modelos: ["MT4", "G40", "MT2.27"],
    message: ({ empresa, modelo, decisor }) =>
      `Olá${decisor ? `, *${decisor}*` : ""}! 👋\n\nSou consultor da *Gallotti Tractor | LS Tractor*.\n\nPara prestadores de serviço agrícola como a *${empresa}*, nossa linha de *${modelo || "25cv a 149cv"}* oferece o melhor custo operacional do mercado.\n\n🛠️ Assistência técnica no Nordeste\n💰 Revenda com alto valor residual\n📋 Frota: condições especiais a partir de 2 unidades\n\nQuando podemos conversar sobre as necessidades da frota de vocês? 🤝`
  },
  {
    id: "followup_1",
    label: "Follow-up — 2ª Tentativa",
    segmentos: [],
    message: ({ empresa, decisor }) =>
      `Olá${decisor ? `, *${decisor}*` : ""}! 👋\n\nEstou passando novamente da *Gallotti Tractor | LS Tractor*. Entrei em contato anteriormente sobre nossa linha de *tratores agrícolas LS* para a *${empresa}*.\n\nSei que a agenda está sempre cheia — por isso queria apenas saber: existe interesse em conhecer nossas condições? Posso enviar tudo por aqui mesmo, sem compromisso. 🙏\n\nUm retorno rápido já me ajuda muito! 😊`
  },
  {
    id: "followup_2",
    label: "Follow-up — Última Tentativa",
    segmentos: [],
    message: ({ empresa, decisor }) =>
      `Olá${decisor ? `, *${decisor}*` : ""}! 👋\n\nÚltima mensagem da *Gallotti Tractor | LS Tractor* para a *${empresa}*.\n\nCaso não seja o momento ideal agora, sem problema! Fica à vontade para me chamar quando precisar de um trator LS com *FINAME aprovado* e *entrega rápida no Nordeste*.\n\n📞 Qualquer dúvida, é só falar. Sucesso nos negócios! 🚜`
  },
  {
    id: "proposta_finame",
    label: "Proposta FINAME",
    segmentos: [],
    message: ({ empresa, modelo, decisor }) =>
      `Olá${decisor ? `, *${decisor}*` : ""}! 👋\n\nSeguindo nossa conversa sobre o *${modelo || "trator LS"}* para a *${empresa}*:\n\n💳 *Simulação FINAME:*\n• Entrada: a partir de 10%\n• Prazo: até 60 meses\n• Taxa: a partir de 7,5% a.a.\n• Carência: até 12 meses\n\nO processo é simples — preciso apenas do *CNPJ* e *faturamento aproximado* para pré-aprovação em 48h.\n\nVou enviar a ficha técnica completa e a simulação personalizada. Podemos fechar essa semana? 🤝`
  },
];

export function getTemplatesForSegmento(segmento?: string | null): WaTemplate[] {
  if (!segmento) return WA_TEMPLATES;
  const s = segmento.toLowerCase();
  const specific = WA_TEMPLATES.filter(t =>
    t.segmentos.some(seg => s.includes(seg.toLowerCase()) || seg.toLowerCase().includes(s.split(" ")[0].toLowerCase()))
  );
  const general = WA_TEMPLATES.filter(t => t.segmentos.length === 0);
  return specific.length > 0 ? [...specific, ...general] : [...WA_TEMPLATES];
}
