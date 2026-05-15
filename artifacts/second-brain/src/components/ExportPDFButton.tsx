import { useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import type { KnowledgeItem } from "@workspace/api-client-react";
import ReactMarkdown from "react-markdown";

interface ExportPDFButtonProps {
  item: KnowledgeItem;
}

export function ExportPDFButton({ item }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);

    try {
      // Temporarily show the hidden div for capturing
      const element = printRef.current;
      element.style.display = "block";
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, "PNG", 0, 0, finalWidth, finalHeight);
      pdf.save(`${item.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      
      element.style.display = "none";
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadPDF}
        disabled={isExporting}
        className="gap-2"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        Download PDF
      </Button>

      {/* Hidden container for PDF generation */}
      <div
        ref={printRef}
        style={{
          display: "none",
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          width: "800px", // Standard A4 width approx
          padding: "40px",
          backgroundColor: "white",
          color: "black",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ borderBottom: "2px solid #eee", paddingBottom: "20px", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 10px 0" }}>{item.title}</h1>
          <p style={{ fontSize: "14px", color: "#666", margin: "0" }}>
            Source: <span style={{ textTransform: "capitalize" }}>{item.sourceType}</span>
            {item.sourceUrl && ` | ${item.sourceUrl}`}
          </p>
        </div>

        {item.summary && (
          <div style={{ marginBottom: "30px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#333", marginBottom: "10px" }}>Summary</h2>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#444" }}>{item.summary}</p>
          </div>
        )}

        {item.structuredNotes && (
          <div style={{ marginBottom: "30px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#333", marginBottom: "10px" }}>Detailed Notes</h2>
            <div style={{ fontSize: "14px", lineHeight: "1.6", color: "#444" }}>
              <ReactMarkdown>{item.structuredNotes}</ReactMarkdown>
            </div>
          </div>
        )}

        <div style={{ marginTop: "50px", paddingTop: "20px", borderTop: "1px solid #eee" }}>
          <div style={{ marginBottom: "15px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: "bold", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>Tags & Concepts</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "5px" }}>
              {[...item.tags, ...item.keyConcepts].map((tag, i) => (
                <span key={i} style={{ fontSize: "11px", backgroundColor: "#f0f0f0", padding: "4px 10px", borderRadius: "4px" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <p style={{ fontSize: "10px", color: "#aaa" }}>
            Captured on {new Date(item.createdAt).toLocaleDateString()} via Knowledge Weaver
          </p>
        </div>
      </div>
    </>
  );
}
