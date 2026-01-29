import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Loader2,
  FileText,
  MessageSquare,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { logDocumentVerify } from "@/lib/auditLog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QueueItem {
  id: string;
  document_id: string;
  overall_risk_score: number;
  risk_level: string;
  document_type: string | null;
  created_at: string;
  document: {
    id: string;
    filename: string;
    review_status: string;
    reviewer_notes: string | null;
  } | null;
}

const ReviewQueue = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    item: QueueItem | null;
    action: "verified" | "rejected" | null;
  }>({ open: false, item: null, action: null });
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchQueue = async () => {
      try {
        const { data, error } = await supabase
          .from("scan_results")
          .select(`
            id,
            document_id,
            overall_risk_score,
            risk_level,
            document_type,
            created_at,
            document:documents(id, filename, review_status, reviewer_notes)
          `)
          .gte("overall_risk_score", 60)
          .order("overall_risk_score", { ascending: false });

        if (error) throw error;

        // Transform and filter for pending reviews
        const transformedData = (data || [])
          .map((item: any) => ({
            ...item,
            document: item.document
              ? {
                  id: item.document.id,
                  filename: item.document.filename,
                  review_status: item.document.review_status,
                  reviewer_notes: item.document.reviewer_notes,
                }
              : null,
          }))
          .filter(
            (item: QueueItem) => item.document?.review_status === "pending"
          );

        setItems(transformedData);
      } catch (error) {
        console.error("Error fetching queue:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, [user]);

  const handleReview = async () => {
    if (!reviewDialog.item || !reviewDialog.action) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("documents")
        .update({
          review_status: reviewDialog.action,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
          reviewer_notes: reviewNotes || null,
        })
        .eq("id", reviewDialog.item.document_id);

      if (error) throw error;

      // Log the action
      await logDocumentVerify(
        reviewDialog.item.document_id,
        reviewDialog.action,
        reviewNotes
      );

      // Remove from list
      setItems((prev) => prev.filter((i) => i.id !== reviewDialog.item?.id));

      toast({
        title:
          reviewDialog.action === "verified"
            ? "Document Verified"
            : "Document Rejected",
        description: `The document has been marked as ${reviewDialog.action}.`,
      });

      setReviewDialog({ open: false, item: null, action: null });
      setReviewNotes("");
    } catch (error) {
      console.error("Error updating review:", error);
      toast({
        title: "Review Failed",
        description: "Failed to update the document status.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Review Queue</h1>
          <p className="mt-1 text-muted-foreground">
            High-risk documents requiring manual verification
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success/50" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              All Caught Up!
            </h3>
            <p className="mt-2 text-muted-foreground">
              No high-risk documents pending review.
            </p>
            <Link to="/dashboard">
              <Button className="mt-6">Go to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{items.length} documents pending review</span>
            </div>

            {items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border bg-card p-4 transition-all hover:shadow-md animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg",
                      "bg-destructive/10"
                    )}
                  >
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {item.document?.filename || "Unknown Document"}
                      </p>
                      <span className="shrink-0 rounded-full bg-destructive/10 border border-destructive/30 px-2 py-0.5 text-xs font-medium text-destructive uppercase">
                        {item.risk_level}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-semibold">
                        Risk Score: {item.overall_risk_score}
                      </span>
                      {item.document_type && (
                        <>
                          <span>•</span>
                          <span>{item.document_type}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link to={`/results/${item.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <FileText className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-success border-success/30 hover:bg-success/10"
                      onClick={() =>
                        setReviewDialog({
                          open: true,
                          item,
                          action: "verified",
                        })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Verify
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() =>
                        setReviewDialog({
                          open: true,
                          item,
                          action: "rejected",
                        })
                      }
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog
          open={reviewDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setReviewDialog({ open: false, item: null, action: null });
              setReviewNotes("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewDialog.action === "verified"
                  ? "Verify Document"
                  : "Reject Document"}
              </DialogTitle>
              <DialogDescription>
                {reviewDialog.action === "verified"
                  ? "Confirm that this document has been manually verified as legitimate."
                  : "Confirm that this document is fraudulent or should be rejected."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium text-foreground">
                  {reviewDialog.item?.document?.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  Risk Score: {reviewDialog.item?.overall_risk_score}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Review Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add any notes about your review decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReviewDialog({ open: false, item: null, action: null });
                  setReviewNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReview}
                disabled={submitting}
                className={cn(
                  reviewDialog.action === "verified"
                    ? "bg-success hover:bg-success/90"
                    : "bg-destructive hover:bg-destructive/90"
                )}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : reviewDialog.action === "verified" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {reviewDialog.action === "verified" ? "Verify" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ReviewQueue;
