import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ScanHistory } from "@/components/dashboard/ScanHistory";

const History = () => {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Scan History</h1>
          <p className="mt-1 text-muted-foreground">
            View all your previous document scans and their results
          </p>
        </div>

        <ScanHistory />
      </div>
    </DashboardLayout>
  );
};

export default History;
