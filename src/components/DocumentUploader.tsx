import { useState, useCallback } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentUploaderProps {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
  selectedFile: File | null;
  onClear: () => void;
}

export const DocumentUploader = ({
  onFileSelect,
  isAnalyzing,
  selectedFile,
  onClear,
}: DocumentUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (selectedFile) {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-card p-6 shadow-lg">
        {isAnalyzing && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-primary/5" />
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
          </div>
        )}
        
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
            {isAnalyzing ? (
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            ) : (
              <FileText className="h-7 w-7 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {selectedFile.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          
          {!isAnalyzing && (
            <button
              onClick={onClear}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {isAnalyzing && (
          <div className="mt-4 flex items-center gap-2 text-sm text-primary">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
            <span>Analyzing document for fraud indicators...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 border-dashed p-8 transition-all duration-300",
        "bg-gradient-to-b from-card to-muted/30",
        isDragging
          ? "border-primary bg-primary/5 shadow-glow"
          : "border-border hover:border-primary/50 hover:bg-primary/5"
      )}
    >
      <input
        type="file"
        onChange={handleFileInput}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
            isDragging
              ? "bg-primary text-primary-foreground scale-110"
              : "bg-primary/10 text-primary"
          )}
        >
          <Upload className="h-8 w-8" />
        </div>
        
        <div>
          <p className="text-lg font-semibold text-foreground">
            Drop your document here
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse files
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-3 py-1">PDF</span>
          <span className="rounded-full bg-muted px-3 py-1">DOC</span>
          <span className="rounded-full bg-muted px-3 py-1">DOCX</span>
          <span className="rounded-full bg-muted px-3 py-1">Images</span>
        </div>
      </div>
    </div>
  );
};
