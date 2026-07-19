import { jsPDF } from "jspdf";

export async function generatePdf(bookName: string, text: string): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const cleanTitle = bookName.replace(/\.[^/.]+$/, "");
  
  // Set document attributes
  doc.setProperties({
    title: cleanTitle,
    creator: "Linguist",
    author: "Linguist",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxLineWidth = pageWidth - margin * 2; // ~170mm for A4

  // Set Times New Roman as primary serif font for elegant e-book look
  doc.setFont("times", "normal");

  // --- COVER PAGE ---
  doc.setFontSize(24);
  doc.setFont("times", "bold");
  const titleLines = doc.splitTextToSize(cleanTitle, maxLineWidth);
  let currentY = 70;
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, currentY, { align: "center" });
    currentY += 10;
  });

  // Subtitle/Meta
  doc.setFontSize(12);
  doc.setFont("times", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Translated Edition", pageWidth / 2, currentY + 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.setTextColor(140, 140, 140);
  doc.text("Created with Linguist", pageWidth / 2, pageHeight - 30, { align: "center" });

  // --- CONTENT PAGES ---
  doc.addPage();
  doc.setTextColor(26, 26, 26);
  
  currentY = margin;
  let pageNumber = 1;

  // Split content by paragraphs
  const paragraphs = text.split("\n\n");
  
  paragraphs.forEach((p) => {
    const trimmed = p.trim();
    if (!trimmed) return;

    // Detect if the paragraph is a Chapter Heading
    const isChapter = /^Chapter\s+/i.test(trimmed) || /^Chapter\s+\d+/i.test(trimmed) || (trimmed.length < 35 && !trimmed.endsWith("."));

    if (isChapter) {
      // Force page break for chapters if we are already far down the page
      if (currentY > margin + 15) {
        // Draw page footer before leaving the page
        doc.setFontSize(8);
        doc.setFont("times", "italic");
        doc.setTextColor(130, 130, 130);
        doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 12, { align: "center" });

        doc.addPage();
        currentY = margin + 10;
        pageNumber++;
      }
      
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.setTextColor(17, 24, 39); // Deep dark gray/black
      
      const headerLines = doc.splitTextToSize(trimmed, maxLineWidth);
      headerLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, currentY, { align: "center" });
        currentY += 9;
      });
      currentY += 8; // Spacer after heading
    } else {
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55); // Reader text gray
      
      const lines = doc.splitTextToSize(trimmed, maxLineWidth);
      
      lines.forEach((line: string, index: number) => {
        // Height check before printing a line
        if (currentY + 7 > pageHeight - margin) {
          // Draw running footer before adding a page
          doc.setFontSize(8);
          doc.setFont("times", "italic");
          doc.setTextColor(130, 130, 130);
          doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 12, { align: "center" });

          doc.addPage();
          currentY = margin;
          pageNumber++;
          
          doc.setFont("times", "normal");
          doc.setFontSize(11);
          doc.setTextColor(31, 41, 55);
        }
        
        // Indent only the very first line of a regular paragraph
        const xOffset = (index === 0) ? margin + 6 : margin;
        doc.text(line, xOffset, currentY);
        currentY += 6.5; // Line height
      });
      
      currentY += 4.5; // Space between paragraphs
    }
  });

  // Print final page's running footer
  doc.setFontSize(8);
  doc.setFont("times", "italic");
  doc.setTextColor(130, 130, 130);
  doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 12, { align: "center" });

  return doc.output("blob");
}
