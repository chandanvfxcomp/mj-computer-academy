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
  const W = 165;
  const H = 340;
  const doc = new jsPDF({ unit: "pt", format: [W, H] });
  const navy = [16, 27, 52];
  const gold = [200, 155, 60];
  const muted = [92, 100, 120];
  const lightBg = [246, 247, 250];

  const admissionDate = student.joining_date ? new Date(student.joining_date).toLocaleDateString("en-IN") : "-";
  const qrPayload = [
    `Name: ${student.full_name || "-"}`,
    `Code: ${student.student_code || "-"}`,
    `Course: ${student.courses?.name || "-"}`,
    `Mobile: ${student.phone || "-"}`,
    `Email: ${student.email || "-"}`,
    `DOB: ${student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString("en-IN") : "-"}`,
    `Admission Date: ${admissionDate}`,
    `Batch: ${student.batch_timing || "-"}`,
  ].join("\n");

  const [logoDataUrl, photoDataUrl, qrDataUrl] = await Promise.all([
    loadImageDataUrl("/logo.png"),
    loadImageDataUrl(student.photo_url),
    QRCode.toDataURL(qrPayload, { margin: 0, width: 220 }),
  ]);

  // ===== Header =====
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 58, "F");
  doc.setFillColor(...gold);
  doc.rect(0, 58, W, 2.5, "F");

  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect((W - 32) / 2, 6, 32, 32, 5, 5, "F");
    doc.addImage(logoDataUrl, "PNG", (W - 28) / 2, 8, 28, 28);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("MJ COMPUTER ACADEMY", W / 2, 45, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(228, 197, 120);
  doc.text("STUDENT IDENTITY CARD", W / 2, 52, { align: "center" });

  // ===== Photo =====
  const photoSize = 80;
  const photoX = (W - photoSize) / 2;
  const photoY = 70;

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
  let y = photoY + photoSize + 20;
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
  y += 6;
  doc.setFillColor(...navy);
  doc.roundedRect(pillX, y - 10, pillW, 16, 8, 8, "F");
  doc.setTextColor(...gold);
  doc.text(courseName, W / 2, y + 1, { align: "center" });

  // ===== Details (Mobile, Email, Admission Date) =====
  y += 24;
  doc.setFontSize(7.3);
  const rows = [["Mobile", student.phone || "-"]];
  if (student.email) rows.push(["Email", student.email]);
  rows.push(["Admission", admissionDate]);

  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...muted);
    doc.text(`${label}:`, 16, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...navy);
    const valueLines = doc.splitTextToSize(String(value), W - 78);
    doc.text(valueLines[0], 62, y);
    y += 12;
  });

  // ===== QR code (clean, separate box) =====
  y += 6;
  const qrSize = 40;
  const qrBoxX = (W - qrSize) / 2;
  doc.setDrawColor(226, 228, 234);
  doc.setFillColor(...lightBg);
  doc.roundedRect(qrBoxX - 5, y, qrSize + 10, qrSize + 10, 5, 5, "FD");
  doc.addImage(qrDataUrl, "PNG", qrBoxX, y + 5, qrSize, qrSize);
  y += qrSize + 16;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(5.5);
  doc.setTextColor(...muted);
  doc.text("Scan for full registration details", W / 2, y, { align: "center" });

  // ===== Footer contact band =====
  const footerH = 26;
  doc.setFillColor(...navy);
  doc.rect(0, H - footerH, W, footerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.3);
  doc.setTextColor(255, 255, 255);
  doc.text("mjcomputeracademy@gmail.com", W / 2, H - footerH + 12, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(228, 197, 120);
  doc.text("+91 80029 91116, 88629 77872", W / 2, H - footerH + 21, { align: "center" });

  doc.save(`ID-Card-${student.student_code || student.full_name}.pdf`);
}
