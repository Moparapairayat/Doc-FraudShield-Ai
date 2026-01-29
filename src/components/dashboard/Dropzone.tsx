import { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  accept: string;
  disabled?: boolean;
}

export const Dropzone = ({ onFileSelect, accept, disabled }: DropzoneProps) => {
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

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 border-dashed p-8 transition-all duration-300",
        "bg-gradient-to-b from-card to-muted/30",
        disabled && "pointer-events-none opacity-50",
        isDragging
          ? "border-primary bg-primary/5 shadow-glow"
          : "border-border hover:border-primary/50 hover:bg-primary/5"
      )}
    >
      <input
        type="file"
        onChange={handleFileInput}
        accept={accept}
        disabled={disabled}
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
          <p className="text-lg font-semibold text-foreground">Drop your document here</p>
          <p className="mt-1 text-sm text-muted-foreground">or click to browse files</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-3 py-1">PDF</span>
          <span className="rounded-full bg-muted px-3 py-1">JPG</span>
          <span className="rounded-full bg-muted px-3 py-1">PNG</span>
          <span className="rounded-full bg-muted px-3 py-1">Max 10MB</span>
        </div>
      </div>
    </div>
  );
};
