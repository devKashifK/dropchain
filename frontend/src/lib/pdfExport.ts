import { jsPDF } from "jspdf";
import type { Message } from "../types";

// Helper to strip Markdown formatting for a clean PDF presentation
function stripMarkdown(text: string): string {
  return text
    .replace(/```(?:\w*)\n([\s\S]*?)```/g, "$1") // Code blocks
    .replace(/\*\*(.*?)\*\*/g, "$1") // Bold
    .replace(/\*(.*?)\*/g, "$1")     // Italic
    .replace(/####\s+(.*?)/g, "$1")  // Header 4
    .replace(/###\s+(.*?)/g, "$1")   // Header 3
    .replace(/##\s+(.*?)/g, "$1")    // Header 2
    .replace(/#\s+(.*?)/g, "$1")     // Header 1
    .replace(/`(.*?)`/g, "$1");      // Inline code
}

export function exportChatToPDF(sessionName: string, messages: Message[]) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin; // 180mm
  
  let y = 15;

  const drawHeader = () => {
    // Draw Lucide Bot outline logo in brand blue
    doc.setDrawColor(37, 99, 235); // Brand Blue
    doc.setLineWidth(0.8);
    
    // Head: rounded rect at X=16.5, Y=16.5, width=9, height=7, rx=1.5, ry=1.5
    doc.roundedRect(16.5, 16.5, 9, 7, 1.5, 1.5, "S");
    
    // Eyes: vertical lines at X=19.5 and X=22.5, Y from 18.5 to 20.5
    doc.line(19.5, 18.5, 19.5, 20.5);
    doc.line(22.5, 18.5, 22.5, 20.5);
    
    // Antenna: vertical line at center X=21, Y from 14 to 16.5, and top horizontal line from 19.5 to 22.5 at Y=14
    doc.line(21, 14, 21, 16.5);
    doc.line(19.5, 14, 22.5, 14);
    
    // Ears: horizontal lines with tiny vertical ticks
    doc.line(15.2, 20, 16.5, 20);
    doc.line(15.2, 19.3, 15.2, 20.7);
    doc.line(25.5, 20, 26.8, 20);
    doc.line(26.8, 19.3, 26.8, 20.7);

    // Title text (charcoal bold)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(17, 24, 39); // #111827
    doc.text("Dropchain Chat", 31, 22);

    // Subheader info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // #6b7280
    doc.text(`Document: ${sessionName}`, 31, 27);

    // Date
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Exported: ${dateStr}`, pageWidth - margin, 27, { align: "right" });

    // Divider line
    doc.setDrawColor(229, 231, 235); // #e5e7eb
    doc.setLineWidth(0.5);
    doc.line(margin, 32, pageWidth - margin, 32);
    
    y = 42;
  };

  const drawPageHeader = () => {
    // Mini logo in header of subsequent pages
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    
    // Draw mini bot head: rounded rect at X=15, Y=11, width=5, height=4, rx=0.8, ry=0.8
    doc.roundedRect(15, 11, 5, 4, 0.8, 0.8, "S");
    // Mini eyes
    doc.line(16.5, 12, 16.5, 13);
    doc.line(18.5, 12, 18.5, 13);
    // Mini antenna
    doc.line(17.5, 9.5, 17.5, 11);
    doc.line(16.5, 9.5, 18.5, 9.5);
    // Mini ears
    doc.line(14.2, 13, 15, 13);
    doc.line(20, 13, 20.8, 13);
    
    // Mini title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.text("Dropchain Chat", 22, 14.5);
    
    // Running header session name on the right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(sessionName, pageWidth - margin, 14.5, { align: "right" });
    
    // Divider line
    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.2);
    doc.line(margin, 17, pageWidth - margin, 17);
  };

  // Draw first page header
  drawHeader();

  // Render messages
  messages.forEach((msg) => {
    const isUser = msg.role === "user";
    const cleanContent = stripMarkdown(msg.content);

    if (isUser) {
      // Question block wrapping
      const textLines = doc.splitTextToSize(cleanContent, contentWidth - 10);
      const lineCount = textLines.length;
      
      // Calculate block height: label + text lines padding
      const blockHeight = 10 + lineCount * 5;

      // Check page break
      if (y + blockHeight > pageHeight - 20) {
        doc.addPage();
        drawPageHeader();
        y = 25;
      }

      // Draw background card (soft gray-blue)
      doc.setFillColor(248, 250, 252); // #f8fafc
      doc.roundedRect(margin, y, contentWidth, blockHeight, 1.5, 1.5, "F");

      // Left blue accent bar
      doc.setFillColor(37, 99, 235); // #2563eb (brand blue)
      doc.rect(margin, y, 1.5, blockHeight, "F");

      // Draw "QUESTION" label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text("QUESTION", margin + 5, y + 5);

      // Draw question content lines
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59); // #1e293b
      
      let lineY = y + 10;
      textLines.forEach((line: string) => {
        doc.text(line, margin + 5, lineY);
        lineY += 5;
      });

      y += blockHeight + 6; // Spacing after block

    } else {
      // Answer block
      // Draw Answer block dynamically in a rounded rect card matching the Question card
      const textLines = doc.splitTextToSize(cleanContent, contentWidth - 10);
      let currentLineIndex = 0;
      
      while (currentLineIndex < textLines.length) {
        const isFirstPageOfAnswer = currentLineIndex === 0;
        const labelHeight = isFirstPageOfAnswer ? 8 : 0;
        
        // Count how many lines fit on the current page
        let tempY = y + labelHeight;
        let linesOnThisPage = 0;
        for (let i = currentLineIndex; i < textLines.length; i++) {
          const line = textLines[i];
          const isParagraphBreak = line.trim() === "";
          const nextLineHeight = isParagraphBreak ? 3 : 5;
          if (tempY + nextLineHeight > pageHeight - 20) {
            break;
          }
          tempY += nextLineHeight;
          linesOnThisPage++;
        }
        
        // If no lines fit, push to the next page
        if (linesOnThisPage === 0) {
          doc.addPage();
          drawPageHeader();
          y = 25;
          continue;
        }
        
        // Calculate card height for this page segment
        const cardHeight = labelHeight + (tempY - (y + labelHeight)) + 4;
        
        // Draw background card (soft neutral gray)
        doc.setFillColor(250, 250, 250); // #fafafa
        doc.roundedRect(margin, y, contentWidth, cardHeight, 1.5, 1.5, "F");
        
        // Left slate-gray accent bar
        doc.setFillColor(148, 163, 184); // #94a3b8 (slate-gray)
        doc.rect(margin, y, 1.5, cardHeight, "F");
        
        // Draw "ANSWER" label (slate-gray)
        if (isFirstPageOfAnswer) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // slate-gray
          doc.text("ANSWER", margin + 5, y + 5);
        }
        
        // Draw the text lines on this page
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59); // #1e293b
        
        let lineY = y + labelHeight + 4;
        for (let i = 0; i < linesOnThisPage; i++) {
          const line = textLines[currentLineIndex + i];
          const isParagraphBreak = line.trim() === "";
          const nextLineHeight = isParagraphBreak ? 3 : 5;
          
          if (!isParagraphBreak) {
            doc.text(line, margin + 5, lineY);
          }
          lineY += nextLineHeight;
        }
        
        y += cardHeight + 4; // Move Y past the card + padding
        currentLineIndex += linesOnThisPage;
        
        // Add a page break if there are lines remaining
        if (currentLineIndex < textLines.length) {
          doc.addPage();
          drawPageHeader();
          y = 25;
        }
      }

      y += 2; // space before citations

      // Citations / Sources
      const rawCitations = msg.citations || [];
      const topCitations = [...rawCitations]
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);

      if (topCitations.length > 0) {
        // Draw "SOURCES & CITATIONS" label
        if (y + 8 > pageHeight - 20) {
          doc.addPage();
          drawPageHeader();
          y = 25;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // #94a3b8
        doc.text("SOURCES & CITATIONS", margin, y + 3);
        y += 6;

        topCitations.forEach((cite, idx) => {
          const cleanCiteText = stripMarkdown(cite.text);
          const citeLines = doc.splitTextToSize(cleanCiteText, contentWidth - 8);
          
          // Calculate citation card height
          const citeCardHeight = 8 + citeLines.length * 4;

          if (y + citeCardHeight > pageHeight - 20) {
            doc.addPage();
            drawPageHeader();
            y = 25;
          }

          // Draw citation container card
          doc.setFillColor(250, 250, 250); // #fafafa
          doc.setDrawColor(241, 245, 249); // #f1f5f9
          doc.setLineWidth(0.25);
          doc.roundedRect(margin, y, contentWidth, citeCardHeight, 1, 1, "FD");

          // Draw source label
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`[Source ${idx + 1}]`, margin + 4, y + 4.5);

          // Draw relevance score badge
          const scorePercent = (cite.score * 100).toFixed(1);
          const scoreText = `Relevance: ${scorePercent}%`;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          
          if (cite.score >= 0.8) {
            doc.setTextColor(22, 163, 74); // green
          } else if (cite.score >= 0.6) {
            doc.setTextColor(202, 138, 4); // yellow/orange
          } else {
            doc.setTextColor(100, 116, 139); // gray
          }
          
          const scoreWidth = doc.getTextWidth(scoreText);
          doc.text(scoreText, margin + contentWidth - 4 - scoreWidth, y + 4.5);

          // Draw citation content in italic slate
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);

          let citeLineY = y + 8.5;
          citeLines.forEach((line: string) => {
            doc.text(line, margin + 4, citeLineY);
            citeLineY += 4;
          });

          y += citeCardHeight + 3; // space after citation card
        });
      }
      
      y += 6; // Spacing after answer block
    }
  });

  // Second Pass: Draw footer with dynamic page counts on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // #9ca3af
    
    // Left aligned footer branding
    doc.text("Generated by Dropchain Chat", margin, pageHeight - 10);
    
    // Right aligned page numbering (Page X of Y)
    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  // Save the document
  const safeName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`dropchain_chat_${safeName}.pdf`);
}
