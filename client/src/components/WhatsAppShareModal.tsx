/**
 * WhatsAppShareModal
 * Aparece após a celebração de qualificação de lead.
 * Exibe mensagem pré-formatada com TODOS os dados do lead + histórico de interações
 * para enviar ao consultor comercial via WhatsApp.
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  X,
  Copy,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Building2,
  MapPin,
  Phone,
  User,
  Tag,
  Hash,
  Mail,
  Loader2,
  Clock,
  FileText,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface LeadShareData {
  id: number;
  // Identificação
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  cnpj?: string | null;
  // Localização
  cidade?: string | null;
  uf?: string | null;
  enderecoCompleto?: string | null;
  googleMaps?: string | null;
  // Contato (obrigatórios)
  whatsapp1?: string | null;
  whatsapp2?: string | null;
  email?: string | null;
  // Qualificação (obrigatórios)
  nomeDecissor?: string | null;
  conheceMarca?: string | null;
  frotaAtual?: string | null;
  urgenciaCompra?: string | null;
  statusContato?: string | null;
  // Empresa
  segmento?: string | null;
  classificacao?: string | null;
  prioridade?: string | null;
  // Comercial
  modeloTrator?: string | null;
  ticketEstimado?: number | string | null;
  creditoFormaPagamento?: string | null;
  desafioPrincipal?: string | null;
  observacoes?: string | null;
}

export interface InteractionItem {
  id: number;
  type: string;
  content?: string | null;
  createdAt: Date | string;
}

interface WhatsAppShareModalProps {
  show: boolean;
  lead: LeadShareData | null;
  onClose: () => void;
}

function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatInteractionType(type: string): string {
  const map: Record<string, string> = {
    contato: "Contato realizado",
    tentativa: "Tentativa de contato",
    observacao: "Observação",
    qualificacao: "Qualificação",
    desqualificacao: "Desqualificação",
    whatsapp_share: "📲 Compartilhado via WhatsApp",
  };
  return map[type] ?? type;
}

function buildWhatsAppMessage(lead: LeadShareData, interactions: InteractionItem[]): string {
  const nome = lead.nomeFantasia || lead.razaoSocial || "Lead";
  const lines: string[] = [];

  lines.push("🏆 *LEAD QUALIFICADO — LN MÁQUINAS*");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");

  // ── IDENTIFICAÇÃO ──
  lines.push("🏢 *DADOS DA EMPRESA*");
  lines.push(`• *Nome Fantasia:* ${nome}`);
  if (lead.razaoSocial && lead.razaoSocial !== lead.nomeFantasia) {
    lines.push(`• *Razão Social:* ${lead.razaoSocial}`);
  }
  if (lead.cnpj) lines.push(`• *CNPJ:* ${formatCnpj(lead.cnpj)}`);
  if (lead.segmento) lines.push(`• *Segmento:* ${lead.segmento}`);
  if (lead.classificacao) lines.push(`• *Classificação:* ${lead.classificacao}`);
  if (lead.prioridade) lines.push(`• *Prioridade:* ${lead.prioridade}`);

  // ── LOCALIZAÇÃO ──
  lines.push("");
  lines.push("📍 *LOCALIZAÇÃO*");
  if (lead.cidade || lead.uf) {
    lines.push(`• *Cidade/UF:* ${[lead.cidade, lead.uf].filter(Boolean).join(" — ")}`);
  }
  if (lead.enderecoCompleto) lines.push(`• *Endereço:* ${lead.enderecoCompleto}`);
  if (lead.googleMaps) lines.push(`• *Google Maps:* ${lead.googleMaps}`);

  // ── CONTATO ──
  lines.push("");
  lines.push("📞 *CONTATO*");
  if (lead.nomeDecissor) lines.push(`• *Decisor:* ${lead.nomeDecissor}`);
  if (lead.whatsapp1) lines.push(`• *WhatsApp/Cel 1:* ${formatPhone(lead.whatsapp1)}`);
  if (lead.whatsapp2) lines.push(`• *WhatsApp/Cel 2:* ${formatPhone(lead.whatsapp2)}`);
  if (lead.email) lines.push(`• *E-mail:* ${lead.email}`);

  // ── QUALIFICAÇÃO ──
  lines.push("");
  lines.push("✅ *DADOS DE QUALIFICAÇÃO*");
  if (lead.conheceMarca) lines.push(`• *Conhece a Marca:* ${lead.conheceMarca}`);
  if (lead.frotaAtual) lines.push(`• *Frota Atual:* ${lead.frotaAtual}`);
  if (lead.urgenciaCompra) lines.push(`• *Urgência de Compra:* ${lead.urgenciaCompra}`);
  if (lead.statusContato) lines.push(`• *Status do Contato:* ${lead.statusContato}`);

  // ── COMERCIAL ──
  const hasComercial = lead.modeloTrator || lead.ticketEstimado || lead.creditoFormaPagamento || lead.desafioPrincipal;
  if (hasComercial) {
    lines.push("");
    lines.push("💼 *INFORMAÇÕES COMERCIAIS*");
    if (lead.modeloTrator) lines.push(`• *Modelo Máquina:* ${lead.modeloTrator}`);
    if (lead.ticketEstimado) {
      lines.push(`• *Ticket Estimado:* ${Number(lead.ticketEstimado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
    }
    if (lead.creditoFormaPagamento) lines.push(`• *Crédito/Pagamento:* ${lead.creditoFormaPagamento}`);
    if (lead.desafioPrincipal) lines.push(`• *Desafio Principal:* ${lead.desafioPrincipal}`);
  }

  if (lead.observacoes) {
    lines.push("");
    lines.push("📝 *OBSERVAÇÕES*");
    lines.push(lead.observacoes);
  }

  // ── HISTÓRICO DE INTERAÇÕES ──
  if (interactions.length > 0) {
    lines.push("");
    lines.push("🗂️ *HISTÓRICO DE INTERAÇÕES*");
    // Mostrar até as últimas 10 interações (mais recentes primeiro)
    const recent = [...interactions].slice(0, 10);
    for (const inter of recent) {
      const dt = format(new Date(inter.createdAt), "dd/MM/yy HH:mm", { locale: ptBR });
      const tipo = formatInteractionType(inter.type);
      const texto = inter.content ? `: ${inter.content}` : "";
      lines.push(`• [${dt}] *${tipo}*${texto}`);
    }
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("_Enviado via LN Máquinas Prospecção_");

  return lines.join("\n");
}

export default function WhatsAppShareModal({ show, lead, onClose }: WhatsAppShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Buscar histórico de interações quando o modal abrir
  const { data: interactionsData, isLoading: loadingInteractions } = trpc.leads.getInteractions.useQuery(
    { leadId: lead?.id ?? 0 },
    { enabled: show && !!lead?.id }
  );

  // Mutation para registrar o compartilhamento
  const registerShare = trpc.leads.registerWhatsAppShare.useMutation();

  const interactions: InteractionItem[] = (interactionsData ?? []) as InteractionItem[];
  const message = lead ? buildWhatsAppMessage(lead, interactions) : "";
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

  const handleCopy = useCallback(() => {
    if (!message) return;
    const copyText = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).then(copyText).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = message;
        ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        copyText();
      });
    }
  }, [message]);

  const handleOpenWhatsApp = useCallback(async () => {
    // Registrar interação de compartilhamento no histórico do lead (antes de abrir o link)
    if (lead?.id && !shared) {
      try {
        await registerShare.mutateAsync({ leadId: lead.id });
        setShared(true);
      } catch {
        // Não bloquear o compartilhamento mesmo se o registro falhar
      }
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }, [whatsappUrl, lead?.id, shared, registerShare]);

  // Reset states when modal closes
  useEffect(() => {
    if (!show) {
      setCopied(false);
      setShared(false);
    }
  }, [show]);

  if (!lead) return null;

  const nome = lead.nomeFantasia || lead.razaoSocial || "Lead";

  // Campos obrigatórios preenchidos
  const requiredFields = [
    { key: "nomeDecissor", label: "Decisor", value: lead.nomeDecissor },
    { key: "whatsapp1", label: "WhatsApp/Cel", value: lead.whatsapp1 },
    { key: "email", label: "E-mail", value: lead.email },
    { key: "conheceMarca", label: "Conhece a Marca", value: lead.conheceMarca },
    { key: "frotaAtual", label: "Frota Atual", value: lead.frotaAtual },
    { key: "urgenciaCompra", label: "Urgência", value: lead.urgenciaCompra },
  ];
  const missingRequired = requiredFields.filter(f => !f.value);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ background: "#fff", maxHeight: "90vh" }}
            initial={{ scale: 0.85, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header verde WhatsApp */}
            <div
              className="px-5 py-4 flex items-center justify-between shrink-0"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Compartilhar via WhatsApp</p>
                  <p className="text-white/80 text-xs">Enviar lead qualificado ao consultor</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Corpo com scroll */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Alerta de campos faltando */}
              {missingRequired.length > 0 && (
                <div
                  className="rounded-xl p-3 flex items-start gap-2"
                  style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}
                >
                  <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-orange-800 text-xs font-semibold">Campos obrigatórios não preenchidos:</p>
                    <p className="text-orange-700 text-xs mt-0.5">
                      {missingRequired.map(f => f.label).join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Resumo do lead */}
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="font-bold text-green-900 text-sm truncate">{nome}</span>
                </div>
                {lead.cnpj && (
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-green-700 text-xs font-mono">{formatCnpj(lead.cnpj)}</span>
                  </div>
                )}
                {(lead.cidade || lead.uf) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-green-700 text-xs">{[lead.cidade, lead.uf].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {lead.nomeDecissor && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-green-700 text-xs">{lead.nomeDecissor}</span>
                  </div>
                )}
                {lead.whatsapp1 && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-green-700 text-xs">{formatPhone(lead.whatsapp1)}</span>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-green-700 text-xs">{lead.email}</span>
                  </div>
                )}
                {lead.segmento && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-green-700 text-xs">{lead.segmento}</span>
                  </div>
                )}
                {interactions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-green-700 text-xs">{interactions.length} interaç{interactions.length === 1 ? "ão" : "ões"} registrada{interactions.length === 1 ? "" : "s"}</span>
                  </div>
                )}
              </div>

              {/* Preview da mensagem */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prévia da mensagem</p>
                  {loadingInteractions && (
                    <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                  )}
                </div>
                <div
                  className="rounded-xl p-3 whitespace-pre-wrap overflow-y-auto"
                  style={{
                    background: "#e5ddd5",
                    color: "#303030",
                    lineHeight: "1.5",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    maxHeight: "220px",
                  }}
                >
                  {loadingInteractions ? (
                    <span className="text-gray-500 italic">Carregando histórico de interações...</span>
                  ) : message}
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-sm"
                  onClick={handleCopy}
                  disabled={loadingInteractions}
                >
                  {copied ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-500" /> Copiado!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copiar mensagem</>
                  )}
                </Button>
                <Button
                  className="flex-1 gap-2 text-sm font-semibold"
                  style={{ background: "#25D366", color: "white" }}
                  onClick={handleOpenWhatsApp}
                  disabled={loadingInteractions}
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir WhatsApp
                </Button>
              </div>

              {/* Fechar sem compartilhar */}
              <button
                onClick={onClose}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                Fechar sem compartilhar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
