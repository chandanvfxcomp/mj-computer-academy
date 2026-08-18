export const metadata = { title: "Privacy Policy | MJ Computer Academy" };

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <img src="/logo.png" alt="MJ Computer Academy" className="w-16 h-16 object-contain mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2" style={{ color: "var(--navy)" }}>Privacy Policy</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Last updated: August 2026</p>

        <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#333" }}>
          <p>
            MJ Computer Academy (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates this student fee payment
            portal solely for educational purposes — to help our enrolled students track and pay their course fees,
            and to help our administrative staff manage student records and fee collection.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>Information We Collect</h2>
          <p>
            We collect information necessary to manage student enrollment and fee payments, including: student name,
            date of birth, contact details (email and mobile number), guardian&apos;s contact number, course and
            batch details, and payment/transaction records (amount, date, mode, and reference numbers for
            verification).
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>How We Use This Information</h2>
          <p>
            This information is used exclusively to: identify students and their enrolled courses, calculate and
            track fee payments and dues, generate official payment receipts, verify submitted payment proofs, and
            send payment confirmation notifications. We do not sell, rent, or share student data with third parties
            for marketing purposes.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>Payment Information</h2>
          <p>
            Fee payments are collected for genuine educational course enrollment at MJ Computer Academy. We do not
            store card or full bank account details on our servers — payments are processed through secure,
            RBI-regulated payment gateways where applicable, and UPI/bank reference numbers are used only to verify
            and match a student&apos;s payment to their account.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>Data Security</h2>
          <p>
            Student data is stored on secure, access-controlled servers. Only authorized academy administrators and
            staff can access student records, and access is limited to what is necessary for their role.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>Contact Us</h2>
          <p>
            For any questions about this policy or your data, contact us at{" "}
            <a href="mailto:mjcomputeracademy@gmail.com" className="underline" style={{ color: "var(--navy)" }}>
              mjcomputeracademy@gmail.com
            </a>{" "}
            or call +91 80029 91116 / 88629 77872.
          </p>
        </div>

        <a href="/" className="inline-block mt-8 text-sm font-semibold underline" style={{ color: "var(--navy)" }}>
          ← Back to Login
        </a>
      </div>
    </div>
  );
}
