import jsPDF from "jspdf";
import QRCode from "qrcode";

async function loadImageDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
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

export async function generateIdCardPDF(student) {
  // Standard credit-card size (CR80): 3.375in x 2.125in
  const doc = new jsPDF({ unit: "pt", format: [243, 153] });
  const navy = [16, 27, 52];
  const gold = [200, 155, 60];
  const muted = [92, 100, 120];

  const [logoDataUrl, photoDataUrl, qrDataUrl] = await Promise.all([
    loadImageDataUrl("/logo.png"),
    loadImageDataUrl(student.photo_url),
    QRCode.toDataURL(student.student_code || student.id, { margin: 1, width: 200 }),
  ]);

  // Header
  doc.setFillColor(...navy);
  doc.rect(0, 0, 243, 40, "F");
  doc.setFillColor(...gold);
  doc.rect(0, 40, 243, 2, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 8, 6, 28, 28);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("MJ Computer Academy", 42, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(228, 197, 120);
  doc.text("Student Identity Card", 42, 30);

  // Photo
  if (photoDataUrl) {
    doc.setDrawColor(...gold);
    doc.setLineWidth(1);
    doc.addImage(photoDataUrl, "JPEG", 10, 50, 60, 70);
    doc.rect(10, 50, 60, 70);
  } else {
    doc.setDrawColor(...gold);
    doc.setFillColor(240, 241, 245);
    doc.rect(10, 50, 60, 70, "FD");
    doc.setTextColor(...muted);
    doc.setFontSize(7);
    doc.text("No Photo", 22, 88);
  }

  // Details
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(student.full_name || "-", 78, 58);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...muted);
  doc.text(`Code: ${student.student_code || "-"}`, 78, 70);
  doc.text(`Course: ${student.courses?.name || "-"}`, 78, 81);
  doc.text(`Batch: ${student.batch_timing || "-"}`, 78, 92);
  doc.text(`Phone: ${student.phone || "-"}`, 78, 103);

  // QR code
  doc.addImage(qrDataUrl, "PNG", 190, 55, 42, 42);

  doc.setFontSize(6);
  doc.setTextColor(...muted);
  doc.text("mjcomputeracademy@gmail.com", 10, 140);
  doc.text("+91 80029 91116", 10, 148);

  doc.save(`ID-Card-${student.student_code || student.full_name}.pdf`);
}
