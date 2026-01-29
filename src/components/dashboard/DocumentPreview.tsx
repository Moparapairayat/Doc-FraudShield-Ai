import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RegionCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FraudFlagWithRegion {
  id: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  region_coords: RegionCoords | null;
  page_number: number | null;
}

interface DocumentPreviewProps {
  imageUrl: string;
  fraudFlags: FraudFlagWithRegion[];
  selectedFlagId?: string | null;
  onFlagSelect?: (flagId: string | null) => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "border-destructive bg-destructive/20";
    case "high":
      return "border-destructive bg-destructive/15";
    case "medium":
      return "border-warning bg-warning/15";
    case "low":
      return "border-yellow-500 bg-yellow-500/10";
    default:
      return "border-muted-foreground bg-muted/20";
  }
};

const getSeverityStrokeColor = (severity: string) => {
  switch (severity) {
    case "critical":
    case "high":
      return "stroke-destructive";
    case "medium":
      return "stroke-warning";
    case "low":
      return "stroke-yellow-500";
    default:
      return "stroke-muted-foreground";
  }
};

export const DocumentPreview = ({
  imageUrl,
  fraudFlags,
  selectedFlagId,
  onFlagSelect,
}: DocumentPreviewProps) => {
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const flagsWithRegions = fraudFlags.filter((flag) => flag.region_coords !== null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
      setImageLoaded(true);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

  const handleBoxClick = (flagId: string) => {
    onFlagSelect?.(selectedFlagId === flagId ? null : flagId);
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "rounded-xl border bg-card overflow-hidden",
          isFullscreen && "fixed inset-4 z-50 rounded-2xl shadow-2xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Document Preview</span>
            {flagsWithRegions.length > 0 && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                {flagsWithRegions.length} suspicious {flagsWithRegions.length === 1 ? "region" : "regions"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="min-w-[3rem] text-center text-sm text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-2"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div
          ref={containerRef}
          className={cn(
            "relative overflow-auto bg-muted/20",
            isFullscreen ? "h-[calc(100%-3.5rem)]" : "h-[400px]"
          )}
        >
          <div
            className="relative inline-block min-w-full min-h-full"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            {/* Document Image */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Document preview"
              className="max-w-none"
              onLoad={handleImageLoad}
            />

            {/* Bounding Boxes Overlay */}
            {imageLoaded && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={imageDimensions.width}
                height={imageDimensions.height}
                style={{ width: imageDimensions.width, height: imageDimensions.height }}
              >
                {flagsWithRegions.map((flag) => {
                  const coords = flag.region_coords!;
                  const isSelected = selectedFlagId === flag.id;
                  
                  return (
                    <g key={flag.id} className="pointer-events-auto cursor-pointer">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <rect
                            x={coords.x}
                            y={coords.y}
                            width={coords.width}
                            height={coords.height}
                            className={cn(
                              "fill-current transition-all duration-200",
                              getSeverityColor(flag.severity),
                              isSelected ? "opacity-40" : "opacity-25 hover:opacity-40"
                            )}
                            style={{
                              stroke: "currentColor",
                              strokeWidth: isSelected ? 3 : 2,
                            }}
                            onClick={() => handleBoxClick(flag.id)}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs"
                          sideOffset={5}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className={cn(
                                "h-4 w-4",
                                flag.severity === "high" || flag.severity === "critical"
                                  ? "text-destructive"
                                  : flag.severity === "medium"
                                  ? "text-warning"
                                  : "text-yellow-500"
                              )} />
                              <span className="font-medium">{flag.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {flag.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <span className={cn(
                                "rounded px-1.5 py-0.5 font-medium uppercase",
                                getSeverityColor(flag.severity)
                              )}>
                                {flag.severity}
                              </span>
                              <span className="text-muted-foreground">
                                {flag.confidence}% confidence
                              </span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {/* Corner indicators for selected box */}
                      {isSelected && (
                        <>
                          <circle
                            cx={coords.x}
                            cy={coords.y}
                            r={4}
                            className={cn("fill-background", getSeverityStrokeColor(flag.severity))}
                            strokeWidth={2}
                          />
                          <circle
                            cx={coords.x + coords.width}
                            cy={coords.y}
                            r={4}
                            className={cn("fill-background", getSeverityStrokeColor(flag.severity))}
                            strokeWidth={2}
                          />
                          <circle
                            cx={coords.x}
                            cy={coords.y + coords.height}
                            r={4}
                            className={cn("fill-background", getSeverityStrokeColor(flag.severity))}
                            strokeWidth={2}
                          />
                          <circle
                            cx={coords.x + coords.width}
                            cy={coords.y + coords.height}
                            r={4}
                            className={cn("fill-background", getSeverityStrokeColor(flag.severity))}
                            strokeWidth={2}
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Legend */}
        {flagsWithRegions.length > 0 && (
          <div className="border-t bg-muted/20 px-4 py-2">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="text-muted-foreground">Severity:</span>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded border-2 border-destructive bg-destructive/20" />
                <span>High/Critical</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded border-2 border-warning bg-warning/20" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded border-2 border-yellow-500 bg-yellow-500/20" />
                <span>Low</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
