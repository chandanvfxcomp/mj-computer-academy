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

  // Header band
  doc.setFillColor(...navy);
  doc.rect(0, 0, 595, 90, "F");
  doc.setFillColor(...gold);
  doc.rect(0, 90, 595, 4, "F");

  const logoDataUrl = await loadLogoDataUrl();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 40, 15, 60, 60);
  }

  const textX = logoDataUrl ? 112 : 40;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MJ Computer Academy", textX, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(228, 197, 120);
  doc.text("Official Fee Payment Receipt", textX, 65);

  // Receipt meta box
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Receipt No: ${payment.receipt_number}`, 40, 130);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`Date: ${new Date(payment.payment_date).toLocaleDateString("en-IN")}`, 40, 148);

  // Divider
  doc.setDrawColor(226, 228, 234);
  doc.line(40, 170, 555, 170);

  // Student details
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Student Details", 40, 200);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...muted);
  doc.text(`Name: ${student.full_name}`, 40, 222);
  doc.text(`Student Code: ${student.student_code || "-"}`, 40, 240);
  doc.text(`Course: ${student.course || "-"}`, 40, 258);

  // Payment table
  doc.setDrawColor(226, 228, 234);
  doc.setFillColor(246, 247, 250);
  doc.rect(40, 290, 515, 36, "F");
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Description", 55, 312);
  doc.text("Mode", 320, 312);
  doc.text("Amount", 480, 312);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text("Course Fee Payment", 55, 345);
  doc.text(payment.payment_mode.replace("_", " ").toUpperCase(), 320, 345);
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${Number(payment.amount).toLocaleString("en-IN")}`, 480, 345);

  doc.setDrawColor(226, 228, 234);
  doc.line(40, 365, 555, 365);

  // Total
  doc.setFontSize(13);
  doc.setTextColor(...navy);
  doc.text("Total Paid", 380, 395);
  doc.setTextColor(...gold[0] ? gold : gold);
  doc.setFontSize(16);
  doc.text(`Rs. ${Number(payment.amount).toLocaleString("en-IN")}`, 460, 395);

  if (payment.notes) {
    doc.setFontSize(10);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.text(`Notes: ${payment.notes}`, 40, 430);
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(
    "This is a system-generated receipt from MJ Computer Academy's fee portal.",
    40,
    780
  );

  doc.save(`Receipt-${payment.receipt_number}.pdf`);
}
