import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dropzone } from "./Dropzone";
import { SelectedFileCard } from "./SelectedFileCard";
import { ErrorBanner } from "./ErrorBanner";

interface DocumentUploaderProps {
  onAnalysisComplete: (scanResultId: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

export const DocumentUploader = ({ onAnalysisComplete }: DocumentUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a PDF, JPG, or PNG file.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 10MB.";
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    },
    [validateFile]
  );

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const handleUploadAndAnalyze = useCallback(async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error("Failed to upload document: " + uploadError.message);
      }

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          filename: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          status: "pending",
        })
        .select()
        .single();

      if (docError || !docData) {
        throw new Error("Failed to create document record");
      }

      setIsUploading(false);
      setIsAnalyzing(true);

      // Get signed URL for analysis
      const { data: signedUrlData } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 3600);

      // Call analysis function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-document",
        {
          body: {
            documentId: docData.id,
            fileUrl: signedUrlData?.signedUrl,
            fileType: selectedFile.type,
            filename: selectedFile.name,
          },
        }
      );

      if (analysisError) {
        throw new Error(analysisError.message || "Analysis failed");
      }

      toast({
        title: "Analysis Complete",
        description: "Your document has been analyzed successfully.",
      });

      onAnalysisComplete(analysisData.scanResultId);
    } catch (err) {
      console.error("Upload/Analysis error:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  }, [selectedFile, user, toast, onAnalysisComplete]);

  const isProcessing = isUploading || isAnalyzing;

  return (
    <div className="space-y-4">
      {selectedFile ? (
        <SelectedFileCard
          file={selectedFile}
          isUploading={isUploading}
          isAnalyzing={isAnalyzing}
          onClear={handleClear}
          onAnalyze={handleUploadAndAnalyze}
        />
      ) : (
        <Dropzone
          onFileSelect={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={isProcessing}
        />
      )}

      {error && <ErrorBanner message={error} />}
    </div>
  );
};
