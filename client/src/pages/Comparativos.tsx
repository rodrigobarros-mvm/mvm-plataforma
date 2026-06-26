import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, ChevronRight, TrendingDown, Award, Zap, Phone, MessageCircle,
  CheckCircle2, ArrowRight, Target, BarChart3, BarChart2, Star
} from "lucide-react";

// ── DATA ─────────────────────────────────────────────────────────────────────
const DATA = {"ls": [{"modelo": "J25H", "cv": 25.0, "serie": "Série J (Compacto / Garden)", "versao": "Plataformado", "aplicacao": "Pequenas propriedades, jardins, hortas e aviários", "culturas": "Horticultura, Floricultura, Gramados"}, {"modelo": "J25H Garden", "cv": 25.0, "serie": "Série J (Compacto / Garden)", "versao": "Plataformado", "aplicacao": "Jardinagem e manutenção de áreas verdes", "culturas": "Gramados, Parques, Condomínios"}, {"modelo": "MT2.27 / MT2 27E", "cv": 25.0, "serie": "Série MT2 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Agricultura familiar, pequenas propriedades", "culturas": "Horticultura, Fruticultura, Café, Aviários, Piscicultura"}, {"modelo": "MT1.25", "cv": 25.0, "serie": "Série MT1 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Suporte em pequenas propriedades e estufas", "culturas": "Horticultura, Estufas, Pecuária de leite"}, {"modelo": "G40", "cv": 38.0, "serie": "Série G (Compacto Utilitário)", "versao": "Plataformado", "aplicacao": "Propriedades médias, suporte à produção", "culturas": "Fruticultura, Fumicultura, Pastagem, Café"}, {"modelo": "R50 Plataformado", "cv": 50.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades, lavouras diversificadas", "culturas": "Grãos, Pastagem, Fruticultura, Fumicultura"}, {"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "U60 Plataformado", "cv": 60.0, "serie": "Série U (Utilitário 60cv)", "versao": "Plataformado", "aplicacao": "Lavouras médias e suporte logístico", "culturas": "Grãos, Pecuária, Fruticultura"}, {"modelo": "U60 Cabinado", "cv": 60.0, "serie": "Série U (Utilitário 60cv)", "versao": "Cabinado", "aplicacao": "Operações em condições adversas com conforto", "culturas": "Grãos, Pecuária, Fruticultura"}, {"modelo": "MT7.80F Plataformado", "cv": 82.0, "serie": "Série MT7 (Fruteiro / Especializado)", "versao": "Plataformado", "aplicacao": "Culturas adensadas com máxima maneuvrabilidade", "culturas": "Café, Citrus, Fruticultura, Viticultura"}, {"modelo": "MT7.80F Cabinado", "cv": 82.0, "serie": "Série MT7 (Fruteiro / Especializado)", "versao": "Cabinado", "aplicacao": "Culturas adensadas com conforto operacional", "culturas": "Café, Citrus, Fruticultura"}, {"modelo": "MT7.90F Plataformado", "cv": 93.0, "serie": "Série MT7 (Fruteiro / Especializado)", "versao": "Plataformado", "aplicacao": "Culturas adensadas de maior demanda de potência", "culturas": "Café, Citrus, Fruticultura, Hortifrúti"}, {"modelo": "MT7.90F Cabinado", "cv": 93.0, "serie": "Série MT7 (Fruteiro / Especializado)", "versao": "Cabinado", "aplicacao": "Alta produtividade em culturas especializadas", "culturas": "Café, Citrus, Fruticultura"}, {"modelo": "MT4 70 Plataformado", "cv": 70.0, "serie": "Série MT4 (Utilitário Nacional)", "versao": "Plataformado", "aplicacao": "Propriedades médias, multifuncional", "culturas": "Café, Fruticultura, Horticultura, Fumicultura, Pecuária leiteira"}, {"modelo": "MT4 70 Cabinado", "cv": 70.0, "serie": "Série MT4 (Utilitário Nacional)", "versao": "Cabinado", "aplicacao": "Versatilidade com conforto superior", "culturas": "Café, Fruticultura, Horticultura, Fumicultura"}, {"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}, {"modelo": "Plus 80 Cabinado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Operações de alta produtividade com conforto", "culturas": "Grãos, Pastagem, Cana, Citrus"}, {"modelo": "Plus 90 Plataformado", "cv": 95.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras diversificadas de médio porte", "culturas": "Grãos, Pastagem, Cana"}, {"modelo": "Plus 90 Cabinado", "cv": 95.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em lavouras médias-grandes", "culturas": "Grãos, Pastagem, Cana"}, {"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}, {"modelo": "H 145 Cabinado", "cv": 149.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes áreas, operações pesadas e contínuas", "culturas": "Grãos, Cana, Algodão, Silvicultura"}], "jd": [{"modelo": "3036EN", "cv": 36.0, "serie": "Série 3E/EN (Compacto Especial)", "versao": "Plataformado", "aplicacao": "Operações em espaços reduzidos, estufas e pomares", "culturas": "Horticultura, Fruticultura, Estufas, Condomínios, Hangares"}, {"modelo": "5060E", "cv": 60.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Plataformado", "aplicacao": "Propriedades pequenas e médias, lavouras diversificadas", "culturas": "Grãos, Pastagem, Café, Fruticultura, Hortifrúti"}, {"modelo": "5075E", "cv": 75.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Plataformado", "aplicacao": "Médias propriedades, operações diversas", "culturas": "Grãos, Pastagem, Café, Cana"}, {"modelo": "5075E Cabinado", "cv": 75.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Cabinado", "aplicacao": "Médias propriedades com conforto avançado", "culturas": "Grãos, Pastagem, Café"}, {"modelo": "5080E Cabinado", "cv": 80.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Cabinado", "aplicacao": "Lavouras médias com alta tecnologia de precisão", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "5090E Cabinado", "cv": 90.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Cabinado", "aplicacao": "Alta produtividade em propriedades médias-grandes", "culturas": "Grãos, Pastagem, Cana, Café"}, {"modelo": "5EN Estreito", "cv": null, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Plataformado", "aplicacao": "Culturas adensadas em fileiras estreitas", "culturas": "Café, Citrus, Fruticultura, Viticultura"}, {"modelo": "6110J", "cv": 110.0, "serie": "Série 6J (Médio Nacional)", "versao": "Cabinado / Platf.", "aplicacao": "Médias e grandes propriedades polivalentes", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "6125J", "cv": 125.0, "serie": "Série 6J (Médio Nacional)", "versao": "Cabinado", "aplicacao": "Grandes propriedades e lavouras intensivas", "culturas": "Grãos, Cana, Algodão, Pastagem"}, {"modelo": "6145J", "cv": 145.0, "serie": "Série 6J (Médio Nacional)", "versao": "Cabinado", "aplicacao": "Lavouras de alta demanda energética", "culturas": "Grãos, Cana, Algodão, Silvicultura"}, {"modelo": "6120M", "cv": 120.0, "serie": "Série 6M (Médio Premium)", "versao": "Cabinado", "aplicacao": "Lavouras de precisão de médio-grande porte", "culturas": "Grãos, Cana, Soja, Milho, Algodão"}, {"modelo": "6145M", "cv": 145.0, "serie": "Série 6M (Médio Premium)", "versao": "Cabinado", "aplicacao": "Grandes propriedades com agricultura de precisão", "culturas": "Grãos, Cana, Soja, Milho"}, {"modelo": "6175M", "cv": 175.0, "serie": "Série 6M (Médio Premium)", "versao": "Cabinado", "aplicacao": "Áreas extensas com alta demanda de potência", "culturas": "Soja, Milho, Cana, Algodão"}, {"modelo": "7J175", "cv": 175.0, "serie": "Série 7J (Grande Nacional)", "versao": "Cabinado", "aplicacao": "Operações pesadas em grandes propriedades", "culturas": "Soja, Milho, Cana, Algodão"}, {"modelo": "7J200", "cv": 200.0, "serie": "Série 7J (Grande Nacional)", "versao": "Cabinado", "aplicacao": "Grandes fazendas, lavouras extensas", "culturas": "Soja, Milho, Cana, Algodão, Silvicultura"}, {"modelo": "7M200", "cv": 200.0, "serie": "Série 7M (Grande Premium)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes áreas", "culturas": "Soja, Milho, Cana, Algodão"}, {"modelo": "7M215", "cv": 215.0, "serie": "Série 7M (Grande Premium)", "versao": "Cabinado", "aplicacao": "Grandes propriedades com máxima produtividade", "culturas": "Soja, Milho, Cana, Algodão, Cevada"}, {"modelo": "7M230", "cv": 230.0, "serie": "Série 7M (Grande Premium)", "versao": "Cabinado", "aplicacao": "Máxima potência da série 7M; operações 24h", "culturas": "Soja, Milho, Cana, Algodão"}, {"modelo": "8250R", "cv": 250.0, "serie": "Série 8R (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes lavouras de grãos, operações de grande escala", "culturas": "Soja, Milho, Algodão, Trigo, Cevada"}, {"modelo": "8295R", "cv": 295.0, "serie": "Série 8R (Alta Potência)", "versao": "Cabinado", "aplicacao": "Operações intensivas de enorme escala", "culturas": "Soja, Milho, Algodão, Trigo"}, {"modelo": "8345R", "cv": 345.0, "serie": "Série 8R (Alta Potência)", "versao": "Cabinado", "aplicacao": "Fazendas de alta performance, operações 24h", "culturas": "Soja, Milho, Algodão, Trigo"}, {"modelo": "9570R", "cv": 570.0, "serie": "Série 9R (Articulado Premium)", "versao": "Cabinado", "aplicacao": "Fazendas de escala muito grande, terra plana", "culturas": "Soja, Milho, Algodão em grande escala"}, {"modelo": "9620RX", "cv": 620.0, "serie": "Série 9R (Articulado Premium)", "versao": "Cabinado", "aplicacao": "Máxima performance em solos frágeis e grandes áreas", "culturas": "Soja, Milho, Algodão em altíssima escala"}], "yanmar": [{"modelo": "SA221", "cv": 22.0, "serie": "Série SA (Subcompacto)", "versao": "Plataformado", "aplicacao": "Jardins, estufas e horticultura intensiva", "culturas": "Horticultura, Floricultura, Gramados"}, {"modelo": "SA324", "cv": 24.0, "serie": "Série SA (Subcompacto)", "versao": "Plataformado", "aplicacao": "Horticultura, fruticultura e pequenas propriedades", "culturas": "Horticultura, Fruticultura, Estufas"}, {"modelo": "EF453T", "cv": 43.0, "serie": "Série EF (Compacto Utilitário)", "versao": "Plataformado", "aplicacao": "Propriedades médias, suporte logístico", "culturas": "Fruticultura, Pastagem, Fumicultura, Hortifrúti"}, {"modelo": "EF514T", "cv": 50.0, "serie": "Série EF (Compacto Utilitário)", "versao": "Plataformado", "aplicacao": "Médias propriedades e suporte geral", "culturas": "Fruticultura, Café, Pastagem, Pecuária"}, {"modelo": "YT359", "cv": 59.0, "serie": "Série YT3 (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Lavouras médias, operações diversas", "culturas": "Grãos, Pastagem, Café, Citrus, Fumicultura"}, {"modelo": "YT359 Cabinado", "cv": 59.0, "serie": "Série YT3 (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e climatização", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "YT374", "cv": 74.0, "serie": "Série YT3 (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias e grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Café"}, {"modelo": "YT374 Cabinado", "cv": 74.0, "serie": "Série YT3 (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Alta produtividade em médias-grandes propriedades", "culturas": "Grãos, Pastagem, Cana"}, {"modelo": "YT490", "cv": 89.0, "serie": "Série YT4 (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Lavouras de médio a grande porte", "culturas": "Grãos, Pastagem, Cana, Soja, Milho"}, {"modelo": "YT4110", "cv": 110.0, "serie": "Série YT4 (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Grandes propriedades e lavouras intensivas", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "YT5113A", "cv": 113.0, "serie": "Série YT5 (Alto Porte)", "versao": "Cabinado", "aplicacao": "Grandes fazendas e operações pesadas", "culturas": "Grãos, Soja, Milho, Cana, Algodão"}, {"modelo": "YT5125A", "cv": 125.0, "serie": "Série YT5 (Alto Porte)", "versao": "Cabinado", "aplicacao": "Lavouras extensas de alta demanda energética", "culturas": "Grãos, Soja, Milho, Cana, Algodão, Pastagem"}], "case_ih": [{"modelo": "Farmall 75A", "cv": 75.0, "serie": "Série Farmall A (Compacto)", "versao": "Plataformado", "aplicacao": "Propriedades médias diversificadas", "culturas": "Grãos, Café, Pastagem, Hortifrúti"}, {"modelo": "Farmall 75A Cabinado", "cv": 75.0, "serie": "Série Farmall A (Compacto)", "versao": "Cabinado", "aplicacao": "Médias propriedades com conforto operacional", "culturas": "Grãos, Café, Pastagem"}, {"modelo": "Farmall 95A", "cv": 95.0, "serie": "Série Farmall A (Compacto)", "versao": "Cabinado", "aplicacao": "Lavouras médias com alta versatilidade", "culturas": "Grãos, Café, Cana, Pastagem, Algodão"}, {"modelo": "Farmall 110A", "cv": 110.0, "serie": "Série Farmall A (Compacto)", "versao": "Cabinado", "aplicacao": "Médias-grandes propriedades polivalentes", "culturas": "Grãos, Cana, Pastagem, Algodão"}, {"modelo": "Farmall 130C", "cv": 130.0, "serie": "Série Farmall C (Médio)", "versao": "Cabinado", "aplicacao": "Grandes propriedades e lavouras intensivas", "culturas": "Soja, Milho, Cana, Algodão"}, {"modelo": "Farmall 150C", "cv": 150.0, "serie": "Série Farmall C (Médio)", "versao": "Cabinado", "aplicacao": "Grandes lavouras e operações pesadas", "culturas": "Soja, Milho, Cana, Algodão, Trigo"}, {"modelo": "Maxxum 145", "cv": 145.0, "serie": "Série Maxxum (Médio-Premium)", "versao": "Cabinado", "aplicacao": "Grandes fazendas de precisão", "culturas": "Soja, Milho, Trigo, Algodão, Cana"}, {"modelo": "Puma 185", "cv": 185.0, "serie": "Série Puma (Alto Porte)", "versao": "Cabinado", "aplicacao": "Grandes propriedades intensivas", "culturas": "Soja, Milho, Algodão, Trigo, Cevada"}, {"modelo": "Puma 220", "cv": 220.0, "serie": "Série Puma (Alto Porte)", "versao": "Cabinado", "aplicacao": "Lavouras extensas de alta demanda", "culturas": "Soja, Milho, Algodão, Trigo"}, {"modelo": "Magnum 280", "cv": 280.0, "serie": "Série Magnum (Grande)", "versao": "Cabinado", "aplicacao": "Fazendas de grande escala, implementos pesados", "culturas": "Soja, Milho, Algodão, Trigo em grande escala"}, {"modelo": "Magnum 340", "cv": 340.0, "serie": "Série Magnum (Grande)", "versao": "Cabinado", "aplicacao": "Megapropriedades, operações de alta escala", "culturas": "Soja, Milho, Algodão, Trigo em escala"}, {"modelo": "Steiger 370", "cv": 370.0, "serie": "Série Steiger (Articulado)", "versao": "Cabinado", "aplicacao": "Megafazendas e operações de máxima escala", "culturas": "Soja, Milho, Algodão, Trigo em altíssima escala"}], "decisions": [{"perfil": "Agricultura familiar / Subsistência", "recomendacao": "✅ Yanmar", "modelo_ls": "MT2.27 ou J25H", "modelo_jd": "3036EN", "modelo_yanmar": "SA221 ou SA324", "modelo_case": "Não compete", "justificativa": "Yanmar SA221 a R$70k é a mais barata; LS tem mais modelos compactos; JD apenas 3036EN a preço maior; Case IH ausente"}, {"perfil": "Horticultura / Hortifrúti", "recomendacao": "✅ LS Tractor", "modelo_ls": "MT2.27 / U60 / MT4 70", "modelo_jd": "5060E / 5EN Estreito", "modelo_yanmar": "YT359 Plat.", "modelo_case": "Farmall 75A", "justificativa": "LS tem mais modelos e menores preços nos compactos; Yanmar alternativa; JD tem M-Modem; Case IH acima do segmento"}, {"perfil": "Cafeicultura / Citrus / Fruticultura", "recomendacao": "✅ LS Tractor", "modelo_ls": "MT7.80F ou MT7.90F Cab", "modelo_jd": "5EN Estreito Cab", "modelo_yanmar": "YT374 Cab", "modelo_case": "—", "justificativa": "LS MT7 desenvolvido p/ culturas adensadas com cabine exclusiva; Yanmar YT374 alternativa; JD 5EN tem telemetria"}, {"perfil": "Pecuária de leite / Mista pequena", "recomendacao": "✅ LS / Yanmar", "modelo_ls": "R65 ou U60 Cab", "modelo_jd": "5075E Cab", "modelo_yanmar": "YT374 Cab", "modelo_case": "Farmall 95A", "justificativa": "LS e Yanmar oferecem melhor custo-benefício; JD tem mais tech; Case IH Farmall A competitivo mas acima em preço"}, {"perfil": "Grãos — propriedade pequena/média", "recomendacao": "⚖️ Equivalente", "modelo_ls": "Plus 80 ou Plus 90", "modelo_jd": "5080E ou 5090E", "modelo_yanmar": "YT490 ou YT4110", "modelo_case": "Farmall 110A", "justificativa": "4 marcas competem bem nessa faixa; JD e Case IH com mais tech; LS e Yanmar com melhor custo; escolha por perfil"}, {"perfil": "Grãos — propriedade grande (>130cv)", "recomendacao": "✅ John Deere", "modelo_ls": "H125 ou H145", "modelo_jd": "6J 125cv ou 6M 145cv", "modelo_yanmar": "YT5125A", "modelo_case": "Farmall 150C / Maxxum", "justificativa": "JD lidera em AP e revenda; Case IH AFS Connect é forte alternativa; HORSCH Maestro complementa semeadura de precisão"}, {"perfil": "Grandes lavouras (> 185cv)", "recomendacao": "✅ JD / Case IH", "modelo_ls": "—", "modelo_jd": "7M, 8R ou 9R", "modelo_yanmar": "—", "modelo_case": "Puma 220 / Magnum 280", "justificativa": "Case IH Puma/Magnum é alternativa competitiva ao JD; HORSCH implementos essenciais; LS e Yanmar não competem nessa faixa"}, {"perfil": "Agricultura de Precisão / Big Data", "recomendacao": "✅ John Deere", "modelo_ls": "Não recomendado p/ AP", "modelo_jd": "Qualquer 6M, 7M ou 8R", "modelo_yanmar": "—", "modelo_case": "Maxxum 145 + AFS", "justificativa": "JD Operations Center + StarFire 7000 + AutoTrac = ecossistema AP completo; Case IH AFS Connect é alternativa forte"}, {"perfil": "Fumicultura / Pequenas lavouras Sul", "recomendacao": "✅ LS Tractor", "modelo_ls": "R50 ou R65 Plataformado", "modelo_jd": "5060E ou 5075E", "modelo_yanmar": "YT359 Plataformado", "modelo_case": "Farmall 75A", "justificativa": "LS tem custo menor e suporte via Garuva/SC; Yanmar alternativa competitiva; JD tem M-Modem padrão de fábrica"}, {"perfil": "Produtor com orçamento limitado", "recomendacao": "✅ Yanmar", "modelo_ls": "MT1.25 / MT2.27 / G40", "modelo_jd": "3036EN", "modelo_yanmar": "SA221 ou SA324", "modelo_case": "—", "justificativa": "Yanmar SA221 é a opção mais acessível do mercado (R$70k); LS segunda; JD 3036EN mais caro; Case IH não compete nessa faixa"}, {"perfil": "Produtor foco em revenda do ativo", "recomendacao": "✅ John Deere", "modelo_ls": "—", "modelo_jd": "5E ou 6J", "modelo_yanmar": "—", "modelo_case": "Farmall A/C", "justificativa": "JD tem maior liquidez no mercado de usados; Case IH segunda opção via rede CNH; LS e Yanmar em consolidação no BR"}, {"perfil": "Frotas corporativas / Agronegócio", "recomendacao": "✅ John Deere", "modelo_ls": "H125/H145 apoio", "modelo_jd": "6M, 7M, 8R, 9R", "modelo_yanmar": "—", "modelo_case": "Maxxum / Puma / Magnum", "justificativa": "JD tem Operations Center p/ gestão de frotas; Case IH AFS Connect; HORSCH Leeb para complementar pulverização"}, {"perfil": "Canavicultura", "recomendacao": "✅ JD / Case IH", "modelo_ls": "H145 (limitado)", "modelo_jd": "7M230 ou 8R", "modelo_yanmar": "—", "modelo_case": "Puma 220 / Magnum 280", "justificativa": "JD domina cana em alta potência; Case IH Puma/Magnum é forte alternativa; LS compete pontualmente com H145"}, {"perfil": "Preparo de solo / Plantio direto pesado", "recomendacao": "", "modelo_ls": "", "modelo_jd": "", "modelo_yanmar": "", "modelo_case": "", "justificativa": "HORSCH é referência em preparo pesado e plantio direto; Joker CT e Terrano FX; complementa qualquer trator ≥100cv"}, {"perfil": "Semeadura de precisão monogrão", "recomendacao": "✅ HORSCH", "modelo_ls": "—", "modelo_jd": "—", "modelo_yanmar": "—", "modelo_case": "—", "justificativa": "HORSCH Maestro é referência em semeadora monogrão com ISOBUS e controle individual por linha"}, {"perfil": "Fumicultura e vinicultura (RS/SC/PR)", "recomendacao": "✅ LS Tractor", "modelo_ls": "MT7.80F ou R65", "modelo_jd": "5EN Estreito", "modelo_yanmar": "YT359 Plat.", "modelo_case": "—", "justificativa": "Fábrica LS em Garuva/SC favorece suporte regional; MT7 ideal p/ fileiras estreitas; Yanmar YT359 alternativa acessível"}, {"perfil": "💡  RESUMO: Yanmar e LS Tractor lideram custo-benefício nos compactos e médios até ~150cv. John Deere é referência para grandes propriedades, AP e frotas. Case IH é forte alternativa ao JD no médio-alto e grandes lavouras com AFS Connect. HORSCH é a escolha para implementos especializados (semeadoras, pulverizadores, grades). Todas têm acesso ao BNDES/FINAME.", "recomendacao": "", "modelo_ls": "", "modelo_jd": "", "modelo_yanmar": "", "modelo_case": "", "justificativa": ""}], "prices": [{"faixa": "Entrada compactos (22–40cv)", "ls": "MT2.27/J25H: R$85k–115k", "jd": "3036EN: R$130k–160k", "yanmar": "SA221/SA324: R$70k–105k", "case": "Não compete nessa faixa", "faixa_cv": "22–40 cv"}, {"faixa": "Utilitário médio (60–80cv)", "ls": "U60/R65: R$158k–230k", "jd": "5E 75–80cv: R$185k–275k", "yanmar": "YT359/YT374: R$158k–248k", "case": "Farmall 95A Cab: R$255k–300k", "faixa_cv": "60–80 cv"}, {"faixa": "Médio-alto (100–130cv)", "ls": "Plus 100/H125: R$278k–440k", "jd": "6J 110–125cv: R$310k–430k", "yanmar": "YT4110/YT5113A: R$290k–400k", "case": "Farmall 110A/130C: R$310k–450k", "faixa_cv": "100–130 cv"}, {"faixa": "Alto porte (145–185cv)", "ls": "H145: R$420k–490k", "jd": "6M 145–175cv: R$490k–680k", "yanmar": "YT5125A: R$385k–450k", "case": "Farmall 150C/Maxxum: R$440k–620k", "faixa_cv": "145–185 cv"}, {"faixa": "Grande porte (185cv+)", "ls": "", "jd": "", "yanmar": "", "case": "", "faixa_cv": ""}, {"faixa": "Número de marchas (compactos < 80cv)", "ls": "", "jd": "", "yanmar": "", "case": "", "faixa_cv": ""}, {"faixa": "Cabine (compactos < 80cv)", "ls": "Pioneira cab. de fábrica até 80cv BR", "jd": "Cab. a partir 5060E (premium)", "yanmar": "Cab. disponível YT359+", "case": "Farmall 75A Cab. disponível", "faixa_cv": "< 80 cv"}, {"faixa": "Agricultura familiar (< 50cv)", "ls": "MT2.27/J25H/MT1.25", "jd": "3036EN", "yanmar": "SA221/SA324 — mais baratos", "case": "Não compete", "faixa_cv": "22–40 cv"}, {"faixa": "Grãos / Grandes lavouras (> 110cv)", "ls": "Plus 100/Série H até 149cv", "jd": "6J/6M/7M/8R/9R — referência", "yanmar": "YT5 até 125cv", "case": "Farmall 130C–Magnum 340cv", "faixa_cv": "110 cv+"}], "competitor_map": {"John Deere": [{"comp": {"modelo": "3036EN", "cv": 36.0, "serie": "Série 3E/EN (Compacto Especial)", "versao": "Plataformado", "aplicacao": "Operações em espaços reduzidos, estufas e pomares", "culturas": "Horticultura, Fruticultura, Estufas, Condomínios, Hangares"}, "ls_alts": [{"modelo": "MT1.25", "cv": 25.0, "serie": "Série MT1 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Suporte em pequenas propriedades e estufas", "culturas": "Horticultura, Estufas, Pecuária de leite"}, {"modelo": "MT2.27 / MT2 27E", "cv": 25.0, "serie": "Série MT2 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Agricultura familiar, pequenas propriedades", "culturas": "Horticultura, Fruticultura, Café, Aviários, Piscicultura"}, {"modelo": "J25H", "cv": 25.0, "serie": "Série J (Compacto / Garden)", "versao": "Plataformado", "aplicacao": "Pequenas propriedades, jardins, hortas e aviários", "culturas": "Horticultura, Floricultura, Gramados"}]}, {"comp": {"modelo": "5060E", "cv": 60.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Plataformado", "aplicacao": "Propriedades pequenas e médias, lavouras diversificadas", "culturas": "Grãos, Pastagem, Café, Fruticultura, Hortifrúti"}, "ls_alts": [{"modelo": "R50 Plataformado", "cv": 50.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades, lavouras diversificadas", "culturas": "Grãos, Pastagem, Fruticultura, Fumicultura"}, {"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}]}, {"comp": {"modelo": "5075E", "cv": 75.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Plataformado", "aplicacao": "Médias propriedades, operações diversas", "culturas": "Grãos, Pastagem, Café, Cana"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}]}, {"comp": {"modelo": "5075E Cabinado", "cv": 75.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Cabinado", "aplicacao": "Médias propriedades com conforto avançado", "culturas": "Grãos, Pastagem, Café"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}]}, {"comp": {"modelo": "5080E Cabinado", "cv": 80.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Cabinado", "aplicacao": "Lavouras médias com alta tecnologia de precisão", "culturas": "Grãos, Pastagem, Café, Citrus"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}]}, {"comp": {"modelo": "5090E Cabinado", "cv": 90.0, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Cabinado", "aplicacao": "Alta produtividade em propriedades médias-grandes", "culturas": "Grãos, Pastagem, Cana, Café"}, "ls_alts": [{"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}, {"modelo": "Plus 80 Cabinado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Operações de alta produtividade com conforto", "culturas": "Grãos, Pastagem, Cana, Citrus"}]}, {"comp": {"modelo": "5EN Estreito", "cv": null, "serie": "Série 5E (Pequeno Utilitário)", "versao": "Plataformado", "aplicacao": "Culturas adensadas em fileiras estreitas", "culturas": "Café, Citrus, Fruticultura, Viticultura"}, "ls_alts": []}, {"comp": {"modelo": "6110J", "cv": 110.0, "serie": "Série 6J (Médio Nacional)", "versao": "Cabinado / Platf.", "aplicacao": "Médias e grandes propriedades polivalentes", "culturas": "Grãos, Pastagem, Cana, Algodão"}, "ls_alts": [{"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 90 Plataformado", "cv": 95.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras diversificadas de médio porte", "culturas": "Grãos, Pastagem, Cana"}]}, {"comp": {"modelo": "6125J", "cv": 125.0, "serie": "Série 6J (Médio Nacional)", "versao": "Cabinado", "aplicacao": "Grandes propriedades e lavouras intensivas", "culturas": "Grãos, Cana, Algodão, Pastagem"}, "ls_alts": [{"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}]}, {"comp": {"modelo": "6145J", "cv": 145.0, "serie": "Série 6J (Médio Nacional)", "versao": "Cabinado", "aplicacao": "Lavouras de alta demanda energética", "culturas": "Grãos, Cana, Algodão, Silvicultura"}, "ls_alts": [{"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}, {"modelo": "H 145 Cabinado", "cv": 149.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes áreas, operações pesadas e contínuas", "culturas": "Grãos, Cana, Algodão, Silvicultura"}]}, {"comp": {"modelo": "6120M", "cv": 120.0, "serie": "Série 6M (Médio Premium)", "versao": "Cabinado", "aplicacao": "Lavouras de precisão de médio-grande porte", "culturas": "Grãos, Cana, Soja, Milho, Algodão"}, "ls_alts": [{"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}]}, {"comp": {"modelo": "6145M", "cv": 145.0, "serie": "Série 6M (Médio Premium)", "versao": "Cabinado", "aplicacao": "Grandes propriedades com agricultura de precisão", "culturas": "Grãos, Cana, Soja, Milho"}, "ls_alts": [{"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}, {"modelo": "H 145 Cabinado", "cv": 149.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes áreas, operações pesadas e contínuas", "culturas": "Grãos, Cana, Algodão, Silvicultura"}]}, {"comp": {"modelo": "6175M", "cv": 175.0, "serie": "Série 6M (Médio Premium)", "versao": "Cabinado", "aplicacao": "Áreas extensas com alta demanda de potência", "culturas": "Soja, Milho, Cana, Algodão"}, "ls_alts": []}, {"comp": {"modelo": "7J175", "cv": 175.0, "serie": "Série 7J (Grande Nacional)", "versao": "Cabinado", "aplicacao": "Operações pesadas em grandes propriedades", "culturas": "Soja, Milho, Cana, Algodão"}, "ls_alts": []}, {"comp": {"modelo": "7J200", "cv": 200.0, "serie": "Série 7J (Grande Nacional)", "versao": "Cabinado", "aplicacao": "Grandes fazendas, lavouras extensas", "culturas": "Soja, Milho, Cana, Algodão, Silvicultura"}, "ls_alts": []}, {"comp": {"modelo": "7M200", "cv": 200.0, "serie": "Série 7M (Grande Premium)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes áreas", "culturas": "Soja, Milho, Cana, Algodão"}, "ls_alts": []}, {"comp": {"modelo": "7M215", "cv": 215.0, "serie": "Série 7M (Grande Premium)", "versao": "Cabinado", "aplicacao": "Grandes propriedades com máxima produtividade", "culturas": "Soja, Milho, Cana, Algodão, Cevada"}, "ls_alts": []}, {"comp": {"modelo": "7M230", "cv": 230.0, "serie": "Série 7M (Grande Premium)", "versao": "Cabinado", "aplicacao": "Máxima potência da série 7M; operações 24h", "culturas": "Soja, Milho, Cana, Algodão"}, "ls_alts": []}, {"comp": {"modelo": "8250R", "cv": 250.0, "serie": "Série 8R (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes lavouras de grãos, operações de grande escala", "culturas": "Soja, Milho, Algodão, Trigo, Cevada"}, "ls_alts": []}, {"comp": {"modelo": "8295R", "cv": 295.0, "serie": "Série 8R (Alta Potência)", "versao": "Cabinado", "aplicacao": "Operações intensivas de enorme escala", "culturas": "Soja, Milho, Algodão, Trigo"}, "ls_alts": []}, {"comp": {"modelo": "8345R", "cv": 345.0, "serie": "Série 8R (Alta Potência)", "versao": "Cabinado", "aplicacao": "Fazendas de alta performance, operações 24h", "culturas": "Soja, Milho, Algodão, Trigo"}, "ls_alts": []}, {"comp": {"modelo": "9570R", "cv": 570.0, "serie": "Série 9R (Articulado Premium)", "versao": "Cabinado", "aplicacao": "Fazendas de escala muito grande, terra plana", "culturas": "Soja, Milho, Algodão em grande escala"}, "ls_alts": []}, {"comp": {"modelo": "9620RX", "cv": 620.0, "serie": "Série 9R (Articulado Premium)", "versao": "Cabinado", "aplicacao": "Máxima performance em solos frágeis e grandes áreas", "culturas": "Soja, Milho, Algodão em altíssima escala"}, "ls_alts": []}], "Yanmar": [{"comp": {"modelo": "SA221", "cv": 22.0, "serie": "Série SA (Subcompacto)", "versao": "Plataformado", "aplicacao": "Jardins, estufas e horticultura intensiva", "culturas": "Horticultura, Floricultura, Gramados"}, "ls_alts": [{"modelo": "J25H", "cv": 25.0, "serie": "Série J (Compacto / Garden)", "versao": "Plataformado", "aplicacao": "Pequenas propriedades, jardins, hortas e aviários", "culturas": "Horticultura, Floricultura, Gramados"}, {"modelo": "J25H Garden", "cv": 25.0, "serie": "Série J (Compacto / Garden)", "versao": "Plataformado", "aplicacao": "Jardinagem e manutenção de áreas verdes", "culturas": "Gramados, Parques, Condomínios"}, {"modelo": "MT2.27 / MT2 27E", "cv": 25.0, "serie": "Série MT2 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Agricultura familiar, pequenas propriedades", "culturas": "Horticultura, Fruticultura, Café, Aviários, Piscicultura"}]}, {"comp": {"modelo": "SA324", "cv": 24.0, "serie": "Série SA (Subcompacto)", "versao": "Plataformado", "aplicacao": "Horticultura, fruticultura e pequenas propriedades", "culturas": "Horticultura, Fruticultura, Estufas"}, "ls_alts": [{"modelo": "MT1.25", "cv": 25.0, "serie": "Série MT1 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Suporte em pequenas propriedades e estufas", "culturas": "Horticultura, Estufas, Pecuária de leite"}, {"modelo": "MT2.27 / MT2 27E", "cv": 25.0, "serie": "Série MT2 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Agricultura familiar, pequenas propriedades", "culturas": "Horticultura, Fruticultura, Café, Aviários, Piscicultura"}, {"modelo": "J25H", "cv": 25.0, "serie": "Série J (Compacto / Garden)", "versao": "Plataformado", "aplicacao": "Pequenas propriedades, jardins, hortas e aviários", "culturas": "Horticultura, Floricultura, Gramados"}]}, {"comp": {"modelo": "EF453T", "cv": 43.0, "serie": "Série EF (Compacto Utilitário)", "versao": "Plataformado", "aplicacao": "Propriedades médias, suporte logístico", "culturas": "Fruticultura, Pastagem, Fumicultura, Hortifrúti"}, "ls_alts": [{"modelo": "G40", "cv": 38.0, "serie": "Série G (Compacto Utilitário)", "versao": "Plataformado", "aplicacao": "Propriedades médias, suporte à produção", "culturas": "Fruticultura, Fumicultura, Pastagem, Café"}, {"modelo": "R50 Plataformado", "cv": 50.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades, lavouras diversificadas", "culturas": "Grãos, Pastagem, Fruticultura, Fumicultura"}, {"modelo": "MT2.27 / MT2 27E", "cv": 25.0, "serie": "Série MT2 (Subcompacto)", "versao": "Plataformado", "aplicacao": "Agricultura familiar, pequenas propriedades", "culturas": "Horticultura, Fruticultura, Café, Aviários, Piscicultura"}]}, {"comp": {"modelo": "EF514T", "cv": 50.0, "serie": "Série EF (Compacto Utilitário)", "versao": "Plataformado", "aplicacao": "Médias propriedades e suporte geral", "culturas": "Fruticultura, Café, Pastagem, Pecuária"}, "ls_alts": [{"modelo": "G40", "cv": 38.0, "serie": "Série G (Compacto Utilitário)", "versao": "Plataformado", "aplicacao": "Propriedades médias, suporte à produção", "culturas": "Fruticultura, Fumicultura, Pastagem, Café"}, {"modelo": "MT4 70 Plataformado", "cv": 70.0, "serie": "Série MT4 (Utilitário Nacional)", "versao": "Plataformado", "aplicacao": "Propriedades médias, multifuncional", "culturas": "Café, Fruticultura, Horticultura, Fumicultura, Pecuária leiteira"}, {"modelo": "R50 Plataformado", "cv": 50.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades, lavouras diversificadas", "culturas": "Grãos, Pastagem, Fruticultura, Fumicultura"}]}, {"comp": {"modelo": "YT359", "cv": 59.0, "serie": "Série YT3 (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Lavouras médias, operações diversas", "culturas": "Grãos, Pastagem, Café, Citrus, Fumicultura"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R50 Plataformado", "cv": 50.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades, lavouras diversificadas", "culturas": "Grãos, Pastagem, Fruticultura, Fumicultura"}]}, {"comp": {"modelo": "YT359 Cabinado", "cv": 59.0, "serie": "Série YT3 (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e climatização", "culturas": "Grãos, Pastagem, Café, Citrus"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R50 Plataformado", "cv": 50.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades, lavouras diversificadas", "culturas": "Grãos, Pastagem, Fruticultura, Fumicultura"}]}, {"comp": {"modelo": "YT374", "cv": 74.0, "serie": "Série YT3 (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias e grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Café"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}]}, {"comp": {"modelo": "YT374 Cabinado", "cv": 74.0, "serie": "Série YT3 (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Alta produtividade em médias-grandes propriedades", "culturas": "Grãos, Pastagem, Cana"}, "ls_alts": [{"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}, {"modelo": "Plus 80 Cabinado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Operações de alta produtividade com conforto", "culturas": "Grãos, Pastagem, Cana, Citrus"}, {"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}]}, {"comp": {"modelo": "YT490", "cv": 89.0, "serie": "Série YT4 (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Lavouras de médio a grande porte", "culturas": "Grãos, Pastagem, Cana, Soja, Milho"}, "ls_alts": [{"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}, {"modelo": "Plus 80 Cabinado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Operações de alta produtividade com conforto", "culturas": "Grãos, Pastagem, Cana, Citrus"}, {"modelo": "Plus 90 Plataformado", "cv": 95.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras diversificadas de médio porte", "culturas": "Grãos, Pastagem, Cana"}]}, {"comp": {"modelo": "YT4110", "cv": 110.0, "serie": "Série YT4 (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Grandes propriedades e lavouras intensivas", "culturas": "Grãos, Pastagem, Cana, Algodão"}, "ls_alts": [{"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 90 Plataformado", "cv": 95.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras diversificadas de médio porte", "culturas": "Grãos, Pastagem, Cana"}]}, {"comp": {"modelo": "YT5113A", "cv": 113.0, "serie": "Série YT5 (Alto Porte)", "versao": "Cabinado", "aplicacao": "Grandes fazendas e operações pesadas", "culturas": "Grãos, Soja, Milho, Cana, Algodão"}, "ls_alts": [{"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 90 Plataformado", "cv": 95.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras diversificadas de médio porte", "culturas": "Grãos, Pastagem, Cana"}]}, {"comp": {"modelo": "YT5125A", "cv": 125.0, "serie": "Série YT5 (Alto Porte)", "versao": "Cabinado", "aplicacao": "Lavouras extensas de alta demanda energética", "culturas": "Grãos, Soja, Milho, Cana, Algodão, Pastagem"}, "ls_alts": [{"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}]}], "Case IH": [{"comp": {"modelo": "Farmall 75A", "cv": 75.0, "serie": "Série Farmall A (Compacto)", "versao": "Plataformado", "aplicacao": "Propriedades médias diversificadas", "culturas": "Grãos, Café, Pastagem, Hortifrúti"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "MT7.90F Plataformado", "cv": 93.0, "serie": "Série MT7 (Fruteiro / Especializado)", "versao": "Plataformado", "aplicacao": "Culturas adensadas de maior demanda de potência", "culturas": "Café, Citrus, Fruticultura, Hortifrúti"}]}, {"comp": {"modelo": "Farmall 75A Cabinado", "cv": 75.0, "serie": "Série Farmall A (Compacto)", "versao": "Cabinado", "aplicacao": "Médias propriedades com conforto operacional", "culturas": "Grãos, Café, Pastagem"}, "ls_alts": [{"modelo": "R65 Plataformado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Plataformado", "aplicacao": "Médias propriedades multifuncionais", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "R65 Cabinado", "cv": 65.0, "serie": "Série R (Utilitário Médio)", "versao": "Cabinado", "aplicacao": "Operações longas com conforto e produtividade", "culturas": "Grãos, Pastagem, Café, Citrus"}, {"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}]}, {"comp": {"modelo": "Farmall 95A", "cv": 95.0, "serie": "Série Farmall A (Compacto)", "versao": "Cabinado", "aplicacao": "Lavouras médias com alta versatilidade", "culturas": "Grãos, Café, Cana, Pastagem, Algodão"}, "ls_alts": [{"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 80 Plataformado", "cv": 82.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras médias e grandes", "culturas": "Grãos, Pastagem, Cana, Citrus"}]}, {"comp": {"modelo": "Farmall 110A", "cv": 110.0, "serie": "Série Farmall A (Compacto)", "versao": "Cabinado", "aplicacao": "Médias-grandes propriedades polivalentes", "culturas": "Grãos, Cana, Pastagem, Algodão"}, "ls_alts": [{"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 90 Plataformado", "cv": 95.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras diversificadas de médio porte", "culturas": "Grãos, Pastagem, Cana"}]}, {"comp": {"modelo": "Farmall 130C", "cv": 130.0, "serie": "Série Farmall C (Médio)", "versao": "Cabinado", "aplicacao": "Grandes propriedades e lavouras intensivas", "culturas": "Soja, Milho, Cana, Algodão"}, "ls_alts": [{"modelo": "Plus 100 Plataformado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Plataformado", "aplicacao": "Lavouras de grãos e pastagem de grande escala", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "Plus 100 Cabinado", "cv": 110.0, "serie": "Série Plus (Médio-Alto)", "versao": "Cabinado", "aplicacao": "Alta produtividade em grandes propriedades", "culturas": "Grãos, Pastagem, Cana, Algodão"}, {"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}]}, {"comp": {"modelo": "Farmall 150C", "cv": 150.0, "serie": "Série Farmall C (Médio)", "versao": "Cabinado", "aplicacao": "Grandes lavouras e operações pesadas", "culturas": "Soja, Milho, Cana, Algodão, Trigo"}, "ls_alts": [{"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}, {"modelo": "H 145 Cabinado", "cv": 149.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes áreas, operações pesadas e contínuas", "culturas": "Grãos, Cana, Algodão, Silvicultura"}]}, {"comp": {"modelo": "Maxxum 145", "cv": 145.0, "serie": "Série Maxxum (Médio-Premium)", "versao": "Cabinado", "aplicacao": "Grandes fazendas de precisão", "culturas": "Soja, Milho, Trigo, Algodão, Cana"}, "ls_alts": [{"modelo": "H 125 Cabinado", "cv": 134.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes propriedades, agricultura intensiva", "culturas": "Grãos, Cana, Algodão, Pastagem, Silvicultura"}, {"modelo": "H 145 Cabinado", "cv": 149.0, "serie": "Série H (Alta Potência)", "versao": "Cabinado", "aplicacao": "Grandes áreas, operações pesadas e contínuas", "culturas": "Grãos, Cana, Algodão, Silvicultura"}]}, {"comp": {"modelo": "Puma 185", "cv": 185.0, "serie": "Série Puma (Alto Porte)", "versao": "Cabinado", "aplicacao": "Grandes propriedades intensivas", "culturas": "Soja, Milho, Algodão, Trigo, Cevada"}, "ls_alts": []}, {"comp": {"modelo": "Puma 220", "cv": 220.0, "serie": "Série Puma (Alto Porte)", "versao": "Cabinado", "aplicacao": "Lavouras extensas de alta demanda", "culturas": "Soja, Milho, Algodão, Trigo"}, "ls_alts": []}, {"comp": {"modelo": "Magnum 280", "cv": 280.0, "serie": "Série Magnum (Grande)", "versao": "Cabinado", "aplicacao": "Fazendas de grande escala, implementos pesados", "culturas": "Soja, Milho, Algodão, Trigo em grande escala"}, "ls_alts": []}, {"comp": {"modelo": "Magnum 340", "cv": 340.0, "serie": "Série Magnum (Grande)", "versao": "Cabinado", "aplicacao": "Megapropriedades, operações de alta escala", "culturas": "Soja, Milho, Algodão, Trigo em escala"}, "ls_alts": []}, {"comp": {"modelo": "Steiger 370", "cv": 370.0, "serie": "Série Steiger (Articulado)", "versao": "Cabinado", "aplicacao": "Megafazendas e operações de máxima escala", "culturas": "Soja, Milho, Algodão, Trigo em altíssima escala"}, "ls_alts": []}]}, "ls_arguments": {"John Deere": {"principal": "Economia real: LS Tractor custa em média 20-35% menos que o equivalente John Deere na mesma faixa de potência, com qualidade sul-coreana comprovada e fabricação nacional em Garuva/SC.", "detalhe": "A John Deere cobra um ágio de marca. O MT7.80F Cabinado (82cv) sai por R$245k–290k, enquanto o JD 5EN equivalente custa R$310k–380k. A diferença de R$65k–90k financia anos de manutenção ou implementos complementares.", "finame": "Ambos aprovados no FINAME/BNDES — mas a parcela LS fica 25-35% menor.", "cor": "#009900", "icon": "🟢"}, "Yanmar": {"principal": "LS oferece mais modelos, mais potência e melhor rede de assistência no Nordeste — com preço similar ou até menor na faixa acima de 60cv.", "detalhe": "Abaixo de 40cv a Yanmar é mais barata. Mas de 60cv em diante a LS oferece versões cabinadas exclusivas (MT7 Cabinado) que a Yanmar não tem, com melhor ergonomia e menor custo por hora trabalhada.", "finame": "Ambas aprovadas FINAME — LS com rede de concessionárias estabelecida no Nordeste.", "cor": "#cc6600", "icon": "🟠"}, "Case IH": {"principal": "LS Tractor entrega potência equivalente por até 40% menos — com aprovação BNDES e entrega no Nordeste em até 30 dias.", "detalhe": "O Case IH Farmall posiciona-se acima do mercado de custo-benefício. O LS H125 Cabinado (134cv) custa R$420k–460k frente ao Farmall 130C a R$480k–570k. Para a maioria das propriedades do Nordeste, a diferença não é justificada pela aplicação.", "finame": "LS aprovada BNDES com condições diferenciadas para produtores do Norte/Nordeste.", "cor": "#cc0000", "icon": "🔴"}}, "decisions_enhanced": [{"perfil": "Agricultura familiar / Subsistência", "recomendacao": "✅ Yanmar", "modelo_ls": "MT2.27 ou J25H", "modelo_jd": "3036EN", "modelo_yanmar": "SA221 ou SA324", "modelo_case": "Não compete", "justificativa": "Yanmar SA221 a R$70k é a mais barata; LS tem mais modelos compactos; JD apenas 3036EN a preço maior; Case IH ausente"}, {"perfil": "Horticultura / Hortifrúti", "recomendacao": "✅ LS Tractor", "modelo_ls": "MT2.27 / U60 / MT4 70", "modelo_jd": "5060E / 5EN Estreito", "modelo_yanmar": "YT359 Plat.", "modelo_case": "Farmall 75A", "justificativa": "LS tem mais modelos e menores preços nos compactos; Yanmar alternativa; JD tem M-Modem; Case IH acima do segmento"}, {"perfil": "Cafeicultura / Citrus / Fruticultura", "recomendacao": "✅ LS Tractor", "modelo_ls": "MT7.80F ou MT7.90F Cab", "modelo_jd": "5EN Estreito Cab", "modelo_yanmar": "YT374 Cab", "modelo_case": "—", "justificativa": "LS MT7 desenvolvido p/ culturas adensadas com cabine exclusiva; Yanmar YT374 alternativa; JD 5EN tem telemetria"}, {"perfil": "Pecuária de leite / Mista pequena", "recomendacao": "✅ LS / Yanmar", "modelo_ls": "R65 ou U60 Cab", "modelo_jd": "5075E Cab", "modelo_yanmar": "YT374 Cab", "modelo_case": "Farmall 95A", "justificativa": "LS e Yanmar oferecem melhor custo-benefício; JD tem mais tech; Case IH Farmall A competitivo mas acima em preço"}, {"perfil": "Grãos — propriedade pequena/média", "recomendacao": "⚖️ Equivalente", "modelo_ls": "Plus 80 ou Plus 90", "modelo_jd": "5080E ou 5090E", "modelo_yanmar": "YT490 ou YT4110", "modelo_case": "Farmall 110A", "justificativa": "4 marcas competem bem nessa faixa; JD e Case IH com mais tech; LS e Yanmar com melhor custo; escolha por perfil"}, {"perfil": "Grãos — propriedade grande (>130cv)", "recomendacao": "✅ John Deere", "modelo_ls": "H125 ou H145", "modelo_jd": "6J 125cv ou 6M 145cv", "modelo_yanmar": "YT5125A", "modelo_case": "Farmall 150C / Maxxum", "justificativa": "JD lidera em AP e revenda; Case IH AFS Connect é forte alternativa; HORSCH Maestro complementa semeadura de precisão"}, {"perfil": "Grandes lavouras (> 185cv)", "recomendacao": "✅ JD / Case IH", "modelo_ls": "—", "modelo_jd": "7M, 8R ou 9R", "modelo_yanmar": "—", "modelo_case": "Puma 220 / Magnum 280", "justificativa": "Case IH Puma/Magnum é alternativa competitiva ao JD; HORSCH implementos essenciais; LS e Yanmar não competem nessa faixa"}, {"perfil": "Agricultura de Precisão / Big Data", "recomendacao": "✅ John Deere", "modelo_ls": "Não recomendado p/ AP", "modelo_jd": "Qualquer 6M, 7M ou 8R", "modelo_yanmar": "—", "modelo_case": "Maxxum 145 + AFS", "justificativa": "JD Operations Center + StarFire 7000 + AutoTrac = ecossistema AP completo; Case IH AFS Connect é alternativa forte"}, {"perfil": "Fumicultura / Pequenas lavouras Sul", "recomendacao": "✅ LS Tractor", "modelo_ls": "R50 ou R65 Plataformado", "modelo_jd": "5060E ou 5075E", "modelo_yanmar": "YT359 Plataformado", "modelo_case": "Farmall 75A", "justificativa": "LS tem custo menor e suporte via Garuva/SC; Yanmar alternativa competitiva; JD tem M-Modem padrão de fábrica"}, {"perfil": "Produtor com orçamento limitado", "recomendacao": "✅ Yanmar", "modelo_ls": "MT1.25 / MT2.27 / G40", "modelo_jd": "3036EN", "modelo_yanmar": "SA221 ou SA324", "modelo_case": "—", "justificativa": "Yanmar SA221 é a opção mais acessível do mercado (R$70k); LS segunda; JD 3036EN mais caro; Case IH não compete nessa faixa"}, {"perfil": "Produtor foco em revenda do ativo", "recomendacao": "✅ John Deere", "modelo_ls": "—", "modelo_jd": "5E ou 6J", "modelo_yanmar": "—", "modelo_case": "Farmall A/C", "justificativa": "JD tem maior liquidez no mercado de usados; Case IH segunda opção via rede CNH; LS e Yanmar em consolidação no BR"}, {"perfil": "Frotas corporativas / Agronegócio", "recomendacao": "✅ John Deere", "modelo_ls": "H125/H145 apoio", "modelo_jd": "6M, 7M, 8R, 9R", "modelo_yanmar": "—", "modelo_case": "Maxxum / Puma / Magnum", "justificativa": "JD tem Operations Center p/ gestão de frotas; Case IH AFS Connect; HORSCH Leeb para complementar pulverização"}, {"perfil": "Canavicultura", "recomendacao": "✅ JD / Case IH", "modelo_ls": "H145 (limitado)", "modelo_jd": "7M230 ou 8R", "modelo_yanmar": "—", "modelo_case": "Puma 220 / Magnum 280", "justificativa": "JD domina cana em alta potência; Case IH Puma/Magnum é forte alternativa; LS compete pontualmente com H145"}, {"perfil": "Preparo de solo / Plantio direto pesado", "recomendacao": "", "modelo_ls": "", "modelo_jd": "", "modelo_yanmar": "", "modelo_case": "", "justificativa": "HORSCH é referência em preparo pesado e plantio direto; Joker CT e Terrano FX; complementa qualquer trator ≥100cv"}, {"perfil": "Semeadura de precisão monogrão", "recomendacao": "✅ HORSCH", "modelo_ls": "—", "modelo_jd": "—", "modelo_yanmar": "—", "modelo_case": "—", "justificativa": "HORSCH Maestro é referência em semeadora monogrão com ISOBUS e controle individual por linha"}, {"perfil": "Fumicultura e vinicultura (RS/SC/PR)", "recomendacao": "✅ LS Tractor", "modelo_ls": "MT7.80F ou R65", "modelo_jd": "5EN Estreito", "modelo_yanmar": "YT359 Plat.", "modelo_case": "—", "justificativa": "Fábrica LS em Garuva/SC favorece suporte regional; MT7 ideal p/ fileiras estreitas; Yanmar YT359 alternativa acessível"}, {"perfil": "💡  RESUMO: Yanmar e LS Tractor lideram custo-benefício nos compactos e médios até ~150cv. John Deere é referência para grandes propriedades, AP e frotas. Case IH é forte alternativa ao JD no médio-alto e grandes lavouras com AFS Connect. HORSCH é a escolha para implementos especializados (semeadoras, pulverizadores, grades). Todas têm acesso ao BNDES/FINAME.", "recomendacao": "", "modelo_ls": "", "modelo_jd": "", "modelo_yanmar": "", "modelo_case": "", "justificativa": ""}]};

const BRAND_CONFIG: Record<string, { color: string; bg: string; border: string; flag: string }> = {
  "John Deere": { color: "#009900", bg: "#f0fdf4", border: "#86efac", flag: "🟢" },
  "Yanmar":     { color: "#cc6600", bg: "#fff7ed", border: "#fdba74", flag: "🟠" },
  "Case IH":    { color: "#cc0000", bg: "#fef2f2", border: "#fca5a5", flag: "🔴" },
};

const LS_COLOR = "#0a1e5a";
const LS_RED = "#e21d3c";

type LSModel = {
  modelo: string; cv: number | null; serie: string;
  versao: string; aplicacao: string; culturas: string;
};

type CompModel = {
  modelo: string; cv: number | null; serie: string;
  versao: string; aplicacao: string; culturas: string;
};

type Mapping = { comp: CompModel; ls_alts: LSModel[] };

// ── HELPERS ──────────────────────────────────────────────────────────────────
function formatCv(cv: number | null) {
  return cv ? `${cv}cv` : "—";
}

function priceSaving(brand: string, cv: number | null): string {
  if (!cv) return "";
  if (brand === "John Deere") {
    if (cv <= 40) return "economia de ~R$20-45k";
    if (cv <= 80) return "economia de ~R$30-85k";
    if (cv <= 130) return "economia de ~R$30-60k";
    return "economia de ~R$70-190k";
  }
  if (brand === "Yanmar") {
    if (cv <= 40) return "preço similar";
    return "economia de ~R$20-40k";
  }
  if (brand === "Case IH") {
    if (cv <= 80) return "economia de ~R$40-70k";
    return "economia de ~R$60-120k";
  }
  return "";
}

// ── COMPONENTS ───────────────────────────────────────────────────────────────
function LSModelCard({ model, saving }: { model: LSModel; saving?: string }) {
  const [, setLocation] = useLocation();
  return (
    <div
      className="rounded-xl border-2 p-4 cursor-pointer hover:shadow-md transition-all"
      style={{ borderColor: LS_RED, background: "#fff8f8" }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: LS_COLOR }}>🚜 {model.modelo}</span>
            {model.versao && (
              <Badge className="text-xs" style={{ background: LS_RED + "20", color: LS_RED }}>
                {model.versao}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{model.serie}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-bold" style={{ color: LS_RED }}>{formatCv(model.cv)}</span>
          {saving && (
            <p className="text-xs font-semibold text-green-700 mt-0.5">💰 {saving}</p>
          )}
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
    <div
      className="rounded-xl border-2 p-4 space-y-3"
      style={{ borderColor: LS_COLOR + "40", background: LS_COLOR + "06" }}
    >
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5" style={{ color: LS_RED }} />
        <p className="text-sm font-bold" style={{ color: LS_COLOR }}>Por que escolher LS Tractor?</p>
      </div>
      <p className="text-sm font-semibold text-foreground leading-relaxed">{arg.principal}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{arg.detalhe}</p>
      <div
        className="flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold"
        style={{ background: "#f0fdf4", color: "#166534" }}
      >
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
        <Badge
          className="text-xs shrink-0"
          style={{
            background: isLS ? LS_RED : "#94a3b8",
            color: "white"
          }}
        >
          {isLS ? "✅ LS" : decision.recomendacao.replace("✅ ","").replace("⚖️ ","")}
        </Badge>
      </div>
      {decision.modelo_ls && (
        <p className="text-xs font-mono font-semibold mt-1" style={{ color: LS_COLOR }}>
          🚜 {decision.modelo_ls}
        </p>
      )}
      {decision.justificativa && (
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
          {decision.justificativa}
        </p>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Comparativos() {
  const [, setLocation] = useLocation();
  const [selectedBrand, setSelectedBrand] = useState<string>("John Deere");
  const [search, setSearch] = useState("");
  const [selectedComp, setSelectedComp] = useState<Mapping | null>(null);
  const [activeTab, setActiveTab] = useState<"busca" | "perfil" | "precos">("busca");

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

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Comparativos de Modelos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selecione a máquina do concorrente e veja a alternativa LS Tractor com os argumentos de venda
          </p>
        </div>
        <Button
          size="sm"
          style={{ background: "#25D366", color: "white" }}
          className="gap-2"
          onClick={() => {
            if (!selectedComp) return;
            const modelo_ls = selectedComp.ls_alts[0]?.modelo ?? "nossa linha";
            const comp = selectedComp.comp.modelo;
            const arg = (DATA.ls_arguments as any)[selectedBrand]?.principal ?? "";
            const msg = `Olá! Sou da Gallotti Tractor | LS Tractor.\n\nVi que vocês utilizam/avaliam o *${comp}* e gostaria de apresentar o *${modelo_ls}* como alternativa.\n\n${arg}\n\nPosso enviar uma comparação técnica e simulação FINAME?`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
          }}
          disabled={!selectedComp}
        >
          <MessageCircle className="w-4 h-4" />
          Enviar argumento WA
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {([
          { key: "busca", label: "🔍 Busca por Modelo", icon: Search },
          { key: "perfil", label: "🎯 Por Perfil / Uso", icon: Target },
          { key: "precos", label: "💰 Comparativo de Preços", icon: BarChart3 },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
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
          {/* Left: brand + model selector */}
          <div className="lg:col-span-2 space-y-3">
            {/* Brand selector */}
            <div className="grid grid-cols-3 gap-2">
              {brands.map(b => {
                const c = BRAND_CONFIG[b];
                const isSelected = selectedBrand === b;
                return (
                  <button
                    key={b}
                    onClick={() => { setSelectedBrand(b); setSelectedComp(null); setSearch(""); }}
                    className="rounded-xl border-2 p-3 text-center transition-all"
                    style={{
                      borderColor: isSelected ? c.color : "var(--border)",
                      background: isSelected ? c.bg : "var(--card)",
                    }}
                  >
                    <div className="text-xl mb-1">{c.flag}</div>
                    <div className="text-xs font-bold leading-tight" style={{ color: isSelected ? c.color : "var(--text-muted)" }}>
                      {b.split(" ")[0]}
                      {b.split(" ")[1] && <><br />{b.split(" ")[1]}</>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar modelo ${selectedBrand}...`}
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedComp(null); }}
                className="pl-9"
              />
            </div>

            {/* Model list */}
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {brandMappings.map((mapping, i) => {
                const isSelected = selectedComp?.comp.modelo === mapping.comp.modelo;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedComp(mapping)}
                    className="w-full text-left rounded-xl border-2 p-3 transition-all hover:shadow-sm"
                    style={{
                      borderColor: isSelected ? cfg.color : "var(--border)",
                      background: isSelected ? cfg.bg : "var(--card)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold" style={{ color: isSelected ? cfg.color : "var(--foreground)" }}>
                          {cfg.flag} {mapping.comp.modelo}
                        </p>
                        <p className="text-xs text-muted-foreground">{mapping.comp.serie.split("(")[0].trim()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">{formatCv(mapping.comp.cv)}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    {mapping.ls_alts.length > 0 && (
                      <p className="text-xs mt-1.5 font-semibold" style={{ color: LS_RED }}>
                        🚜 LS: {mapping.ls_alts.slice(0,2).map(m => m.modelo).join(", ")}
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

          {/* Right: LS alternatives + argument */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedComp ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-muted-foreground">
                <BarChart2 className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-semibold">Selecione um modelo {selectedBrand}</p>
                <p className="text-sm mt-1">para ver as alternativas LS Tractor</p>
              </div>
            ) : (
              <>
                {/* Competitor model summary */}
                <div
                  className="rounded-xl border-2 p-4"
                  style={{ borderColor: cfg.color, background: cfg.bg }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
                        {cfg.flag} {selectedBrand} — Modelo Comparado
                      </p>
                      <p className="text-xl font-bold mt-1" style={{ color: cfg.color }}>
                        {selectedComp.comp.modelo}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedComp.comp.serie}</p>
                    </div>
                    <div className="text-right">
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

                {/* Arrow */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: LS_RED }}>
                    <ArrowRight className="w-3.5 h-3.5" />
                    Alternativa LS Tractor
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* LS alternatives */}
                <div className="space-y-3">
                  {selectedComp.ls_alts.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      Sem alternativa direta — consulte o Guia por Perfil
                    </p>
                  ) : (
                    selectedComp.ls_alts.map((m, i) => (
                      <LSModelCard
                        key={i}
                        model={m}
                        saving={i === 0 ? priceSaving(selectedBrand, selectedComp.comp.cv) : undefined}
                      />
                    ))
                  )}
                </div>

                {/* Main argument */}
                <ArgumentCard brand={selectedBrand} />

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    className="gap-2 flex-1"
                    style={{ background: "#25D366", color: "white" }}
                    onClick={() => {
                      const modelo_ls = selectedComp.ls_alts[0]?.modelo ?? "nossa linha";
                      const arg = (DATA.ls_arguments as any)[selectedBrand]?.principal ?? "";
                      const msg = `Olá! Da Gallotti Tractor | LS Tractor.\n\nSei que vocês avaliam o *${selectedComp.comp.modelo}* (${selectedBrand}). Queria apresentar o *${modelo_ls}* como alternativa superior em custo-benefício:\n\n${arg}\n\n✅ Aprovado FINAME/BNDES\n🚜 Entrega no Nordeste em até 30 dias\n\nPosso enviar uma simulação comparativa?`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Copiar argumento WA
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 flex-1"
                    onClick={() => setLocation("/work-mode")}
                  >
                    <Zap className="w-4 h-4" />
                    Usar no Modo de Trabalho
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
              Ideal para usar durante a qualificação do lead.
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
              💰 Comparativo de faixas de preço por potência — estimativas de mercado 2024/2025.
              Use como referência durante a negociação.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: LS_COLOR }}>
                  <th className="text-left px-4 py-3 text-white font-semibold">Faixa de Potência</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: LS_RED }}>🚜 LS Tractor</th>
                  <th className="text-left px-4 py-3 text-white/80 font-semibold">🟢 John Deere</th>
                  <th className="text-left px-4 py-3 text-white/80 font-semibold">🟠 Yanmar</th>
                  <th className="text-left px-4 py-3 text-white/80 font-semibold">🔴 Case IH</th>
                </tr>
              </thead>
              <tbody>
                {(DATA.prices as any[]).map((p, i) => (
                  <tr key={i} className="border-t border-border" style={{ background: i % 2 === 0 ? "var(--card)" : "var(--muted)/20" }}>
                    <td className="px-4 py-3 font-semibold text-foreground">{p.faixa}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: LS_RED }}>{p.ls}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.jd || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.yanmar || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.case || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
