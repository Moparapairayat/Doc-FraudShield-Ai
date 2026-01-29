import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DocumentUploader } from "@/components/dashboard/DocumentUploader";
import { AnalysisResults } from "@/components/dashboard/AnalysisResults";
import { ScanStatusPanel } from "@/components/dashboard/ScanStatusPanel";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { AlertCircle } from "lucide-react";

const Dashboard = () => {
  const [scanResultId, setScanResultId] = useState<string | null>(null);

  const handleAnalysisComplete = (resultId: string) => {
    setScanResultId(resultId);
  };

  const handleNewAnalysis = () => {
    setScanResultId(null);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Quick Stats */}
        {!scanResultId && <QuickStats />}

        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              {scanResultId ? "Analysis Results" : "Upload & Analyze Document"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {scanResultId
                ? "Review your document fraud risk assessment"
                : "Upload a PDF or image to analyze for fraud indicators"}
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Important Disclaimer</p>
              <p className="mt-1 text-muted-foreground">
                This tool provides an automated fraud risk assessment and does not confirm document
                authenticity. Always verify documents with the issuing authority.
              </p>
            </div>
          </div>

          {scanResultId ? (
            <AnalysisResults scanResultId={scanResultId} onBack={handleNewAnalysis} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <DocumentUploader onAnalysisComplete={handleAnalysisComplete} />
              </div>
              <div className="lg:col-span-1">
                <ScanStatusPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
