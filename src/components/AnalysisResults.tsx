import { Shield, AlertTriangle, CheckCircle, XCircle, FileWarning, Fingerprint, Eye, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FraudIndicator {
  id: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  detected: boolean;
  confidence: number;
}

export interface AnalysisResult {
  overallScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  indicators: FraudIndicator[];
  analyzedAt: Date;
  documentType: string;
}

interface AnalysisResultsProps {
  results: AnalysisResult;
}

const getRiskColor = (level: string) => {
  switch (level) {
    case "low":
      return "text-success";
    case "medium":
      return "text-warning";
    case "high":
      return "text-destructive";
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
      return "bg-destructive/10 border-destructive/30";
    case "critical":
      return "bg-destructive/20 border-destructive/50";
    default:
      return "bg-muted";
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
};

const getScoreGradient = (score: number) => {
  if (score >= 80) return "from-success to-accent";
  if (score >= 60) return "from-warning to-orange-500";
  return "from-destructive to-red-600";
};

export const AnalysisResults = ({ results }: AnalysisResultsProps) => {
  const detectedThreats = results.indicators.filter((i) => i.detected);
  const passedChecks = results.indicators.filter((i) => !i.detected);

  return (
    <div className="space-y-6 animate-fade-in">
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
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(results.overallScore / 100) * 352} 352`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" className={cn("stop-current", getScoreColor(results.overallScore))} />
                  <stop offset="100%" className="stop-current text-accent" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={cn("text-3xl font-bold", getScoreColor(results.overallScore))}>
                {results.overallScore}
              </span>
              <span className="text-xs text-muted-foreground">Trust Score</span>
            </div>
          </div>

          {/* Score Info */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                {results.riskLevel === "low" ? (
                  <Shield className="h-6 w-6 text-success" />
                ) : results.riskLevel === "medium" ? (
                  <AlertTriangle className="h-6 w-6 text-warning" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive" />
                )}
                <h3 className="text-xl font-semibold text-foreground">
                  {results.riskLevel === "low"
                    ? "Document Appears Authentic"
                    : results.riskLevel === "medium"
                    ? "Some Concerns Detected"
                    : "High Fraud Risk Detected"}
                </h3>
              </div>
              <p className="mt-1 text-muted-foreground">
                {results.riskLevel === "low"
                  ? "Our analysis found no significant indicators of fraud or manipulation."
                  : results.riskLevel === "medium"
                  ? "We detected some anomalies that may require further verification."
                  : "Multiple fraud indicators were detected. Exercise extreme caution."}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileWarning className="h-4 w-4" />
                <span>{results.documentType}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Analyzed {results.analyzedAt.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Detected Issues */}
        {detectedThreats.length > 0 && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
            <h4 className="flex items-center gap-2 font-semibold text-destructive mb-4">
              <AlertTriangle className="h-5 w-5" />
              Detected Issues ({detectedThreats.length})
            </h4>
            <div className="space-y-3">
              {detectedThreats.map((indicator, index) => (
                <div
                  key={indicator.id}
                  className="rounded-lg bg-card border p-4 animate-slide-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{indicator.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {indicator.description}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border",
                        getRiskBgColor(indicator.severity),
                        getRiskColor(indicator.severity)
                      )}
                    >
                      {indicator.severity}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-destructive transition-all duration-500"
                        style={{ width: `${indicator.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {indicator.confidence}% confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passed Checks */}
        <div className="rounded-xl border border-success/20 bg-success/5 p-5">
          <h4 className="flex items-center gap-2 font-semibold text-success mb-4">
            <CheckCircle className="h-5 w-5" />
            Passed Checks ({passedChecks.length})
          </h4>
          <div className="space-y-2">
            {passedChecks.map((indicator, index) => (
              <div
                key={indicator.id}
                className="flex items-center gap-3 rounded-lg bg-card border p-3 animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CheckCircle className="h-4 w-4 text-success shrink-0" />
                <span className="text-sm text-foreground">{indicator.name}</span>
              </div>
            ))}
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
              <p className="text-sm font-medium text-foreground">Digital Fingerprint</p>
              <p className="text-xs text-muted-foreground">Metadata analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Eye className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Visual Inspection</p>
              <p className="text-xs text-muted-foreground">Image forensics</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <FileWarning className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Pattern Detection</p>
              <p className="text-xs text-muted-foreground">AI-powered analysis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
