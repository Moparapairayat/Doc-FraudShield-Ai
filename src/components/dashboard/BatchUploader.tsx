import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface BatchFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "analyzing" | "completed" | "failed";
  progress: number;
  scanResultId?: string;
  error?: string;
}

interface BatchUploaderProps {
  onBatchComplete: (results: { scanResultId: string; filename: string }[]) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_BATCH_SIZE = 10;

export const BatchUploader = ({ onBatchComplete }: BatchUploaderProps) => {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload PDF, JPG, or PNG files.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 10MB.";
    }
    return null;
  }, []);

  const handleFilesSelect = useCallback(
    (selectedFiles: FileList | File[]) => {
      const newFiles: BatchFile[] = [];
      const fileArray = Array.from(selectedFiles);

      if (files.length + fileArray.length > MAX_BATCH_SIZE) {
        toast({
          title: "Too many files",
          description: `Maximum ${MAX_BATCH_SIZE} files allowed per batch.`,
          variant: "destructive",
        });
        return;
      }

      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          toast({ title: "Invalid file", description: `${file.name}: ${error}`, variant: "destructive" });
          continue;
        }
        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          file,
          status: "pending",
          progress: 0,
        });
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, validateFile, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFilesSelect(e.dataTransfer.files);
      }
    },
    [handleFilesSelect]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const processFile = async (batchFile: BatchFile): Promise<{ scanResultId: string; filename: string } | null> => {
    if (!user) return null;

    try {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) => (f.id === batchFile.id ? { ...f, status: "uploading" as const, progress: 20 } : f))
      );

      const fileExt = batchFile.file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, batchFile.file);

      if (uploadError) throw new Error("Upload failed: " + uploadError.message);

      setFiles((prev) => prev.map((f) => (f.id === batchFile.id ? { ...f, progress: 40 } : f)));

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          filename: batchFile.file.name,
          file_path: filePath,
          file_type: batchFile.file.type,
          file_size: batchFile.file.size,
          status: "pending",
        })
        .select()
        .single();

      if (docError || !docData) throw new Error("Failed to create document record");

      setFiles((prev) =>
        prev.map((f) => (f.id === batchFile.id ? { ...f, status: "analyzing" as const, progress: 60 } : f))
      );

      // Get signed URL and analyze
      const { data: signedUrlData } = await supabase.storage.from("documents").createSignedUrl(filePath, 3600);

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-document", {
        body: {
          documentId: docData.id,
          fileUrl: signedUrlData?.signedUrl,
          fileType: batchFile.file.type,
          filename: batchFile.file.name,
        },
      });

      if (analysisError) throw new Error(analysisError.message || "Analysis failed");

      setFiles((prev) =>
        prev.map((f) =>
          f.id === batchFile.id
            ? { ...f, status: "completed" as const, progress: 100, scanResultId: analysisData.scanResultId }
            : f
        )
      );

      return { scanResultId: analysisData.scanResultId, filename: batchFile.file.name };
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === batchFile.id
            ? { ...f, status: "failed" as const, error: error instanceof Error ? error.message : "Unknown error" }
            : f
        )
      );
      return null;
    }
  };

  const startBatchProcessing = async () => {
    if (files.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const pendingFiles = files.filter((f) => f.status === "pending");
    const results: { scanResultId: string; filename: string }[] = [];

    // Process files in parallel (max 3 at a time)
    const batchSize = 3;
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processFile));
      results.push(...batchResults.filter((r): r is { scanResultId: string; filename: string } => r !== null));
    }

    setIsProcessing(false);

    if (results.length > 0) {
      toast({
        title: "Batch Analysis Complete",
        description: `Successfully analyzed ${results.length} of ${pendingFiles.length} documents.`,
      });
      onBatchComplete(results);
    }
  };

  const completedCount = files.filter((f) => f.status === "completed").length;
  const failedCount = files.filter((f) => f.status === "failed").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;

  const getStatusIcon = (status: BatchFile["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "uploading":
      case "analyzing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        className={cn(
          "relative flex min-h-[150px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          isProcessing && "pointer-events-none opacity-50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && document.getElementById("batch-file-input")?.click()}
      >
        <input
          id="batch-file-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
          disabled={isProcessing}
        />
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, JPG, PNG up to 10MB each (max {MAX_BATCH_SIZE} files)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2 text-xs">
              {completedCount > 0 && <span className="text-success">{completedCount} completed</span>}
              {failedCount > 0 && <span className="text-destructive">{failedCount} failed</span>}
              {pendingCount > 0 && <span className="text-muted-foreground">{pendingCount} pending</span>}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                {getStatusIcon(file.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  {file.status === "uploading" || file.status === "analyzing" ? (
                    <Progress value={file.progress} className="h-1 mt-1" />
                  ) : file.error ? (
                    <p className="text-xs text-destructive truncate">{file.error}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {(file.file.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
                {file.status === "pending" && !isProcessing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={startBatchProcessing}
              disabled={pendingCount === 0 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Analyze {pendingCount} Document{pendingCount > 1 ? "s" : ""}
                </>
              )}
            </Button>
            {!isProcessing && files.length > 0 && (
              <Button variant="outline" onClick={() => setFiles([])}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
