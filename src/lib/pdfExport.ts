import jsPDF from "jspdf";

interface FraudFlag {
  name: string;
  description: string;
  severity: string;
  confidence: number;
  evidence_reference: string | null;
}

interface ExtractedField {
  field_name: string;
  field_value: string | null;
  confidence: number | null;
}

interface ScanResult {
  id: string;
  overall_risk_score: number;
  risk_level: string;
  document_type: string | null;
  raw_ocr_text: string | null;
  created_at: string;
}

interface ExportData {
  scanResult: ScanResult;
  filename: string;
  fraudFlags: FraudFlag[];
  extractedFields: ExtractedField[];
  imageUrl?: string;
}

export const exportToPDF = async (data: ExportData): Promise<void> => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  const addNewPageIfNeeded = (neededSpace: number) => {
    if (yPos + neededSpace > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  // Helper for text wrapping
  const addWrappedText = (text: string, x: number, maxWidth: number, fontSize: number = 10) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      addNewPageIfNeeded(6);
      pdf.text(line, x, yPos);
      yPos += 5;
    });
  };

  // Header
  pdf.setFillColor(30, 41, 59);
  pdf.rect(0, 0, pageWidth, 40, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("Fraud Analysis Report", margin, 20);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 30);

  yPos = 55;
  pdf.setTextColor(0, 0, 0);

  // Document Info Box
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, yPos, contentWidth, 30, 3, 3, "FD");

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Document Information", margin + 5, yPos + 8);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Filename: ${data.filename}`, margin + 5, yPos + 16);
  pdf.text(`Document Type: ${data.scanResult.document_type || "Unknown"}`, margin + 5, yPos + 23);
  pdf.text(`Analyzed: ${new Date(data.scanResult.created_at).toLocaleString()}`, margin + contentWidth / 2, yPos + 16);

  yPos += 40;

  // Risk Score Section
  const riskColor = data.scanResult.risk_level === "low" 
    ? [34, 197, 94] 
    : data.scanResult.risk_level === "medium" 
    ? [234, 179, 8] 
    : [239, 68, 68];

  pdf.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
  pdf.roundedRect(margin, yPos, 50, 30, 3, 3, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text(String(data.scanResult.overall_risk_score), margin + 25, yPos + 15, { align: "center" });
  pdf.setFontSize(8);
  pdf.text("RISK SCORE", margin + 25, yPos + 24, { align: "center" });

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${data.scanResult.risk_level.toUpperCase()} RISK`, margin + 60, yPos + 12);

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const riskDescription = 
    data.scanResult.risk_level === "low" 
      ? "No significant fraud indicators detected. Document appears authentic."
      : data.scanResult.risk_level === "medium"
      ? "Some anomalies detected. Manual verification recommended."
      : "Multiple fraud indicators detected. Exercise extreme caution.";
  addWrappedText(riskDescription, margin + 60, contentWidth - 60);

  yPos += 40;

  // Fraud Flags Section
  if (data.fraudFlags.length > 0) {
    addNewPageIfNeeded(30);

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Detected Issues (${data.fraudFlags.length})`, margin, yPos);
    yPos += 10;

    data.fraudFlags.forEach((flag, index) => {
      addNewPageIfNeeded(35);

      const severityColor = 
        flag.severity === "critical" || flag.severity === "high"
          ? [254, 226, 226]
          : flag.severity === "medium"
          ? [254, 243, 199]
          : [241, 245, 249];

      pdf.setFillColor(severityColor[0], severityColor[1], severityColor[2]);
      pdf.roundedRect(margin, yPos, contentWidth, 28, 2, 2, "F");

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${index + 1}. ${flag.name}`, margin + 3, yPos + 7);

      // Severity badge
      const badgeColor = 
        flag.severity === "critical" || flag.severity === "high"
          ? [239, 68, 68]
          : flag.severity === "medium"
          ? [234, 179, 8]
          : [100, 116, 139];
      pdf.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      pdf.roundedRect(margin + contentWidth - 25, yPos + 2, 22, 6, 1, 1, "F");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(flag.severity.toUpperCase(), margin + contentWidth - 14, yPos + 6, { align: "center" });

      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      const descLines = pdf.splitTextToSize(flag.description, contentWidth - 10);
      pdf.text(descLines.slice(0, 2), margin + 3, yPos + 13);

      pdf.setTextColor(100, 100, 100);
      pdf.text(`Confidence: ${flag.confidence}%`, margin + 3, yPos + 24);
      if (flag.evidence_reference) {
        pdf.text(`Evidence: ${flag.evidence_reference.substring(0, 50)}...`, margin + 50, yPos + 24);
      }

      yPos += 32;
    });
  }

  // Extracted Fields Section
  if (data.extractedFields.length > 0) {
    addNewPageIfNeeded(30);

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Extracted Fields", margin, yPos);
    yPos += 8;

    // Table header
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, yPos, contentWidth, 8, "F");
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("Field", margin + 3, yPos + 5);
    pdf.text("Value", margin + 50, yPos + 5);
    pdf.text("Confidence", margin + contentWidth - 30, yPos + 5);
    yPos += 10;

    pdf.setFont("helvetica", "normal");
    data.extractedFields.forEach((field) => {
      addNewPageIfNeeded(8);

      pdf.setFontSize(9);
      pdf.text(field.field_name.replace(/_/g, " ").toUpperCase(), margin + 3, yPos + 4);
      pdf.text(field.field_value || "—", margin + 50, yPos + 4);
      pdf.text(`${field.confidence || 0}%`, margin + contentWidth - 25, yPos + 4);

      pdf.setDrawColor(230, 230, 230);
      pdf.line(margin, yPos + 6, margin + contentWidth, yPos + 6);

      yPos += 8;
    });
  }

  // Footer
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      "This report is generated for informational purposes only. It does not constitute official verification.",
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    pdf.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "right" }
    );
  }

  // Save
  const safeName = data.filename.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
  pdf.save(`fraud_report_${safeName}_${Date.now()}.pdf`);
};
