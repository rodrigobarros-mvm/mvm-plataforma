import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, HelpCircle, MessageCircle, Phone } from "lucide-react";

const WHATSAPP_NUMBER = "5581979091165";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

const FAQS = [
  {
    question: "Como qualificar um lead?",
    answer: "Acesse a aba 'Lista Completa' ou 'Alta Prioridade', abra o lead desejado, preencha todos os campos obrigatórios (marcados com *) e clique em 'Qualificar Lead'. O sistema bloqueará a qualificação se houver campos em branco.",
  },
  {
    question: "O que fazer quando um lead é desqualificado?",
    answer: "Ao desqualificar, é obrigatório informar o motivo com pelo menos 10 caracteres. Isso alimenta os relatórios de análise de desqualificação e ajuda a equipe a melhorar a abordagem.",
  },
  {
    question: "Como registrar tentativas de contato?",
    answer: "Dentro do detalhe do lead, use a seção 'Registrar Interação' e selecione o tipo 'Tentativa de contato'. Isso conta para o KPI de 80 tentativas diárias.",
  },
  {
    question: "Como ver meu ranking e comissões?",
    answer: "Acesse o menu 'Ranking' para ver sua posição entre os BDRs, e 'Comissões' para acompanhar seus ganhos por leads qualificados.",
  },
  {
    question: "Como recebo as notificações?",
    answer: "As notificações aparecem no sino no topo da plataforma. Além disso, alertas importantes são enviados por e-mail corporativo e WhatsApp conforme configurado pelo gestor.",
  },
  {
    question: "Não consigo fazer login. O que fazer?",
    answer: "Verifique se seu acesso foi habilitado pelo administrador. Caso seu acesso esteja bloqueado, entre em contato com o gestor ou pelo SAC abaixo.",
  },
];

export default function SAC() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Central de Ajuda (SAC)
        </h1>
        <p className="text-muted-foreground mt-1">Dúvidas sobre a plataforma? Estamos aqui para ajudar.</p>
      </div>

      {/* WhatsApp CTA */}
      <Card className="border-border" style={{ background: "linear-gradient(135deg, #111111 0%, #1a1a1a 100%)" }}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#25D366" }}>
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Fale com o Suporte
              </h2>
              <p className="text-white/60 text-sm mt-1 mb-4">
                Entre em contato diretamente com o responsável pelo suporte da plataforma via WhatsApp.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <Button className="gap-2" style={{ background: "#25D366", color: "white" }}>
                    <MessageCircle className="w-4 h-4" />
                    Abrir WhatsApp
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Phone className="w-4 h-4" />
                  <span>(81) 9.7909-1165</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/60 text-xs">
              <strong className="text-white">Rodrigo Barros</strong> — Diretor Comercial · Gallotti Tractor | LS Tractor
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="w-4 h-4" style={{ color: "#e21d3c" }} />
            Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FAQS.map((faq, i) => (
            <div key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5 shrink-0 text-xs" style={{ background: "#e21d3c20", color: "#c47e00", border: "1px solid #e21d3c40" }}>
                  {String(i + 1).padStart(2, "0")}
                </Badge>
                <div>
                  <p className="font-semibold text-sm text-foreground">{faq.question}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="border-border">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground text-center">
            Não encontrou o que precisava? Envie uma mensagem pelo WhatsApp e nossa equipe responderá em breve.
          </p>
          <div className="flex justify-center mt-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                Falar pelo WhatsApp
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
