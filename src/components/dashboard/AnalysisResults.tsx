import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileWarning,
  Fingerprint,
  Eye,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  ArrowLeft,
  Image,
  Download,
  Loader2,
  MousePointerClick,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentPreview } from "./DocumentPreview";
import { exportToPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { logReportExport } from "@/lib/auditLog";
import type { Json } from "@/integrations/supabase/types";

interface RegionCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FraudFlag {
  id: string;
  flag_type: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  evidence_reference: string | null;
  page_number: number | null;
  region_coords: RegionCoords | null;
}

interface ExtractedField {
  id: string;
  field_name: string;
  field_value: string | null;
  confidence: number | null;
}

interface ScanResult {
  id: string;
  document_id: string;
  overall_risk_score: number;
  risk_level: "low" | "medium" | "high";
  raw_ocr_text: string | null;
  document_type: string | null;
  created_at: string;
}

interface AnalysisResultsProps {
  scanResultId: string;
  onBack?: () => void;
}

const getRiskColor = (level: string) => {
  switch (level) {
    case "low":
      return "text-success";
    case "medium":
      return "text-warning";
    case "high":
    case "critical":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
};

const getRiskBgColor = (level: string) => {
  switch (level) {
    case "low":
      return "bg-success/10 border-success/30";
    case "medium":
      return "bg-warning/10 border-warning/30";
    case "high":
    case "critical":
      return "bg-destructive/10 border-destructive/30";
    default:
      return "bg-muted";
  }
};

const getScoreColor = (score: number) => {
  if (score < 30) return "text-success";
  if (score < 60) return "text-warning";
  return "text-destructive";
};

const parseRegionCoords = (coords: Json | null): RegionCoords | null => {
  if (!coords || typeof coords !== "object" || Array.isArray(coords)) return null;
  const c = coords as Record<string, unknown>;
  if (
    typeof c.x === "number" &&
    typeof c.y === "number" &&
    typeof c.width === "number" &&
    typeof c.height === "number"
  ) {
    return { x: c.x, y: c.y, width: c.width, height: c.height };
  }
  return null;
};

export const AnalysisResults = ({ scanResultId, onBack }: AnalysisResultsProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [showOcrText, setShowOcrText] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [document, setDocument] = useState<{ filename: string; file_path: string } | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  const handleFlagClick = (flagId: string) => {
    setSelectedFlagId(selectedFlagId === flagId ? null : flagId);
    setShowPreview(true);
    
    // Scroll to preview
    if (previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleExportPDF = async () => {
    if (!scanResult || !document) return;
    
    setExporting(true);
    try {
      await exportToPDF({
        scanResult,
        filename: document.filename,
        fraudFlags: fraudFlags.map((f) => ({
          name: f.name,
          description: f.description,
          severity: f.severity,
          confidence: f.confidence,
          evidence_reference: f.evidence_reference,
        })),
        extractedFields: extractedFields.map((f) => ({
          field_name: f.field_name,
          field_value: f.field_value,
          confidence: f.confidence,
        })),
        imageUrl: documentUrl || undefined,
      });
      
      // Log the export action
      await logReportExport(scanResultId, "pdf");
      
      toast({
        title: "Report Exported",
        description: "Your PDF report has been downloaded.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Fetch scan result
        const { data: scanData, error: scanError } = await supabase
          .from("scan_results")
          .select("*")
          .eq("id", scanResultId)
          .maybeSingle();

        if (scanError) throw scanError;
        if (!scanData) {
          navigate("/dashboard");
          return;
        }

        setScanResult(scanData as ScanResult);

        // Fetch document info
        const { data: docData } = await supabase
          .from("documents")
          .select("filename, file_path")
          .eq("id", scanData.document_id)
          .maybeSingle();

        setDocument(docData);

        // Get signed URL for document preview
        if (docData?.file_path) {
          const { data: urlData } = await supabase.storage
            .from("documents")
            .createSignedUrl(docData.file_path, 3600); // 1 hour expiry
          
          if (urlData?.signedUrl) {
            setDocumentUrl(urlData.signedUrl);
          }
        }

        // Fetch fraud flags with region_coords
        const { data: flagsData } = await supabase
          .from("fraud_flags")
          .select("*")
          .eq("scan_result_id", scanResultId)
          .order("severity", { ascending: false });

        // Parse region_coords from JSON
        const parsedFlags = (flagsData || []).map((flag) => ({
          ...flag,
          region_coords: parseRegionCoords(flag.region_coords),
        })) as FraudFlag[];

        setFraudFlags(parsedFlags);

        // Fetch extracted fields
        const { data: fieldsData } = await supabase
          .from("extracted_fields")
          .select("*")
          .eq("scan_result_id", scanResultId);

        setExtractedFields((fieldsData as ExtractedField[]) || []);
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [scanResultId, navigate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-60 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!scanResult) {
    return null;
  }

  const detectedIssues = fraudFlags.filter((f) => f.confidence >= 50);
  const lowConfidenceFlags = fraudFlags.filter((f) => f.confidence < 50);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            New Analysis
          </Button>
        ) : (
          <div />
        )}
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={exporting}
          className="gap-2"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export PDF Report
        </Button>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
        <p className="font-medium text-warning">Important Disclaimer</p>
        <p className="mt-1 text-muted-foreground">
          This tool provides an automated fraud risk assessment and does not confirm document
          authenticity. Always verify documents with the issuing authority.
        </p>
      </div>

      {/* Overall Score Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Score Circle */}
          <div className="relative flex items-center justify-center">
            <svg className="h-32 w-32 -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(scanResult.overall_risk_score / 100) * 352} 352`}
                strokeLinecap="round"
                className={cn("transition-all duration-1000", getScoreColor(scanResult.overall_risk_score))}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={cn("text-3xl font-bold", getScoreColor(scanResult.overall_risk_score))}>
                {scanResult.overall_risk_score}
              </span>
              <span className="text-xs text-muted-foreground">Risk Score</span>
            </div>
          </div>

          {/* Score Info */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                {scanResult.risk_level === "low" ? (
                  <Shield className="h-6 w-6 text-success" />
                ) : scanResult.risk_level === "medium" ? (
                  <AlertTriangle className="h-6 w-6 text-warning" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive" />
                )}
                <h3 className="text-xl font-semibold text-foreground">
                  {scanResult.risk_level === "low"
                    ? "Low Fraud Risk"
                    : scanResult.risk_level === "medium"
                    ? "Medium Fraud Risk"
                    : "High Fraud Risk"}
                </h3>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border uppercase",
                    getRiskBgColor(scanResult.risk_level),
                    getRiskColor(scanResult.risk_level)
                  )}
                >
                  {scanResult.risk_level}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                {scanResult.risk_level === "low"
                  ? "Our analysis found minimal indicators of potential fraud or manipulation."
                  : scanResult.risk_level === "medium"
                  ? "We detected some anomalies that may require further verification."
                  : "Multiple fraud indicators were detected. Exercise caution and verify with the issuing authority."}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {document && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{document.filename}</span>
                </div>
              )}
              {scanResult.document_type && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileWarning className="h-4 w-4" />
                  <span>{scanResult.document_type}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Analyzed {new Date(scanResult.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview with Bounding Boxes */}
      {documentUrl && (
        <div ref={previewRef} className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              Document Preview
              {selectedFlagId && (
                <span className="text-xs text-muted-foreground font-normal">
                  (Click an issue below to highlight it)
                </span>
              )}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-1"
            >
              {showPreview ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show
                </>
              )}
            </Button>
          </div>
          {showPreview && (
            <DocumentPreview
              imageUrl={documentUrl}
              fraudFlags={fraudFlags}
              selectedFlagId={selectedFlagId}
              onFlagSelect={setSelectedFlagId}
            />
          )}
        </div>
      )}

      {/* Extracted Fields */}
      {extractedFields.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Extracted Information
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {extractedFields.map((field) => (
              <div key={field.id} className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {field.field_name.replace(/_/g, " ")}
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {field.field_value || "Not found"}
                </p>
                {field.confidence && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {field.confidence}% confidence
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicators Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Detected Issues */}
        {detectedIssues.length > 0 && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
            <h4 className="flex items-center gap-2 font-semibold text-destructive mb-4">
              <AlertTriangle className="h-5 w-5" />
              Detected Issues ({detectedIssues.length})
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {detectedIssues.map((flag, index) => {
                const hasRegion = flag.region_coords !== null;
                const isSelected = selectedFlagId === flag.id;
                
                return (
                  <button
                    key={flag.id}
                    onClick={() => hasRegion && handleFlagClick(flag.id)}
                    disabled={!hasRegion}
                    className={cn(
                      "w-full text-left rounded-lg bg-card border p-4 animate-slide-in transition-all",
                      hasRegion && "cursor-pointer hover:border-primary/50 hover:shadow-sm",
                      isSelected && "ring-2 ring-primary border-primary"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{flag.name}</p>
                          {hasRegion && (
                            <MousePointerClick className="h-3 w-3 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>
                        {flag.evidence_reference && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            Evidence: {flag.evidence_reference}
                            {flag.page_number && ` (Page ${flag.page_number})`}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border",
                          getRiskBgColor(flag.severity),
                          getRiskColor(flag.severity)
                        )}
                      >
                        {flag.severity}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-destructive transition-all duration-500"
                          style={{ width: `${flag.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{flag.confidence}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Passed Checks / Low Confidence */}
        <div className="rounded-xl border border-success/20 bg-success/5 p-5">
          <h4 className="flex items-center gap-2 font-semibold text-success mb-4">
            <CheckCircle className="h-5 w-5" />
            {detectedIssues.length === 0 ? "All Checks Passed" : "Other Observations"}
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {detectedIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No significant fraud indicators were detected in this document.
              </p>
            ) : lowConfidenceFlags.length > 0 ? (
              lowConfidenceFlags.map((flag, index) => (
                <div
                  key={flag.id}
                  className="flex items-center gap-3 rounded-lg bg-card border p-3 animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{flag.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({flag.confidence}% confidence)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Additional analysis areas showed no concerning patterns.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Methods */}
      <div className="rounded-xl border bg-card p-5">
        <h4 className="font-semibold text-foreground mb-4">Analysis Methods Used</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Fingerprint className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Digital Forensics</p>
              <p className="text-xs text-muted-foreground">Metadata & structure</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Eye className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Visual Analysis</p>
              <p className="text-xs text-muted-foreground">Image forensics</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <FileWarning className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Consistency Check</p>
              <p className="text-xs text-muted-foreground">Cross-validation</p>
            </div>
          </div>
        </div>
      </div>

      {/* OCR Text (Collapsible) */}
      {scanResult.raw_ocr_text && (
        <div className="rounded-xl border bg-card p-5">
          <button
            onClick={() => setShowOcrText(!showOcrText)}
            className="flex w-full items-center justify-between font-semibold text-foreground"
          >
            <span>Extracted Text (OCR)</span>
            {showOcrText ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          {showOcrText && (
            <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs text-muted-foreground whitespace-pre-wrap">
              {scanResult.raw_ocr_text}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
