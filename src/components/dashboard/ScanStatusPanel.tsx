import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, CheckCircle2, XCircle, Loader2, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DocumentStatus {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  updated_at: string;
  file_type: string;
}

const statusConfig: Record<string, {
  icon: typeof Clock;
  label: string;
  color: string;
  bgColor: string;
  animate?: boolean;
}> = {
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    animate: true,
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
};

export const ScanStatusPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const handleRetry = async (doc: DocumentStatus) => {
    setRetrying(doc.id);
    try {
      // Reset status to pending
      await supabase
        .from("documents")
        .update({ status: "pending" })
        .eq("id", doc.id);

      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Call the analyze function
      const response = await supabase.functions.invoke("analyze-document", {
        body: {
          documentId: doc.id,
          fileType: doc.file_type,
          filename: doc.filename,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Analysis Restarted",
        description: "The document is being re-analyzed.",
      });
    } catch (error) {
      console.error("Retry error:", error);
      toast({
        title: "Retry Failed",
        description: "Failed to restart analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRetrying(null);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Initial fetch of recent documents
    const fetchDocuments = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, filename, status, created_at, updated_at, file_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data) {
        setDocuments(data);
      }
      setIsLoading(false);
    };

    fetchDocuments();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("document-status-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "documents",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setDocuments((prev) => [payload.new as DocumentStatus, ...prev].slice(0, 5));
          } else if (payload.eventType === "UPDATE") {
            setDocuments((prev) =>
              prev.map((doc) =>
                doc.id === payload.new.id ? (payload.new as DocumentStatus) : doc
              )
            );
          } else if (payload.eventType === "DELETE") {
            setDocuments((prev) => prev.filter((doc) => doc.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading scan status...</span>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>No recent scans</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="border-b bg-muted/30 px-4 py-3">
        <h3 className="font-semibold text-sm">Recent Scans</h3>
      </div>
      <div className="divide-y">
        {documents.map((doc) => {
          const config = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.pending;
          const Icon = config.icon;
          const isRetrying = retrying === doc.id;

          return (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", config.bgColor)}>
                <Icon className={cn("h-4 w-4", config.color, config.animate && "animate-spin")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                </p>
              </div>
              {doc.status === "failed" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRetry(doc)}
                  disabled={isRetrying}
                  className="gap-1 text-xs"
                >
                  {isRetrying ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Retry
                </Button>
              ) : (
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    config.bgColor,
                    config.color
                  )}
                >
                  {config.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
