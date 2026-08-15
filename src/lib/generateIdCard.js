import jsPDF from "jspdf";
import QRCode from "qrcode";

function loadImageResized(url, maxDim = 200, quality = 0.75) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round(height * (maxDim / width));
        width = maxDim;
      } else if (height >= width && height > maxDim) {
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

export async function generateIdCardPDF(student) {
  const W = 165;
  const H = 275;
  const doc = new jsPDF({ unit: "pt", format: [W, H] });
  const navy = [16, 27, 52];
  const gold = [200, 155, 60];
  const muted = [92, 100, 120];
  const lightBg = [246, 247, 250];

  const admissionDate = student.joining_date ? new Date(student.joining_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
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
    loadImageResized("/logo.png", 150, 0.8),
    loadImageResized(student.photo_url, 250, 0.75),
    QRCode.toDataURL(qrPayload, { margin: 0, width: 220 }),
  ]);

  // ===== Header =====
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 36, "F");
  doc.setFillColor(...gold);
  doc.rect(0, 36, W, 2, "F");

  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(8, 8, 20, 20, 4, 4, "F");
    doc.addImage(logoDataUrl, "JPEG", 9.5, 9.5, 17, 17);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.text("MJ COMPUTER", 34, 17);
  doc.text("ACADEMY", 34, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.6);
  doc.setTextColor(228, 197, 120);
  doc.text("STUDENT IDENTITY CARD", 34, 32);

  // ===== Photo =====
  const photoSize = 72;
  const photoX = (W - photoSize) / 2;
  const photoY = 48;

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
  doc.setFontSize(11.5);
  const nameLines = doc.splitTextToSize((student.full_name || "-").toUpperCase(), W - 20);
  let y = photoY + photoSize + 18;
  nameLines.slice(0, 2).forEach((line) => {
    doc.text(line, W / 2, y, { align: "center" });
    y += 12;
  });

  // ===== Course pill =====
  const courseName = student.courses?.name || "-";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const pillW = Math.min(W - 24, doc.getTextWidth(courseName) + 22);
  const pillX = (W - pillW) / 2;
  y += 5;
  doc.setFillColor(...navy);
  doc.roundedRect(pillX, y - 9, pillW, 15, 7.5, 7.5, "F");
  doc.setTextColor(...gold);
  doc.text(courseName, W / 2, y + 1, { align: "center" });

  // ===== Details =====
  y += 20;
  doc.setFontSize(7);
  const rows = [["Mobile", student.phone || "-"]];
  if (student.email) rows.push(["Email", student.email]);
  rows.push(["Admission", admissionDate]);

  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...muted);
    doc.text(`${label}:`, 16, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...navy);
    const valueLines = doc.splitTextToSize(String(value), W - 76);
    doc.text(valueLines[0], 60, y);
    y += 11;
  });

  // ===== Footer: QR + Academy Contact side by side =====
  const footerH = 58;
  doc.setFillColor(...navy);
  doc.rect(0, H - footerH, W, footerH, "F");

  const qrSize = 38;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(9, H - footerH + 10, qrSize + 4, qrSize + 4, 4, 4, "F");
  doc.addImage(qrDataUrl, "PNG", 11, H - footerH + 12, qrSize, qrSize);

  const textX = 9 + qrSize + 4 + 8;
  const availWidth = W - textX - 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(...gold);
  doc.text("ACADEMY CONTACT", textX, H - footerH + 15);

  // Email — auto-shrink font so it always fits on one line
  const emailText = "mjcomputeracademy@gmail.com";
  let emailSize = 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(emailSize);
  while (doc.getTextWidth(emailText) > availWidth && emailSize > 3.8) {
    emailSize -= 0.2;
    doc.setFontSize(emailSize);
  }
  doc.setTextColor(255, 255, 255);
  doc.text(emailText, textX, H - footerH + 25);

  doc.setFontSize(5.6);
  doc.setTextColor(228, 197, 120);
  doc.text("+91 80029 91116", textX, H - footerH + 35);
  doc.text("+91 88629 77872", textX, H - footerH + 45);

  doc.save(`ID-Card-${student.student_code || student.full_name}.pdf`);
}
