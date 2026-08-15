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
  // Portrait ID card, credit-card width, extra height for a clean vertical layout
  const W = 165;
  const H = 275;
  const doc = new jsPDF({ unit: "pt", format: [W, H] });
  const navy = [16, 27, 52];
  const gold = [200, 155, 60];
  const muted = [92, 100, 120];
  const lightBg = [246, 247, 250];

  const [logoDataUrl, photoDataUrl, qrDataUrl] = await Promise.all([
    loadImageDataUrl("/logo.png"),
    loadImageDataUrl(student.photo_url),
    QRCode.toDataURL(student.student_code || student.id, { margin: 0, width: 200 }),
  ]);

  // ===== Header band =====
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 54, "F");
  doc.setFillColor(...gold);
  doc.rect(0, 54, W, 2.5, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", (W - 30) / 2, 6, 30, 30);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("MJ COMPUTER ACADEMY", W / 2, 43, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(228, 197, 120);
  doc.text("STUDENT IDENTITY CARD", W / 2, 50, { align: "center" });

  // ===== Photo =====
  const photoSize = 82;
  const photoX = (W - photoSize) / 2;
  const photoY = 66;

  doc.setFillColor(...lightBg);
  doc.roundedRect(photoX - 3, photoY - 3, photoSize + 6, photoSize + 6, 6, 6, "F");

  if (photoDataUrl) {
    doc.addImage(photoDataUrl, "JPEG", photoX, photoY, photoSize, photoSize);
  } else {
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("No Photo", W / 2, photoY + photoSize / 2, { align: "center" });
  }
  doc.setDrawColor(...gold);
  doc.setLineWidth(1.6);
  doc.roundedRect(photoX - 3, photoY - 3, photoSize + 6, photoSize + 6, 6, 6, "S");

  // ===== Name =====
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const nameLines = doc.splitTextToSize((student.full_name || "-").toUpperCase(), W - 20);
  let y = photoY + photoSize + 18;
  nameLines.slice(0, 2).forEach((line) => {
    doc.text(line, W / 2, y, { align: "center" });
    y += 13;
  });

  // ===== Course pill =====
  const courseName = student.courses?.name || "-";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const pillW = Math.min(W - 24, doc.getTextWidth(courseName) + 24);
  const pillX = (W - pillW) / 2;
  y += 4;
  doc.setFillColor(...navy);
  doc.roundedRect(pillX, y - 10, pillW, 16, 8, 8, "F");
  doc.setTextColor(...gold);
  doc.text(courseName, W / 2, y + 1, { align: "center" }, undefined, "center");

  // ===== Details =====
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const rows = [
    ["Code", student.student_code || "-"],
    ["Batch", student.batch_timing || "-"],
    ["Mobile", student.phone || "-"],
    ["Joined", student.joining_date ? new Date(student.joining_date).toLocaleDateString("en-IN") : "-"],
  ];
  rows.forEach(([label, value]) => {
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...navy);
    doc.text(String(value), 48, y);
    y += 12;
  });

  // ===== Footer with QR =====
  const footerH = 46;
  doc.setFillColor(...navy);
  doc.rect(0, H - footerH, W, footerH, "F");
  doc.addImage(qrDataUrl, "PNG", 10, H - footerH + 6, 34, 34);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text("mjcomputeracademy", 52, H - footerH + 16);
  doc.text("@gmail.com", 52, H - footerH + 24);
  doc.setTextColor(228, 197, 120);
  doc.text("+91 80029 91116", 52, H - footerH + 34);

  doc.save(`ID-Card-${student.student_code || student.full_name}.pdf`);
}
