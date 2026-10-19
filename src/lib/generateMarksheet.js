import jsPDF from "jspdf";
import { gradeFor, percentageOf } from "@/lib/grade";

const NAVY = [16, 27, 52];
const GOLD = [200, 155, 60];
const MUTED = [92, 100, 120];

function loadImageResized(url, maxDim = 200, quality = 0.8) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let { width, height } = img;
      if (width >= height && width > maxDim) {
        height = Math.round(height * (maxDim / width));
        width = maxDim;
      } else if (height > width && height > maxDim) {
        width = Math.round(width * (maxDim / height));
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Sirf drawing — browser ke bina bhi test ho sakti hai (logoDataUrl bahar se aata hai)
export function drawMarksheet(doc, { student, exam, marks, remarks }, logoDataUrl) {
  const pct = percentageOf(marks, exam.max_marks);
  const grade = gradeFor(pct);
  const fmt = (n) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  // Watermark
  if (logoDataUrl) {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.addImage(logoDataUrl, "JPEG", 147, 300, 300, 300);
    doc.restoreGraphicsState();
  }

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 595, 100, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 100, 595, 4, "F");
  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(38, 18, 66, 66, 8, 8, "F");
    doc.addImage(logoDataUrl, "JPEG", 44, 24, 54, 54);
  }
  const textX = logoDataUrl ? 118 : 40;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MJ Computer Academy", textX, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(228, 197, 120);
  doc.text("Result Card / Marksheet", textX, 68);
  doc.setFontSize(9);
  doc.text("where success is Tradition", textX, 84);

  // Exam title
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(exam.name, 297.5, 150, { align: "center", maxWidth: 480 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(
    `Exam Date: ${new Date(exam.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
    297.5, 172, { align: "center" }
  );

  doc.setDrawColor(226, 228, 234);
  doc.line(40, 192, 555, 192);

  // Student details
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Student Details", 40, 220);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(`Name: ${student.full_name || "N/A"}`, 40, 242);
  doc.text(`Student Code: ${student.student_code || "N/A"}`, 40, 260);
  doc.text(`Course / Class: ${student.courses?.name || "N/A"}`, 320, 242);

  // Marks table
  doc.setFillColor(246, 247, 250);
  doc.rect(40, 296, 515, 36, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Exam", 55, 318);
  doc.text("Maximum Marks", 310, 318);
  doc.text("Marks Obtained", 440, 318);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(exam.name, 55, 352, { maxWidth: 240 });
  doc.text(fmt(exam.max_marks), 310, 352);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(fmt(marks), 440, 352);
  doc.setDrawColor(226, 228, 234);
  doc.line(40, 372, 555, 372);

  // Summary boxes
  doc.setFillColor(246, 247, 250);
  doc.roundedRect(40, 400, 245, 90, 8, 8, "F");
  doc.roundedRect(310, 400, 245, 90, 8, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text("Percentage", 162.5, 425, { align: "center" });
  doc.text("Grade", 432.5, 425, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...NAVY);
  doc.text(`${pct}%`, 162.5, 468, { align: "center" });
  doc.setTextColor(...GOLD);
  doc.text(grade, 432.5, 468, { align: "center" });

  if (remarks) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("Remarks", 40, 530);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(String(remarks), 40, 548, { maxWidth: 515 });
  }

  // Signature
  doc.setDrawColor(...MUTED);
  doc.line(400, 690, 555, 690);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Authorised Signatory", 477.5, 704, { align: "center" });

  // Footer band
  doc.setFillColor(246, 247, 250);
  doc.rect(0, 730, 595, 112, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.line(0, 730, 595, 730);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("MJ Computer Academy", 297.5, 754, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("mjcomputeracademy@gmail.com   |   +91 80029 91116, 88629 77872", 297.5, 770, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 155, 170);
  doc.text("This is a system-generated result card from MJ Computer Academy's portal.", 297.5, 786, { align: "center" });
}

export async function generateMarksheetPDF(data) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const logo = await loadImageResized("/logo.png", 200, 0.8);
  drawMarksheet(doc, data, logo);
  const safeName = (data.exam.name || "exam").replace(/[^a-z0-9]+/gi, "-");
  doc.save(`Marksheet-${data.student.student_code || "student"}-${safeName}.pdf`);
}
