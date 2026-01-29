import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnalysisResults } from "@/components/dashboard/AnalysisResults";

const Results = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Analysis Results</h1>
          <p className="mt-1 text-muted-foreground">
            Review the fraud risk assessment for this document
          </p>
        </div>

        <AnalysisResults scanResultId={id} />
      </div>
    </DashboardLayout>
  );
};

export default Results;
