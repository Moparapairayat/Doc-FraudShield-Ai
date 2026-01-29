import { FileText, X, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectedFileCardProps {
  file: File;
  isUploading: boolean;
  isAnalyzing: boolean;
  onClear: () => void;
  onAnalyze: () => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const SelectedFileCard = ({
  file,
  isUploading,
  isAnalyzing,
  onClear,
  onAnalyze,
}: SelectedFileCardProps) => {
  const isProcessing = isUploading || isAnalyzing;

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-card p-6 shadow-lg">
      {isProcessing && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-primary/5" />
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
        </div>
      )}

      <div className="relative flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
          {isProcessing ? (
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          ) : (
            <FileText className="h-7 w-7 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{file.name}</p>
          <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
        </div>

        {!isProcessing && (
          <button
            onClick={onClear}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isProcessing && (
        <div className="mt-4 flex items-center gap-2 text-sm text-primary">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
          <span>
            {isUploading ? "Uploading document..." : "Analyzing document for fraud indicators..."}
          </span>
        </div>
      )}

      {!isProcessing && (
        <div className="mt-4">
          <Button onClick={onAnalyze} className="w-full gap-2">
            <Upload className="h-4 w-4" />
            Analyze Document
          </Button>
        </div>
      )}
    </div>
  );
};
