export const metadata = { title: "Terms & Conditions | MJ Computer Academy" };

export default function TermsPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <img src="/logo.png" alt="MJ Computer Academy" className="w-16 h-16 object-contain mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2" style={{ color: "var(--navy)" }}>Terms &amp; Conditions</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Last updated: August 2026</p>

        <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#333" }}>
          <p>
            This portal (&quot;the Portal&quot;) is operated by MJ Computer Academy for the sole purpose of managing
            course fee payments for our currently enrolled students. By using this Portal, students, parents/guardians,
            and staff agree to the following terms.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>1. Purpose</h2>
          <p>
            This Portal is used strictly for educational fee collection — tracking course enrollment, fee due dates,
            installment plans, and payment history for students of MJ Computer Academy. It is not a general payment
            or e-commerce platform.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>2. Account Access</h2>
          <p>
            Student login accounts are created and issued only by MJ Computer Academy&apos;s administrative staff
            upon enrollment. Students are responsible for keeping their login credentials confidential.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>3. Fee Payments</h2>
          <p>
            Fees displayed on the Portal reflect the course fee structure set at the time of enrollment. Payments
            submitted through the Portal are reviewed and approved by academy staff before being reflected as
            confirmed. Official receipts are issued only after payment approval.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>4. Accuracy of Information</h2>
          <p>
            Students and guardians are responsible for ensuring that contact details (email, mobile number) provided
            are accurate, so that payment confirmations and important updates are received correctly.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>5. Refunds &amp; Cancellations</h2>
          <p>
            Please refer to our <a href="/refund-policy" className="underline" style={{ color: "var(--navy)" }}>Refund Policy</a> for details on fee refunds and course cancellations.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>6. Contact</h2>
          <p>
            For any questions regarding these terms, contact{" "}
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
