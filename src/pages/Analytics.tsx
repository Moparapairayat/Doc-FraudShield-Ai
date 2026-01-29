import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BatchUploader } from "@/components/dashboard/BatchUploader";
import { DocumentComparison } from "@/components/dashboard/DocumentComparison";
import { HistoricalTrends } from "@/components/dashboard/HistoricalTrends";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, GitCompare, History } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Analytics = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("trends");

  const handleBatchComplete = (results: { scanResultId: string; filename: string }[]) => {
    if (results.length === 1) {
      navigate(`/results/${results[0].scanResultId}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Analytics & Tools</h1>
          <p className="mt-1 text-muted-foreground">
            Advanced fraud detection tools, batch processing, and historical analysis
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Historical Trends
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Batch Processing
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Compare Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <HistoricalTrends />
          </TabsContent>

          <TabsContent value="batch">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-2">Batch Document Analysis</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Upload multiple documents at once for parallel fraud analysis. Up to 10 documents per batch.
              </p>
              <BatchUploader onBatchComplete={handleBatchComplete} />
            </div>
          </TabsContent>

          <TabsContent value="compare">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-2">Document Comparison</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Compare two documents side-by-side to identify inconsistencies in extracted fields and fraud indicators.
              </p>
              <DocumentComparison />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
