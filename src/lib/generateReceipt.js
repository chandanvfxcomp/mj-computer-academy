import jsPDF from "jspdf";

async function loadLogoDataUrl() {
  try {
    const res = await fetch("/logo.png");
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateReceiptPDF(payment, student) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const navy = [16, 27, 52];
  const gold = [200, 155, 60];
  const muted = [92, 100, 120];

  const logoDataUrl = await loadLogoDataUrl();

  // Watermark: big faint logo in the center of the page
  if (logoDataUrl) {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.addImage(logoDataUrl, "PNG", 147, 320, 300, 300);
    doc.restoreGraphicsState();
  }

  // Header band
  doc.setFillColor(...navy);
  doc.rect(0, 0, 595, 100, "F");
  doc.setFillColor(...gold);
  doc.rect(0, 100, 595, 4, "F");

  if (logoDataUrl) {
    // white rounded plate behind logo so it's clearly visible on navy
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(38, 18, 66, 66, 8, 8, "F");
    doc.addImage(logoDataUrl, "PNG", 44, 24, 54, 54);
  }

  const textX = logoDataUrl ? 118 : 40;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MJ Computer Academy", textX, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(228, 197, 120);
  doc.text("Official Fee Payment Receipt", textX, 68);
  doc.setFontSize(9);
  doc.text("where success is Tradition", textX, 84);

  // Receipt meta box
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Receipt No: ${payment.receipt_number}`, 40, 140);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`Date: ${new Date(payment.payment_date).toLocaleDateString("en-IN")}`, 40, 158);

  doc.setDrawColor(226, 228, 234);
  doc.line(40, 178, 555, 178);

  // Student details
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Student Details", 40, 208);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...muted);
  doc.text(`Name: ${student.full_name}`, 40, 230);
  doc.text(`Student Code: ${student.student_code || "-"}`, 40, 248);
  doc.text(`Course: ${student.courses?.name || student.course || "-"}`, 40, 266);

  // Payment table
  doc.setDrawColor(226, 228, 234);
  doc.setFillColor(246, 247, 250);
  doc.rect(40, 296, 515, 36, "F");
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Description", 55, 318);
  doc.text("Mode", 320, 318);
  doc.text("Amount", 480, 318);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text("Course Fee Payment", 55, 351);
  doc.text(payment.payment_mode.replace("_", " ").toUpperCase(), 320, 351);
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${Number(payment.amount).toLocaleString("en-IN")}`, 480, 351);

  doc.setDrawColor(226, 228, 234);
  doc.line(40, 371, 555, 371);

  doc.setFontSize(13);
  doc.setTextColor(...navy);
  doc.text("Total Paid", 380, 401);
  doc.setTextColor(...gold);
  doc.setFontSize(16);
  doc.text(`Rs. ${Number(payment.amount).toLocaleString("en-IN")}`, 460, 401);

  if (payment.notes) {
    doc.setFontSize(10);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.text(`Notes: ${payment.notes}`, 40, 436);
  }

  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("This is a system-generated receipt from MJ Computer Academy's fee portal.", 40, 780);

  doc.save(`Receipt-${payment.receipt_number}.pdf`);
}
