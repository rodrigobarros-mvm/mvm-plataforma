import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, ChevronRight, Award, Zap, MessageCircle,
  CheckCircle2, ArrowRight, Target, BarChart3, Star
} from "lucide-react";

// ── DATA ─────────────────────────────────────────────────────────────────────
const DATA = {"ls": [{"modelo": "J25H", "cv": 25.0, "serie": "Série J (Compacto / Garden)", "versao": "Plataformado", "aplicacao": "Pequenas propriedades, jardins, hortas e aviários", "culturas": "Horticultura, Floricultura, Gramados"}, {"modelo": "J25H Garden", "cv": 25.0, "serie": "Série J (Compacto / Garden)", "versao": "Plataformado", "aplicacao": "Jardinagem e manutenção de áreas verdes", "culturas": "Gramados, Parques, Condomínios"}, {"modelo": "MT2.27 / MT2 27E", "cv": 25.0, "serie": "Série MT2 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Agricultura familiar, pequenas propriedades", "culturas": "Horticultura, Fruticultura, Café, Aviários, Piscicultura"}, {"modelo": "MT1.25", "cv": 25.0, "serie": "Série MT1 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Suporte em pequenas propriedades e estufas", "culturas": "Horticultura, Estufas, Pecuária de leite"}, {"modelo": "G40", "cv": 38.0, "serie": "Série G (Compacto Utilitário)", "versao": "Plataformado", "aplicacao": "Propriedades médias, suporte à produção", "culturas": "Fruticultura, Fumicultura, Pastagem, Café"}, {"modelo": "R50 Plataformado", "cv": 50.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades, lavouras diversificadas", "culturas": "Grãos, Pastagem, Fruticultura, Fumicultura"}, {"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "U60 Plataformado", "cv": 60.0, "serie": "Série U (Utilitário 60cv)", "versao": "Plataformado", "aplicacao": "Lavouras médias e suporte logístico", "culturas": "Grãos, Pecuária, Fruticultura"}, {"modelo": "U60 Cabinado", "cv": 60.0, "serie": "Série U (Utilitário 60cv)", "versao": "Cabinado", "aplicacao": "Operações em condições adversas com conforto", "culturas": "Grãos, Pecuária, Fruticultura"}, {"modelo": "MT7.80F Plataformado", "cv": 82.0, "serie": "Série MT7 (Fruteiro / Especializado)", "versao": "Plataformado", "aplicacao": "Culturas adensadas com máxima maneuvrabilidade", "culturas": "Café, Citrus, Fruticultura, Viticultura"}, {"modelo": "MT7.80F Cabinado", "cv": 82.0, "serie": "Série MT7 (Fruteiro / Especializado)", "versao": "Cabinado", "aplicacao": "Culturas adensadas com conforto operacional", "culturas": "Café, Citrus, Fruticultura"}, {"modelo": "MT7.90F Plataformado", "cv": 93.0, "serie": "Série MT7 (Fruteiro / Especializado)", "versao": "Plataformado", "aplicacao": "Culturas adensadas de maior demanda de potência", "culturas": "Café, Citrus, Fruticultura, Hortifrúti"}, {"modelo": "MT7.90F Cabinado", "cv": 93.0, "serie": "Série MT7 (Fruteiro / Especializado)", "versao": "Cabinado", "aplicacao": "Alta produtividade em culturas especializadas", "culturas": "Café, Citrus, Fruticultura"}, {"modelo": "MT4 70 Plataformado", "cv": 70.0, "serie": "Série MT4 (Utilitário Nacional)", "versao": "Plataformado", "aplicacao": "Propriedades médias, multifuncional", "culturas": "Café, Fruticultura, Horticultura, Fumicultura, Pecuária leiteira"}, {"modelo": "MT4 70 Cabinado", "cv": 70.0, "serie": "Série MT4 (Utilitário Nacional)", "versao": "Cabinado", "aplicacao": "Versatilidade com conforto superior", "culturas": "Café, Fruticultura, Horticultura, Fumicultura"}, {"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}, {"modelo": "Plus 80 Cabinado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Operações de alta produtividade com conforto", "culturas": "Grãos, Pastagem, Cana, Citrus"}, {"modelo": "Plus 90 Plataformado", "cv": 95.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras diversificadas de médio porte", "culturas": "Grãos, Pastagem, Cana"}, {"modelo": "Plus 90 Cabinado", "cv": 95.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em lavouras médias-grandes", "culturas": "Grãos, Pastagem, Cana"}, {"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}, {"modelo": "H 145 Cabinado", "cv": 149.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes áreas, operações pesadas e contínuas", "culturas": "Grãos, Cana, Algodão, Silvicultura"}], "jd": [{"modelo": "3036EN", "cv": 36.0, "serie": "Série 3E/EN (Compacto Especial)", "versao": "Plataformado", "aplicacao": "Operações em espaços reduzidos, estufas e pomares", "culturas": "Horticultura, Fruticultura, Estufas, Condomínios, Hangares"}, {"modelo": "5060E", "cv": 60.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Plataformado", "aplicacao": "Propriedades pequenas e médias, lavouras diversificadas", "culturas": "Grãos, Pastagem, Café, Fruticultura, Hortifrúti"}, {"modelo": "5075E", "cv": 75.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Plataformado", "aplicacao": "Médias propriedades, operações diversas", "culturas": "Grãos, Pastagem, Café, Cana"}, {"modelo": "5075E Cabinado", "cv": 75.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Cabinado", "aplicacao": "Médias propriedades com conforto avançado", "culturas": "Grãos, Pastagem, Café"}, {"modelo": "5080E Cabinado", "cv": 80.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Cabinado", "aplicacao": "Lavouras médias com alta tecnologia de precisão", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "5090E Cabinado", "cv": 90.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Cabinado", "aplicacao": "Alta produtividade em propriedades médias-grandes", "culturas": "Grãos, Pastagem, Cana, Café"}, {"modelo": "5EN Estreito", "cv": null, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Plataformado", "aplicacao": "Culturas adensadas em fileiras estreitas", "culturas": "Café, Citrus, Fruticultura, Viticultura"}, {"modelo": "6110J", "cv": 110.0, "serie": "Série 6J (Médio Nacional)", "versao": "Cabinado / Platf.", "aplicacao": "Médias e grandes propriedades polivalentes", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "6125J", "cv": 125.0, "serie": "Série 6J (Médio Nacional)", "versao": "Cabinado", "aplicacao": "Grandes propriedades e lavouras intensivas", "culturas": "Grãos, Cana, Algodão, Pastagem"}, {"modelo": "6145J", "cv": 145.0, "serie": "Série 6J (Médio Nacional)", "versao": "Cabinado", "aplicacao": "Lavouras de alta demanda energética", "culturas": "Grãos, Cana, Algodão, Silvicultura"}], "decisions_enhanced": [{"perfil": "Agricultura familiar / Subsistência", "recomendacao": "✅ Yanmar", "modelo_ls": "MT2.27 ou J25H", "justificativa": "Yanmar SA221 a R$70k é a mais barata; LS tem mais modelos compactos; JD apenas 3036EN a preço maior"}, {"perfil": "Horticultura / Hortifrúti", "recomendacao": "✅ LS Tractor", "modelo_ls": "MT2.27 / U60 / MT4 70", "justificativa": "LS tem mais modelos e menores preços nos compactos; JD tem M-Modem; Case IH acima do segmento"}, {"perfil": "Cafeicultura / Citrus / Fruticultura", "recomendacao": "✅ LS Tractor", "modelo_ls": "MT7.80F ou MT7.90F Cab", "justificativa": "LS MT7 desenvolvido p/ culturas adensadas com cabine exclusiva; Yanmar YT374 alternativa"}, {"perfil": "Pecuária de leite / Mista pequena", "recomendacao": "✅ LS / Yanmar", "modelo_ls": "R65 ou U60 Cab", "justificativa": "LS e Yanmar oferecem melhor custo-benefício; JD tem mais tech; Case IH acima em preço"}, {"perfil": "Grãos — propriedade pequena/média", "recomendacao": "⚖️ Equivalente", "modelo_ls": "Plus 80 ou Plus 90", "justificativa": "4 marcas competem bem nessa faixa; JD e Case IH com mais tech; LS e Yanmar com melhor custo"}, {"perfil": "Grãos — propriedade grande (>130cv)", "recomendacao": "✅ John Deere", "modelo_ls": "H125 ou H145", "justificativa": "JD lidera em AP e revenda; Case IH AFS Connect é forte alternativa"}, {"perfil": "Grandes lavouras (> 185cv)", "recomendacao": "✅ JD / Case IH", "modelo_ls": "—", "justificativa": "LS e Yanmar não competem nessa faixa; Case IH Puma/Magnum alternativa ao JD"}, {"perfil": "Fumicultura / Pequenas lavouras Sul", "recomendacao": "✅ LS Tractor", "modelo_ls": "R50 ou R65 Plataformado", "justificativa": "LS tem custo menor e suporte via Garuva/SC; Yanmar alternativa competitiva"}, {"perfil": "Produtor com orçamento limitado", "recomendacao": "✅ Yanmar", "modelo_ls": "MT1.25 / MT2.27 / G40", "justificativa": "Yanmar SA221 é a opção mais acessível (R$70k); LS segunda; JD 3036EN mais caro"}, {"perfil": "Cafeicultura e vinicultura (RS/SC/PR)", "recomendacao": "✅ LS Tractor", "modelo_ls": "MT7.80F ou R65", "justificativa": "Fábrica LS em Garuva/SC favorece suporte regional; MT7 ideal p/ fileiras estreitas"}], "prices": [{"faixa": "Entrada compactos (22–40cv)", "ls": "MT2.27/J25H: R$85k–115k", "jd": "3036EN: R$130k–160k", "yanmar": "SA221/SA324: R$70k–105k", "case": "Não compete"}, {"faixa": "Utilitário médio (60–80cv)", "ls": "U60/R65: R$158k–230k", "jd": "5E 75–80cv: R$185k–275k", "yanmar": "YT359/YT374: R$158k–248k", "case": "Farmall 95A Cab: R$255k–300k"}, {"faixa": "Médio-alto (100–130cv)", "ls": "Plus 100/H125: R$278k–440k", "jd": "6J 110–125cv: R$310k–430k", "yanmar": "YT4110/YT5113A: R$290k–400k", "case": "Farmall 110A/130C: R$310k–450k"}, {"faixa": "Alto porte (145–185cv)", "ls": "H145: R$420k–490k", "jd": "6M 145–175cv: R$490k–680k", "yanmar": "YT5125A: R$385k–450k", "case": "Farmall 150C/Maxxum: R$440k–620k"}], "competitor_map": {"John Deere": [{"comp": {"modelo": "3036EN", "cv": 36.0, "serie": "Série 3E/EN (Compacto Especial)", "versao": "Plataformado", "aplicacao": "Operações em espaços reduzidos, estufas e pomares", "culturas": "Horticultura, Fruticultura, Estufas"}, "ls_alts": [{"modelo": "MT1.25", "cv": 25.0, "serie": "Série MT1 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Suporte em pequenas propriedades e estufas", "culturas": "Horticultura, Estufas, Pecuária de leite"}, {"modelo": "MT2.27 / MT2 27E", "cv": 25.0, "serie": "Série MT2 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Agricultura familiar, pequenas propriedades", "culturas": "Horticultura, Fruticultura, Café, Aviários"}]}, {"comp": {"modelo": "5075E", "cv": 75.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Plataformado", "aplicacao": "Médias propriedades, operações diversas", "culturas": "Grãos, Pastagem, Café, Cana"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}]}, {"comp": {"modelo": "5075E Cabinado", "cv": 75.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Cabinado", "aplicacao": "Médias propriedades com conforto avançado", "culturas": "Grãos, Pastagem, Café"}, "ls_alts": [{"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "Plus 80 Cabinado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Operações de alta produtividade com conforto", "culturas": "Grãos, Pastagem, Cana, Citrus"}]}, {"comp": {"modelo": "6110J", "cv": 110.0, "serie": "Série 6J (Médio Nacional)", "versao": "Cabinado", "aplicacao": "Médias e grandes propriedades polivalentes", "culturas": "Grãos, Pastagem, Cana, Algodão"}, "ls_alts": [{"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}]}], "Yanmar": [{"comp": {"modelo": "YT359", "cv": 59.0, "serie": "Série YT3 (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Lavouras médias, operações diversas", "culturas": "Grãos, Pastagem, Café, Citrus, Fumicultura"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}]}, {"comp": {"modelo": "YT374 Cabinado", "cv": 74.0, "serie": "Série YT3 (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Alta produtividade em médias-grandes propriedades", "culturas": "Grãos, Pastagem, Cana"}, "ls_alts": [{"modelo": "Plus 80 Cabinado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Operações de alta produtividade com conforto", "culturas": "Grãos, Pastagem, Cana, Citrus"}]}], "Case IH": [{"comp": {"modelo": "Farmall 75A", "cv": 75.0, "serie": "Série Farmall A (Compacto)", "versao": "Plataformado", "aplicacao": "Propriedades médias diversificadas", "culturas": "Grãos, Café, Pastagem, Hortifrúti"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}]}, {"comp": {"modelo": "Farmall 110A", "cv": 110.0, "serie": "Série Farmall A (Compacto)", "versao": "Cabinado", "aplicacao": "Médias-grandes propriedades polivalentes", "culturas": "Grãos, Cana, Pastagem, Algodão"}, "ls_alts": [{"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}]}]}, "ls_arguments": {"John Deere": {"principal": "Economia real: LS Tractor custa em média 20-35% menos que o equivalente John Deere na mesma faixa de potência, com qualidade sul-coreana comprovada e fabricação nacional em Garuva/SC.", "detalhe": "A John Deere cobra um ágio de marca. O MT7.80F Cabinado (82cv) sai por R$245k–290k, enquanto o JD 5EN equivalente custa R$310k–380k. A diferença de R$65k–90k financia anos de manutenção ou implementos.", "finame": "Ambos aprovados no FINAME/BNDES — mas a parcela LS fica 25-35% menor."}, "Yanmar": {"principal": "LS oferece mais modelos, mais potência e melhor rede de assistência no Nordeste — com preço similar ou até menor na faixa acima de 60cv.", "detalhe": "Abaixo de 40cv a Yanmar é mais barata. Mas de 60cv em diante a LS oferece versões cabinadas exclusivas (MT7 Cabinado) que a Yanmar não tem.", "finame": "Ambas aprovadas FINAME — LS com rede de concessionárias estabelecida no Nordeste."}, "Case IH": {"principal": "LS Tractor entrega potência equivalente por até 40% menos — com aprovação BNDES e entrega no Nordeste em até 30 dias.", "detalhe": "O LS H125 Cabinado (134cv) custa R$420k–460k frente ao Farmall 130C a R$480k–570k. Para a maioria das propriedades do Nordeste, a diferença não é justificada.", "finame": "LS aprovada BNDES com condições diferenciadas para produtores do Norte/Nordeste."}}};

const BRAND_CONFIG: Record<string, { color: string; bg: string; border: string; flag: string }> = {
  "John Deere": { color: "#009900", bg: "#f0fdf4", border: "#86efac", flag: "🟢" },
  "Yanmar":     { color: "#cc6600", bg: "#fff7ed", border: "#fdba74", flag: "🟠" },
  "Case IH":    { color: "#cc0000", bg: "#fef2f2", border: "#fca5a5", flag: "🔴" },
};

const LS_COLOR = "#0a1e5a";
const LS_RED   = "#e21d3c";

type LSModel   = { modelo: string; cv: number | null; serie: string; versao: string; aplicacao: string; culturas: string };
type CompModel = { modelo: string; cv: number | null; serie: string; versao: string; aplicacao: string; culturas: string };
type Mapping   = { comp: CompModel; ls_alts: LSModel[] };

function formatCv(cv: number | null) { return cv ? `${cv}cv` : "—"; }

function priceSaving(brand: string, cv: number | null): string {
  if (!cv) return "";
  if (brand === "John Deere") {
    if (cv <= 40)  return "economia de ~R$20-45k";
    if (cv <= 80)  return "economia de ~R$30-85k";
    if (cv <= 130) return "economia de ~R$30-60k";
    return "economia de ~R$70-190k";
  }
  if (brand === "Yanmar")  return cv <= 40 ? "preço similar" : "economia de ~R$20-40k";
  if (brand === "Case IH") return cv <= 80 ? "economia de ~R$40-70k" : "economia de ~R$60-120k";
  return "";
}

function LSModelCard({ model, saving }: { model: LSModel; saving?: string }) {
  return (
    <div className="rounded-xl border-2 p-4" style={{ borderColor: LS_RED, background: "#fff8f8" }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold" style={{ color: LS_COLOR }}>🚜 {model.modelo}</span>
            {model.versao && (
              <Badge className="text-xs shrink-0" style={{ background: LS_RED + "20", color: LS_RED }}>
                {model.versao}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{model.serie}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-bold" style={{ color: LS_RED }}>{formatCv(model.cv)}</span>
          {saving && <p className="text-xs font-semibold text-green-700 mt-0.5">💰 {saving}</p>}
        </div>
      </div>
      {model.aplicacao && (
        <p className="text-xs text-foreground mt-2 leading-relaxed">{model.aplicacao}</p>
      )}
      {model.culturas && (
        <div className="flex flex-wrap gap-1 mt-2">
          {model.culturas.split(",").slice(0, 4).map(c => (
            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c.trim()}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ArgumentCard({ brand }: { brand: string }) {
  const arg = (DATA.ls_arguments as any)[brand];
  if (!arg) return null;
  return (
    <div className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: LS_COLOR + "40", background: LS_COLOR + "06" }}>
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5" style={{ color: LS_RED }} />
        <p className="text-sm font-bold" style={{ color: LS_COLOR }}>Por que escolher LS Tractor?</p>
      </div>
      <p className="text-sm font-semibold text-foreground leading-relaxed">{arg.principal}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{arg.detalhe}</p>
      <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold" style={{ background: "#f0fdf4", color: "#166534" }}>
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        {arg.finame}
      </div>
    </div>
  );
}

function DecisionCard({ decision }: { decision: any }) {
  const isLS = decision.recomendacao.includes("LS");
  return (
    <div className={`rounded-xl border p-3 ${isLS ? "border-red-200 bg-red-50/40" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-foreground">{decision.perfil}</p>
        <Badge className="text-xs shrink-0" style={{ background: isLS ? LS_RED : "#94a3b8", color: "white" }}>
          {isLS ? "✅ LS" : decision.recomendacao.replace("✅ ", "").replace("⚖️ ", "")}
        </Badge>
      </div>
      {decision.modelo_ls && (
        <p className="text-xs font-mono font-semibold mt-1" style={{ color: LS_COLOR }}>🚜 {decision.modelo_ls}</p>
      )}
      {decision.justificativa && (
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{decision.justificativa}</p>
      )}
    </div>
  );
}

export default function Comparativos() {
  const [, setLocation] = useLocation();
  const [selectedBrand, setSelectedBrand]   = useState<string>("John Deere");
  const [search, setSearch]                 = useState("");
  const [selectedComp, setSelectedComp]     = useState<Mapping | null>(null);
  const [activeTab, setActiveTab]           = useState<"busca" | "perfil" | "precos">("busca");

  const brands = ["John Deere", "Yanmar", "Case IH"];

  const brandMappings: Mapping[] = useMemo(() => {
    const map = (DATA.competitor_map as any)[selectedBrand] ?? [];
    if (!search) return map;
    return map.filter((m: Mapping) =>
      m.comp.modelo.toLowerCase().includes(search.toLowerCase()) ||
      m.comp.aplicacao?.toLowerCase().includes(search.toLowerCase()) ||
      m.comp.culturas?.toLowerCase().includes(search.toLowerCase())
    );
  }, [selectedBrand, search]);

  const cfg = BRAND_CONFIG[selectedBrand];

  const buildWAMsg = (comp: CompModel, alts: LSModel[]) => {
    const modelo_ls = alts[0]?.modelo ?? "nossa linha";
    const arg = (DATA.ls_arguments as any)[selectedBrand]?.principal ?? "";
    return `Olá! Sou da Gallotti Tractor | LS Tractor.\n\nVi que vocês avaliam o *${comp.modelo}* (${selectedBrand}). Gostaria de apresentar o *${modelo_ls}* como alternativa:\n\n${arg}\n\n✅ Aprovado FINAME/BNDES\n🚜 Entrega no Nordeste em até 30 dias\n\nPosso enviar uma simulação comparativa?`;
  };

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Comparativos de Modelos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selecione a máquina do concorrente e veja a alternativa LS Tractor com os argumentos de venda
          </p>
        </div>
        {/* Botão WA fixo no topo — sticky no mobile */}
        <Button
          size="sm"
          style={{ background: "#25D366", color: "white" }}
          className="gap-2 sticky top-16 z-30"
          onClick={() => {
            if (!selectedComp) return;
            window.open(`https://wa.me/?text=${encodeURIComponent(buildWAMsg(selectedComp.comp, selectedComp.ls_alts))}`, "_blank");
          }}
          disabled={!selectedComp}
        >
          <MessageCircle className="w-4 h-4" />
          Enviar argumento WA
        </Button>
      </div>

      {/* Tabs — scroll horizontal no mobile */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {([
          { key: "busca",  label: "🔍 Busca por Modelo" },
          { key: "perfil", label: "🎯 Por Perfil / Uso" },
          { key: "precos", label: "💰 Comparativo de Preços" },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === t.key
                ? "border-red-600 text-red-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: BUSCA POR MODELO ── */}
      {activeTab === "busca" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Seletor de marca + lista */}
          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {brands.map(b => {
                const c = BRAND_CONFIG[b];
                const isSelected = selectedBrand === b;
                return (
                  <button
                    key={b}
                    onClick={() => { setSelectedBrand(b); setSelectedComp(null); setSearch(""); }}
                    className="rounded-xl border-2 p-3 text-center transition-all"
                    style={{ borderColor: isSelected ? c.color : "var(--border)", background: isSelected ? c.bg : "var(--card)" }}
                  >
                    <div className="text-xl mb-1">{c.flag}</div>
                    <div className="text-xs font-bold leading-tight" style={{ color: isSelected ? c.color : "var(--muted-foreground)" }}>
                      {b.split(" ")[0]}{b.split(" ")[1] && <><br />{b.split(" ")[1]}</>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar modelo ${selectedBrand}...`}
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedComp(null); }}
                className="pl-9"
              />
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {brandMappings.map((mapping, i) => {
                const isSelected = selectedComp?.comp.modelo === mapping.comp.modelo;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedComp(mapping)}
                    className="w-full text-left rounded-xl border-2 p-3 transition-all hover:shadow-sm"
                    style={{ borderColor: isSelected ? cfg.color : "var(--border)", background: isSelected ? cfg.bg : "var(--card)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: isSelected ? cfg.color : "var(--foreground)" }}>
                          {cfg.flag} {mapping.comp.modelo}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{mapping.comp.serie.split("(")[0].trim()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">{formatCv(mapping.comp.cv)}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    {mapping.ls_alts.length > 0 && (
                      <p className="text-xs mt-1.5 font-semibold truncate" style={{ color: LS_RED }}>
                        🚜 LS: {mapping.ls_alts.slice(0, 2).map(m => m.modelo).join(", ")}
                      </p>
                    )}
                  </button>
                );
              })}
              {brandMappings.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhum modelo encontrado</p>
              )}
            </div>
          </div>

          {/* Alternativas LS + argumento */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedComp ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-muted-foreground">
                <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-semibold">Selecione um modelo {selectedBrand}</p>
                <p className="text-sm mt-1">para ver as alternativas LS Tractor</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border-2 p-4" style={{ borderColor: cfg.color, background: cfg.bg }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
                        {cfg.flag} {selectedBrand} — Modelo Comparado
                      </p>
                      <p className="text-xl font-bold mt-1 truncate" style={{ color: cfg.color }}>{selectedComp.comp.modelo}</p>
                      <p className="text-sm text-muted-foreground truncate">{selectedComp.comp.serie}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold" style={{ color: cfg.color }}>{formatCv(selectedComp.comp.cv)}</p>
                      <p className="text-xs text-muted-foreground">{selectedComp.comp.versao}</p>
                    </div>
                  </div>
                  {selectedComp.comp.aplicacao && (
                    <p className="text-xs text-muted-foreground leading-relaxed border-t border-current/10 pt-2 mt-2">
                      {selectedComp.comp.aplicacao}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: LS_RED }}>
                    <ArrowRight className="w-3.5 h-3.5" />
                    Alternativa LS Tractor
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-3">
                  {selectedComp.ls_alts.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">Sem alternativa direta — consulte o Guia por Perfil</p>
                  ) : (
                    selectedComp.ls_alts.map((m, i) => (
                      <LSModelCard key={i} model={m} saving={i === 0 ? priceSaving(selectedBrand, selectedComp.comp.cv) : undefined} />
                    ))
                  )}
                </div>

                <ArgumentCard brand={selectedBrand} />

                <div className="flex gap-2 flex-wrap">
                  <Button
                    className="gap-2 flex-1"
                    style={{ background: "#25D366", color: "white" }}
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildWAMsg(selectedComp.comp, selectedComp.ls_alts))}`, "_blank")}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Copiar argumento WA
                  </Button>
                  <Button variant="outline" className="gap-2 flex-1" onClick={() => setLocation("/nova-oportunidade")}>
                    <Zap className="w-4 h-4" />
                    Nova Oportunidade
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: POR PERFIL ── */}
      {activeTab === "perfil" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4" style={{ background: LS_COLOR + "06" }}>
            <p className="text-sm font-semibold" style={{ color: LS_COLOR }}>
              🎯 Use este guia para identificar qual modelo LS Tractor recomendar com base no perfil do produtor.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(DATA.decisions_enhanced as any[]).map((d, i) => (
              <DecisionCard key={i} decision={d} />
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: PREÇOS ── */}
      {activeTab === "precos" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4" style={{ background: LS_COLOR + "06" }}>
            <p className="text-sm font-semibold" style={{ color: LS_COLOR }}>
              💰 Comparativo de faixas de preço por potência — estimativas de mercado 2024/2025. Use como referência durante a negociação.
            </p>
          </div>

          {/* Tabela com scroll horizontal no mobile */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="text-sm" style={{ minWidth: 600 }}>
              <thead>
                <tr style={{ background: LS_COLOR }}>
                  <th className="text-left px-4 py-3 text-white font-semibold whitespace-nowrap">Faixa de Potência</th>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: "#ff8fa3" }}>🚜 LS Tractor</th>
                  <th className="text-left px-4 py-3 text-white/80 font-semibold whitespace-nowrap">🟢 John Deere</th>
                  <th className="text-left px-4 py-3 text-white/80 font-semibold whitespace-nowrap">🟠 Yanmar</th>
                  <th className="text-left px-4 py-3 text-white/80 font-semibold whitespace-nowrap">🔴 Case IH</th>
                </tr>
              </thead>
              <tbody>
                {(DATA.prices as any[]).map((p, i) => (
                  <tr key={i} className="border-t border-border" style={{ background: i % 2 === 0 ? "var(--card)" : "var(--muted)" }}>
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{p.faixa}</td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: LS_RED }}>{p.ls || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.jd || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.yanmar || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.case || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards de argumento por marca */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            {Object.entries(DATA.ls_arguments as any).map(([brand, arg]: [string, any]) => (
              <Card key={brand} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{BRAND_CONFIG[brand]?.flag}</span>
                    <p className="text-sm font-bold">vs {brand}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{arg.principal}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
