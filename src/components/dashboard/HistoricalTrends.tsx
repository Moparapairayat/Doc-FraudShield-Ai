import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, FileText, AlertTriangle, Shield, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TrendData {
  date: string;
  avgScore: number;
  scanCount: number;
  highRisk: number;
  lowRisk: number;
}

interface DocumentTypeStats {
  type: string;
  count: number;
  avgRisk: number;
}

interface RiskDistribution {
  level: string;
  count: number;
  color: string;
}

export const HistoricalTrends = () => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [docTypeStats, setDocTypeStats] = useState<DocumentTypeStats[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<RiskDistribution[]>([]);
  const [totalScans, setTotalScans] = useState(0);
  const [avgRiskScore, setAvgRiskScore] = useState(0);
  const [riskTrend, setRiskTrend] = useState<"up" | "down" | "stable">("stable");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;

      setLoading(true);

      // Fetch all scan results with document info
      const { data: scans } = await supabase
        .from("scan_results")
        .select(`
          id,
          overall_risk_score,
          risk_level,
          document_type,
          created_at,
          document:documents!inner(user_id)
        `)
        .eq("document.user_id", user.id)
        .order("created_at", { ascending: true });

      if (!scans || scans.length === 0) {
        setLoading(false);
        return;
      }

      setTotalScans(scans.length);

      // Calculate average risk score
      const avgScore = Math.round(
        scans.reduce((sum, s) => sum + s.overall_risk_score, 0) / scans.length
      );
      setAvgRiskScore(avgScore);

      // Group by date for trend data
      const dateGroups: Record<string, typeof scans> = {};
      scans.forEach((scan) => {
        const date = new Date(scan.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (!dateGroups[date]) dateGroups[date] = [];
        dateGroups[date].push(scan);
      });

      const trends: TrendData[] = Object.entries(dateGroups).map(([date, group]) => ({
        date,
        avgScore: Math.round(group.reduce((s, g) => s + g.overall_risk_score, 0) / group.length),
        scanCount: group.length,
        highRisk: group.filter((g) => g.risk_level === "high" || g.risk_level === "critical").length,
        lowRisk: group.filter((g) => g.risk_level === "low").length,
      }));
      setTrendData(trends);

      // Calculate risk trend (compare first half to second half)
      if (scans.length >= 4) {
        const midpoint = Math.floor(scans.length / 2);
        const firstHalfAvg = scans.slice(0, midpoint).reduce((s, g) => s + g.overall_risk_score, 0) / midpoint;
        const secondHalfAvg =
          scans.slice(midpoint).reduce((s, g) => s + g.overall_risk_score, 0) / (scans.length - midpoint);
        if (secondHalfAvg > firstHalfAvg + 5) setRiskTrend("up");
        else if (secondHalfAvg < firstHalfAvg - 5) setRiskTrend("down");
        else setRiskTrend("stable");
      }

      // Document type statistics
      const typeGroups: Record<string, typeof scans> = {};
      scans.forEach((scan) => {
        const type = scan.document_type || "Unknown";
        if (!typeGroups[type]) typeGroups[type] = [];
        typeGroups[type].push(scan);
      });

      const docStats: DocumentTypeStats[] = Object.entries(typeGroups)
        .map(([type, group]) => ({
          type: type.length > 15 ? type.substring(0, 15) + "..." : type,
          count: group.length,
          avgRisk: Math.round(group.reduce((s, g) => s + g.overall_risk_score, 0) / group.length),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setDocTypeStats(docStats);

      // Risk level distribution
      const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
      scans.forEach((scan) => {
        const level = scan.risk_level as keyof typeof riskCounts;
        if (riskCounts[level] !== undefined) riskCounts[level]++;
      });

      setRiskDistribution([
        { level: "Low", count: riskCounts.low, color: "hsl(var(--success))" },
        { level: "Medium", count: riskCounts.medium, color: "hsl(var(--warning))" },
        { level: "High", count: riskCounts.high, color: "hsl(var(--destructive))" },
        { level: "Critical", count: riskCounts.critical, color: "hsl(0 84% 40%)" },
      ]);

      setLoading(false);
    };

    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (totalScans === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No scan history yet</p>
        <p className="text-sm">Upload and analyze documents to see trends</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScans}</div>
            <p className="text-xs text-muted-foreground">Documents analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Risk</CardTitle>
            {riskTrend === "up" ? (
              <TrendingUp className="h-4 w-4 text-destructive" />
            ) : riskTrend === "down" ? (
              <TrendingDown className="h-4 w-4 text-success" />
            ) : (
              <Activity className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRiskScore}</div>
            <p className="text-xs text-muted-foreground">
              {riskTrend === "up" ? "Trending higher" : riskTrend === "down" ? "Improving" : "Stable"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {riskDistribution.find((r) => r.level === "High")?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Documents flagged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clean</CardTitle>
            <Shield className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {riskDistribution.find((r) => r.level === "Low")?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Low risk documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Risk Timeline</TabsTrigger>
          <TabsTrigger value="distribution">Risk Distribution</TabsTrigger>
          <TabsTrigger value="types">Document Types</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Score Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      name="Avg Risk Score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Risk Level Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution.filter((r) => r.count > 0)}
                      dataKey="count"
                      nameKey="level"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ level, count }) => `${level}: ${count}`}
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types">
          <Card>
            <CardHeader>
              <CardTitle>Documents by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={docTypeStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis dataKey="type" type="category" width={100} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Scan Count" fill="hsl(var(--primary))" />
                    <Bar dataKey="avgRisk" name="Avg Risk" fill="hsl(var(--warning))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
