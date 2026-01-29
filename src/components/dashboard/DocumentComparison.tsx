import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, ArrowLeftRight, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScanResult {
  id: string;
  document_id: string;
  overall_risk_score: number;
  risk_level: string;
  document_type: string | null;
  created_at: string;
  document: {
    filename: string;
    file_path: string;
  } | null;
}

interface ComparisonData {
  scanResult: ScanResult;
  imageUrl: string;
  fields: { field_name: string; field_value: string | null; confidence: number | null }[];
  flags: { name: string; severity: string; description: string }[];
}

export const DocumentComparison = () => {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [leftScanId, setLeftScanId] = useState<string | null>(null);
  const [rightScanId, setRightScanId] = useState<string | null>(null);
  const [leftData, setLeftData] = useState<ComparisonData | null>(null);
  const [rightData, setRightData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchScans = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("scan_results")
        .select(`
          id,
          document_id,
          overall_risk_score,
          risk_level,
          document_type,
          created_at,
          document:documents(filename, file_path)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setScans(data as ScanResult[]);
      }
    };

    fetchScans();
  }, [user]);

  const loadComparisonData = async (scanId: string): Promise<ComparisonData | null> => {
    const scan = scans.find((s) => s.id === scanId);
    if (!scan || !scan.document) return null;

    const [fieldsRes, flagsRes, signedUrlRes] = await Promise.all([
      supabase.from("extracted_fields").select("*").eq("scan_result_id", scanId),
      supabase.from("fraud_flags").select("name, severity, description").eq("scan_result_id", scanId),
      supabase.storage.from("documents").createSignedUrl(scan.document.file_path, 3600),
    ]);

    return {
      scanResult: scan,
      imageUrl: signedUrlRes.data?.signedUrl || "",
      fields: fieldsRes.data || [],
      flags: flagsRes.data || [],
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (leftScanId) {
        const data = await loadComparisonData(leftScanId);
        setLeftData(data);
      } else {
        setLeftData(null);
      }
      if (rightScanId) {
        const data = await loadComparisonData(rightScanId);
        setRightData(data);
      } else {
        setRightData(null);
      }
      setLoading(false);
    };

    loadData();
  }, [leftScanId, rightScanId, scans]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-success/10 text-success border-success/30";
      case "medium":
        return "bg-warning/10 text-warning border-warning/30";
      case "high":
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getFieldDifferences = () => {
    if (!leftData || !rightData) return [];

    const differences: { field: string; left: string | null; right: string | null; match: boolean }[] = [];
    const allFields = new Set([
      ...leftData.fields.map((f) => f.field_name),
      ...rightData.fields.map((f) => f.field_name),
    ]);

    allFields.forEach((field) => {
      const leftValue = leftData.fields.find((f) => f.field_name === field)?.field_value || null;
      const rightValue = rightData.fields.find((f) => f.field_name === field)?.field_value || null;
      differences.push({
        field,
        left: leftValue,
        right: rightValue,
        match: leftValue === rightValue && leftValue !== null,
      });
    });

    return differences;
  };

  const ComparisonPanel = ({ data, side }: { data: ComparisonData | null; side: "left" | "right" }) => {
    if (!data) {
      return (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-8 min-h-[400px]">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a document to compare</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 p-3 border-b">
          <p className="font-medium truncate">{data.scanResult.document?.filename}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn("text-xs", getRiskColor(data.scanResult.risk_level))}>
              {data.scanResult.risk_level} risk
            </Badge>
            <span className="text-sm text-muted-foreground">Score: {data.scanResult.overall_risk_score}</span>
          </div>
        </div>

        {/* Image Preview */}
        <div className="aspect-[4/3] bg-muted/30 relative overflow-hidden">
          {data.imageUrl && (
            <img
              src={data.imageUrl}
              alt="Document preview"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Flags */}
        <div className="p-3 border-t">
          <p className="text-sm font-medium mb-2">Issues ({data.flags.length})</p>
          <div className="space-y-1 max-h-[150px] overflow-y-auto">
            {data.flags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No issues detected</p>
            ) : (
              data.flags.map((flag, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-xs p-2 rounded",
                    flag.severity === "critical" || flag.severity === "high"
                      ? "bg-destructive/10 text-destructive"
                      : flag.severity === "medium"
                      ? "bg-warning/10 text-warning"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {flag.name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Document Selectors */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Document A</label>
          <Select value={leftScanId || ""} onValueChange={setLeftScanId}>
            <SelectTrigger>
              <SelectValue placeholder="Select first document" />
            </SelectTrigger>
            <SelectContent>
              {scans
                .filter((s) => s.id !== rightScanId)
                .map((scan) => (
                  <SelectItem key={scan.id} value={scan.id}>
                    {scan.document?.filename || "Unknown"} - {scan.document_type}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <ArrowLeftRight className="h-5 w-5 text-muted-foreground mt-6" />

        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Document B</label>
          <Select value={rightScanId || ""} onValueChange={setRightScanId}>
            <SelectTrigger>
              <SelectValue placeholder="Select second document" />
            </SelectTrigger>
            <SelectContent>
              {scans
                .filter((s) => s.id !== leftScanId)
                .map((scan) => (
                  <SelectItem key={scan.id} value={scan.id}>
                    {scan.document?.filename || "Unknown"} - {scan.document_type}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && (
        <>
          {/* Side by Side Comparison */}
          <div className="flex gap-4">
            <ComparisonPanel data={leftData} side="left" />
            <ComparisonPanel data={rightData} side="right" />
          </div>

          {/* Field Comparison Table */}
          {leftData && rightData && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-3 border-b">
                <p className="font-medium">Field Comparison</p>
              </div>
              <div className="divide-y">
                {getFieldDifferences().map((diff, i) => (
                  <div key={i} className="flex items-center p-3">
                    <div className="w-32 text-sm font-medium capitalize">
                      {diff.field.replace(/_/g, " ")}
                    </div>
                    <div className="flex-1 text-sm">{diff.left || <span className="text-muted-foreground">—</span>}</div>
                    <div className="w-8 flex justify-center">
                      {diff.match ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : diff.left && diff.right ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <div className="flex-1 text-sm text-right">
                      {diff.right || <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
