import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download, FileText, Lock, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

const COLORS = ["#F5A623", "#111111", "#16a34a", "#ca8a04", "#7c3aed", "#0891b2"];

export default function Reports() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const [, setLocation] = useLocation();
  const [_period, _setPeriod] = useState("30");

  const isAdmOrGerente = role === "adm" || role === "admin" || role === "gerente";
  const isAdm = role === "adm" || role === "admin";

  if (!isAdmOrGerente) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Acesso restrito a Administradores e Gerentes</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/dashboard")}>Voltar</Button>
      </div>
    );
  }

  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery({ period: "all" });
  const { data: ranking } = trpc.dashboard.ranking.useQuery({});
  const { data: disqualReasons } = trpc.dashboard.disqualificationReasons.useQuery();
  const { data: allCommissions } = trpc.commissions.all.useQuery();
  const { data: commissionConfig } = trpc.commissions.getConfig.useQuery();

  // Taxas de conversão consistentes com o Dashboard
  const totalAttempts = (stats as any)?.totalAttempts ?? 0;
  const totalContacts = (stats as any)?.totalContacts ?? 0;
  const qualifiedLeads = stats?.qualifiedLeads ?? 0;
  const totalActivity = totalAttempts + totalContacts;
  // Taxa 1: Tentativas → Contatos realizados
  const conversionAttemptToContact = totalAttempts > 0
    ? ((totalContacts / totalAttempts) * 100).toFixed(1) : "0.0";
  // Taxa 2: Contatos realizados → Qualificados
  const conversionContactToQualified = totalContacts > 0
    ? ((qualifiedLeads / totalContacts) * 100).toFixed(1) : "0.0";
  // Taxa geral: (tentativas+contatos) → qualificados
  const conversionRate = totalActivity > 0
    ? ((qualifiedLeads / totalActivity) * 100).toFixed(1) : "0.0";

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(26, 58, 92);
      doc.text("LN Máquinas — Relatório de Prospecção", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
      // KPI Summary
      doc.setFontSize(13);
      doc.setTextColor(26, 58, 92);
      doc.text("Resumo de KPIs", 14, 40);
      autoTable(doc, {
        startY: 45,
        head: [["Indicador", "Valor"]],
        body: [
          ["Total de Leads", String(stats?.totalLeads ?? 0)],
          ["Leads Qualificados", String(stats?.qualifiedLeads ?? 0)],
          ["Leads Desqualificados", String(stats?.disqualifiedLeads ?? 0)],
          ["Taxa Geral (atividades → qualif.)", `${conversionRate}%`],
          ["Taxa Tent. → Contato", `${conversionAttemptToContact}%`],
          ["Taxa Contato → Qualif.", `${conversionContactToQualified}%`],
        ],
        headStyles: { fillColor: [26, 58, 92] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });
      // Ranking
      const rankingData = ranking ?? [];
      if (rankingData.length > 0) {
        doc.setFontSize(13);
        doc.setTextColor(26, 58, 92);
        const rankY = (doc as any).lastAutoTable?.finalY ?? 100;
        doc.text("Ranking por BDR", 14, rankY + 12);
        autoTable(doc, {
          startY: rankY + 17,
          head: [["Posição", "BDR", "Qualificados", "Tentativas"]],
          body: rankingData.slice(0, 20).map((r: any, i: number) => [
            String(i + 1),
            r.userName ?? "—",
            String(r.qualifiedCount ?? 0),
            String(r.totalAttempts ?? 0),
          ]),
          headStyles: { fillColor: [245, 166, 35] },
          alternateRowStyles: { fillColor: [245, 247, 250] },
        });
      }
      // Leads qualificados por estado
      const byUfData = stats?.byUf ?? [];
      if (byUfData.length > 0) {
        const ufY = (doc as any).lastAutoTable?.finalY ?? 120;
        const needsNewPage = ufY > 220;
        if (needsNewPage) doc.addPage();
        doc.setFontSize(13);
        doc.setTextColor(26, 58, 92);
        doc.text("Leads Qualificados por Estado", 14, needsNewPage ? 20 : ufY + 12);
        autoTable(doc, {
          startY: needsNewPage ? 25 : ufY + 17,
          head: [["Estado", "Leads Qualificados"]],
          body: byUfData.map((r: any) => [r.uf ?? "—", String(r.count ?? 0)]),
          headStyles: { fillColor: [124, 58, 237] },
          alternateRowStyles: { fillColor: [245, 247, 250] },
        });
      }
      // Comissões por BDR
      const commissionsData = allCommissions ?? [];
      if (commissionsData.length > 0) {
        doc.addPage();
        doc.setFontSize(13);
        doc.setTextColor(26, 58, 92);
        doc.text("Comissões por BDR", 14, 20);
        if (commissionConfig) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Valor por lead qualificado: R$ ${commissionConfig.valuePerQualifiedLead ?? "0"}`, 14, 28);
        }
        autoTable(doc, {
          startY: 33,
          head: [["BDR", "Leads Qualificados", "Comissão (R$)", "Status"]],
          body: commissionsData.map((c: any) => [
            c.userName ?? "—",
            String(c.qualifiedLeads ?? 0),
            `R$ ${parseFloat(c.totalCommission ?? "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            c.status ?? "Pendente",
          ]),
          headStyles: { fillColor: [22, 163, 74] },
          alternateRowStyles: { fillColor: [245, 247, 250] },
        });
      }
      doc.save(`LNMaquinas_Relatorio_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "LN Máquinas Prospecção";
      workbook.created = new Date();
      // Sheet 1: KPIs
      const kpiSheet = workbook.addWorksheet("KPIs");
      kpiSheet.columns = [
        { header: "Indicador", key: "label", width: 30 },
        { header: "Valor", key: "value", width: 20 },
      ];
      kpiSheet.addRows([
        { label: "Total de Leads", value: stats?.totalLeads ?? 0 },
        { label: "Leads Qualificados", value: stats?.qualifiedLeads ?? 0 },
        { label: "Leads Desqualificados", value: stats?.disqualifiedLeads ?? 0 },
        { label: "Taxa de Conversão (%)", value: parseFloat(conversionRate) },
      ]);
      kpiSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      kpiSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
      // Sheet 2: Ranking
      const rankSheet = workbook.addWorksheet("Ranking BDRs");
      rankSheet.columns = [
        { header: "Posição", key: "pos", width: 10 },
        { header: "BDR", key: "name", width: 30 },
        { header: "Qualificados", key: "qualified", width: 15 },
        { header: "Tentativas", key: "attempts", width: 15 },
      ];
      (ranking ?? []).forEach((r: any, i: number) => {
        rankSheet.addRow({ pos: i + 1, name: r.userName ?? "—", qualified: r.qualifiedCount ?? 0, attempts: r.totalAttempts ?? 0 });
      });
      rankSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      rankSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5A623" } };
      // Sheet 3: Motivos de Desqualificação
      if (disqualReasons && disqualReasons.length > 0) {
        const dqSheet = workbook.addWorksheet("Desqualificações");
        dqSheet.columns = [
          { header: "Motivo", key: "reason", width: 50 },
          { header: "Quantidade", key: "count", width: 15 },
        ];
        disqualReasons.forEach((r: any) => {
          dqSheet.addRow({ reason: r.reason ?? "—", count: r.count ?? 0 });
        });
        dqSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        dqSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LNMaquinas_Relatorio_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Planilha Excel gerada com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar Excel.");
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">Análise completa de performance e conversão</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isAdm ? (
            <>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border border-border">
              <Lock className="w-3.5 h-3.5" />
              Exportação restrita ao ADM
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total de Leads", value: stats?.totalLeads ?? 0, sub: "na base completa", icon: Users, color: "#e8621a" },
            { label: "Qualificados", value: qualifiedLeads, sub: `${conversionRate}% das atividades`, icon: TrendingUp, color: "#16a34a" },
            { label: "Desqualificados", value: stats?.disqualifiedLeads ?? 0, sub: "com justificativa", icon: FileText, color: "#ca8a04" },
            { label: "Tentativas", value: totalAttempts.toLocaleString("pt-BR"), sub: `${totalContacts} contatos realizados`, icon: TrendingUp, color: "#0ea5e9" },
            { label: "Taxa Tent. → Contato", value: `${conversionAttemptToContact}%`, sub: `${totalContacts} de ${totalAttempts}`, icon: TrendingUp, color: "#7c3aed" },
            { label: "Taxa Contato → Qualif.", value: `${conversionContactToQualified}%`, sub: `${qualifiedLeads} de ${totalContacts}`, icon: TrendingUp, color: "#f59e0b" },
          ].map((item) => (
            <Card key={item.label} className="border-border">
              <CardContent className="p-3 md:p-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: item.color + "20" }}>
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <p className="text-xl md:text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                {item.sub && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Ranking Chart */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ranking por BDR</CardTitle>
            <CardDescription>Leads qualificados por colaborador</CardDescription>
          </CardHeader>
          <CardContent>
            {(ranking ?? []).length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sem dados disponíveis</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(ranking ?? []).slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="userName" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v?.split(" ")[0] ?? v} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="qualifiedCount" fill="#e8621a" radius={[4, 4, 0, 0]} name="Qualificados" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Disqualification Reasons */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Motivos de Desqualificação</CardTitle>
            <CardDescription>Principais razões de descarte</CardDescription>
          </CardHeader>
          <CardContent>
            {(disqualReasons ?? []).length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sem dados disponíveis</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={(disqualReasons ?? []).slice(0, 6)}
                    dataKey="count"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(disqualReasons ?? []).slice(0, 6).map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By State */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leads por Estado</CardTitle>
            <CardDescription>Distribuição geográfica dos leads</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats?.byUf ?? []).length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sem dados disponíveis</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(stats?.byUf ?? []).slice(0, 10)} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="uf" type="category" tick={{ fontSize: 11 }} width={30} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1a3a5c" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By Status */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leads por Status</CardTitle>
            <CardDescription>Distribuição por status de contato</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats?.byStatus ?? []).length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sem dados disponíveis</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={(stats?.byStatus ?? []).slice(0, 6)}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {(stats?.byStatus ?? []).slice(0, 6).map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
