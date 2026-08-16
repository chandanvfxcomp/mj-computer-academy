import jsPDF from "jspdf";
import QRCode from "qrcode";

function loadImageResized(url, maxDim = 200, quality = 0.75, square = false) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (square) {
        // Center-crop to a square so the photo never looks stretched
        canvas.width = maxDim;
        canvas.height = maxDim;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, maxDim, maxDim);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxDim, maxDim);
      } else {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Draws text at a given size, auto-shrinking until it fits maxWidth (never truncates)
function fitText(doc, text, maxWidth, startSize, minSize = 4.5) {
  let size = startSize;
  doc.setFontSize(size);
  while (doc.getTextWidth(text) > maxWidth && size > minSize) {
    size -= 0.2;
    doc.setFontSize(size);
  }
  return size;
}

function formatShortDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export async function generateIdCardPDF(student) {
  const W = 165;
  const H = 300;
  const doc = new jsPDF({ unit: "pt", format: [W, H] });
  const navy = [16, 27, 52];
  const gold = [200, 155, 60];
  const muted = [92, 100, 120];
  const lightBg = [246, 247, 250];

  const admissionDate = formatShortDate(student.joining_date);
  const dobFormatted = formatShortDate(student.date_of_birth);

  const qrPayload = [
    `Name: ${student.full_name || "N/A"}`,
    `Code: ${student.student_code || "N/A"}`,
    `Course: ${student.courses?.name || "N/A"}`,
    `Mobile: ${student.phone || "N/A"}`,
    `Email: ${student.email || "N/A"}`,
    `DOB: ${dobFormatted}`,
    `Admission Date: ${admissionDate}`,
    `Batch: ${student.batch_timing || "N/A"}`,
  ].join("\n");

  const [logoDataUrl, photoDataUrl, qrDataUrl] = await Promise.all([
    loadImageResized("/logo.png", 150, 0.8),
    loadImageResized(student.photo_url, 300, 0.8, true),
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

  // ===== Photo (square-cropped, never stretched) =====
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
  const nameLines = doc.splitTextToSize((student.full_name || "N/A").toUpperCase(), W - 20);
  let y = photoY + photoSize + 18;
  nameLines.slice(0, 2).forEach((line) => {
    doc.text(line, W / 2, y, { align: "center" });
    y += 12;
  });

  // ===== Course pill (auto-shrinks so long course names never overflow) =====
  const courseName = student.courses?.name || "N/A";
  doc.setFont("helvetica", "bold");
  const maxPillTextWidth = W - 46;
  const pillFontSize = fitText(doc, courseName, maxPillTextWidth, 7.5, 5.5);
  const pillW = Math.min(W - 24, doc.getTextWidth(courseName) + 22);
  const pillX = (W - pillW) / 2;
  y += 5;
  doc.setFillColor(...navy);
  doc.roundedRect(pillX, y - 9, pillW, 15, 7.5, 7.5, "F");
  doc.setTextColor(...gold);
  doc.text(courseName, W / 2, y + 1, { align: "center" });

  // ===== Details (values auto-shrink so nothing is ever cut off) =====
  y += 20;
  const rows = [
    ["Student ID", student.student_code || "N/A"],
    ["Mobile", student.phone || "N/A"],
    ["DOB", dobFormatted],
  ];
  if (student.email) rows.push(["Email", student.email]);
  rows.push(["Admission", admissionDate]);

  const labelX = 16;
  const valueX = 60;
  const maxValueWidth = W - valueX - 10;

  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(`${label}:`, labelX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...navy);
    fitText(doc, String(value), maxValueWidth, 7, 5);
    doc.text(String(value), valueX, y);

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

  doc.setFont("helvetica", "normal");
  fitText(doc, "mjcomputeracademy@gmail.com", availWidth, 6, 3.8);
  doc.setTextColor(255, 255, 255);
  doc.text("mjcomputeracademy@gmail.com", textX, H - footerH + 25);

  doc.setFontSize(5.6);
  doc.setTextColor(228, 197, 120);
  doc.text("+91 80029 91116", textX, H - footerH + 35);
  doc.text("+91 88629 77872", textX, H - footerH + 45);

  doc.save(`ID-Card-${student.student_code || student.full_name}.pdf`);
}
