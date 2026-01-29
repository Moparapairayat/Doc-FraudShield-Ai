import { useEffect, useState } from "react";
import { FileText, AlertTriangle, Shield, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Stats {
  totalScans: number;
  avgRiskScore: number;
  highRiskCount: number;
  thisWeekScans: number;
}

export const QuickStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        // Get total scans and avg risk score
        const { data: scanData, error: scanError } = await supabase
          .from("scan_results")
          .select(`
            id,
            overall_risk_score,
            risk_level,
            created_at,
            document:documents!inner(user_id)
          `)
          .eq("document.user_id", user.id);

        if (scanError) throw scanError;

        const scans = scanData || [];
        const totalScans = scans.length;
        const avgRiskScore =
          totalScans > 0
            ? Math.round(scans.reduce((sum, s) => sum + s.overall_risk_score, 0) / totalScans)
            : 0;
        const highRiskCount = scans.filter((s) => s.risk_level === "high").length;

        // Get this week's scans
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const thisWeekScans = scans.filter(
          (s) => new Date(s.created_at) >= weekAgo
        ).length;

        setStats({
          totalScans,
          avgRiskScore,
          highRiskCount,
          thisWeekScans,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-4 animate-pulse"
          >
            <div className="h-10 w-10 rounded-lg bg-muted mb-3" />
            <div className="h-4 w-16 bg-muted rounded mb-1" />
            <div className="h-6 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      icon: FileText,
      label: "Total Scans",
      value: stats.totalScans,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: TrendingUp,
      label: "Avg Risk Score",
      value: stats.avgRiskScore,
      color:
        stats.avgRiskScore < 30
          ? "text-success"
          : stats.avgRiskScore < 60
          ? "text-warning"
          : "text-destructive",
      bgColor:
        stats.avgRiskScore < 30
          ? "bg-success/10"
          : stats.avgRiskScore < 60
          ? "bg-warning/10"
          : "bg-destructive/10",
    },
    {
      icon: AlertTriangle,
      label: "High Risk",
      value: stats.highRiskCount,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      icon: Shield,
      label: "This Week",
      value: stats.thisWeekScans,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, index) => (
        <div
          key={item.label}
          className="rounded-xl border bg-card p-4 transition-all hover:shadow-md animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div
            className={cn(
              "mb-3 flex h-10 w-10 items-center justify-center rounded-lg",
              item.bgColor
            )}
          >
            <item.icon className={cn("h-5 w-5", item.color)} />
          </div>
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p className={cn("text-2xl font-bold", item.color)}>{item.value}</p>
        </div>
      ))}
    </div>
  );
};
