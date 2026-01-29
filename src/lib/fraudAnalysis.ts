import { AnalysisResult, FraudIndicator } from "@/components/AnalysisResults";

// Simulated AI analysis - in production, this would call a real AI service
export const analyzeDocument = async (file: File): Promise<AnalysisResult> => {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2500 + Math.random() * 1500));

  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  const fileSize = file.size;

  // Generate realistic-looking analysis based on file properties
  const indicators: FraudIndicator[] = [
    {
      id: "metadata",
      name: "Metadata Consistency",
      description: "Document metadata matches expected patterns for this file type",
      severity: "low",
      detected: Math.random() > 0.85,
      confidence: 75 + Math.floor(Math.random() * 20),
    },
    {
      id: "digital-signature",
      name: "Digital Signature Verification",
      description: "Checking for valid digital signatures or certificates",
      severity: "medium",
      detected: Math.random() > 0.8,
      confidence: 80 + Math.floor(Math.random() * 15),
    },
    {
      id: "font-analysis",
      name: "Font Consistency Analysis",
      description: "All fonts in the document are consistent and properly embedded",
      severity: "medium",
      detected: Math.random() > 0.9,
      confidence: 70 + Math.floor(Math.random() * 25),
    },
    {
      id: "image-manipulation",
      name: "Image Manipulation Detection",
      description: "Scanning for signs of photo editing or splicing",
      severity: "high",
      detected: Math.random() > 0.88,
      confidence: 85 + Math.floor(Math.random() * 10),
    },
    {
      id: "text-layers",
      name: "Hidden Text Layer Analysis",
      description: "Checking for hidden or overlaid text elements",
      severity: "critical",
      detected: Math.random() > 0.95,
      confidence: 90 + Math.floor(Math.random() * 8),
    },
    {
      id: "creation-date",
      name: "Creation Date Verification",
      description: "Document creation timestamp appears authentic",
      severity: "low",
      detected: Math.random() > 0.92,
      confidence: 88 + Math.floor(Math.random() * 10),
    },
    {
      id: "compression",
      name: "Compression Artifact Analysis",
      description: "File compression patterns are consistent throughout",
      severity: "medium",
      detected: Math.random() > 0.87,
      confidence: 72 + Math.floor(Math.random() * 20),
    },
    {
      id: "format-compliance",
      name: "Format Compliance Check",
      description: "Document structure follows expected format specifications",
      severity: "low",
      detected: false,
      confidence: 95,
    },
  ];

  const detectedCount = indicators.filter((i) => i.detected).length;
  const criticalDetected = indicators.some((i) => i.detected && i.severity === "critical");
  const highDetected = indicators.some((i) => i.detected && i.severity === "high");

  let overallScore: number;
  let riskLevel: "low" | "medium" | "high" | "critical";

  if (criticalDetected) {
    overallScore = 15 + Math.floor(Math.random() * 20);
    riskLevel = "critical";
  } else if (highDetected) {
    overallScore = 35 + Math.floor(Math.random() * 20);
    riskLevel = "high";
  } else if (detectedCount > 2) {
    overallScore = 55 + Math.floor(Math.random() * 15);
    riskLevel = "medium";
  } else if (detectedCount > 0) {
    overallScore = 70 + Math.floor(Math.random() * 15);
    riskLevel = "medium";
  } else {
    overallScore = 85 + Math.floor(Math.random() * 14);
    riskLevel = "low";
  }

  // Determine document type
  let documentType = "Unknown Document";
  if (fileType.includes("pdf")) {
    documentType = "PDF Document";
  } else if (fileType.includes("image")) {
    documentType = "Image File";
  } else if (fileType.includes("word") || fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
    documentType = "Word Document";
  }

  return {
    overallScore,
    riskLevel,
    indicators,
    analyzedAt: new Date(),
    documentType,
  };
};
