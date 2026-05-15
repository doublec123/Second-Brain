import { useGetGraphData } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import ForceGraph2D from "react-force-graph-2d";
import { useLocation } from "wouter";
import { Loader2, Share2, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function KnowledgeGraph() {
  const [, setLocation] = useLocation();
  const { data: graphData, isLoading } = useGetGraphData();
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth - 240, // subtract sidebar width
        height: window.innerHeight - 0,
      });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const handleNodeClick = (node: any) => {
    setLocation(`/item/${node.id}`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Building your knowledge graph...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="relative w-full h-full bg-background overflow-hidden">
        {/* Controls Overlay */}
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
          <div className="bg-card/80 backdrop-blur-md border border-card-border p-4 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="w-4 h-4 text-primary" />
              <h1 className="text-sm font-bold tracking-tight">Knowledge Network</h1>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Controls</p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.2, 400)}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 0.8, 400)}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => fgRef.current?.zoomToFit(600)}>
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Legend</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-medium text-foreground">Knowledge Item</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-[1px] bg-primary/40" />
                  <span className="text-[10px] font-medium text-muted-foreground italic">Shared Concepts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {graphData && (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#0a0a0a"
            nodeLabel="title"
            nodeColor={() => "#6366f1"}
            nodeRelSize={6}
            linkColor={() => "rgba(99, 102, 241, 0.2)"}
            linkWidth={1.5}
            onNodeClick={handleNodeClick}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.title;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Inter`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

              // Node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
              ctx.fillStyle = "#6366f1";
              ctx.fill();

              // Label background
              if (globalScale > 2) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
                ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2 - 8, bckgDimensions[0], bckgDimensions[1]);

                // Label text
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#fff";
                ctx.fillText(label, node.x, node.y - 8);
              }
            }}
          />
        )}
      </div>
    </Layout>
  );
}
