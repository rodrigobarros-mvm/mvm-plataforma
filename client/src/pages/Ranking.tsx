import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Medal, Trophy } from "lucide-react";

export default function Ranking() {
  const { data: ranking, isLoading } = trpc.dashboard.ranking.useQuery({});

  const medals = [
    { icon: Trophy, color: "#e8621a", bg: "#e8621a20", label: "1°" },
    { icon: Medal, color: "#94a3b8", bg: "#94a3b820", label: "2°" },
    { icon: Medal, color: "#ca8a04", bg: "#ca8a0420", label: "3°" },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Ranking de BDRs
        </h1>
        <p className="text-muted-foreground mt-1">Classificação por leads qualificados</p>
      </div>

      {/* Top 3 Podium */}
      {!isLoading && (ranking ?? []).length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[ranking![1], ranking![0], ranking![2]].map((r, idx) => {
            const positions = [1, 0, 2];
            const pos = positions[idx]!;
            const medal = medals[pos]!;
            const isFirst = pos === 0;
            return (
              <Card key={r.userId} className={`border-border text-center ${isFirst ? "ring-2 ring-orange-400" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex justify-center mb-3">
                    <div className="relative">
                      <Avatar className={`${isFirst ? "w-16 h-16" : "w-12 h-12"} border-4`}
                        style={{ borderColor: medal.color }}>
                        <AvatarImage src={r.userPhoto ?? ""} />
                        <AvatarFallback className="font-bold text-white"
                          style={{ background: "oklch(0.22 0.08 240)", fontSize: isFirst ? "1.25rem" : "1rem" }}>
                          {r.userName?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: medal.color }}>
                        <medal.icon className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>
                  <p className="font-semibold text-sm mt-3 truncate">{r.userName}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: medal.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {r.qualifiedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">leads qualificados</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Ranking */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4" style={{ color: "#e8621a" }} />
            Classificação Completa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (ranking ?? []).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
          ) : (
            <div className="space-y-2">
              {(ranking ?? []).map((r, i) => (
                <div key={r.userId} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background: i === 0 ? "#e8621a" : i === 1 ? "#94a3b8" : i === 2 ? "#ca8a04" : "#e2e8f0",
                      color: i < 3 ? "white" : "#64748b"
                    }}>
                    {i + 1}
                  </div>
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={r.userPhoto ?? ""} />
                    <AvatarFallback className="text-sm font-bold" style={{ background: "oklch(0.22 0.08 240)", color: "white" }}>
                      {r.userName?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{r.userName}</p>
                    {(r as any).cargo && <p className="text-xs text-muted-foreground">{(r as any).cargo}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.qualifiedCount}</p>
                    <p className="text-xs text-muted-foreground">leads</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
