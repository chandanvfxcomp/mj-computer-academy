export const metadata = { title: "Refund & Cancellation Policy | MJ Computer Academy" };

export default function RefundPolicy() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <img src="/logo.png" alt="MJ Computer Academy" className="w-16 h-16 object-contain mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2" style={{ color: "var(--navy)" }}>Refund &amp; Cancellation Policy</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Last updated: August 2026</p>

        <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#333" }}>
          <p>
            This policy applies to course fee payments made through the MJ Computer Academy student fee portal for
            our educational courses (e.g. DCA, Tally, Graphics Designing) and academic tuition classes.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>Course Cancellation by Student</h2>
          <p>
            A student wishing to discontinue a course should inform the academy office in writing (in person, by
            phone, or by email) as early as possible. Refund eligibility for fees already paid depends on how much
            of the course has been completed and is decided on a case-by-case basis by academy management.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>Refund Timeline</h2>
          <p>
            Where a refund is approved, it will be processed within 7–14 working days to the original mode of
            payment (or bank transfer, where applicable), after verification by academy staff.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>Non-Refundable Items</h2>
          <p>
            One-time admission/registration charges are generally non-refundable once a student has attended one or
            more classes. Study materials issued to the student, if any, are also non-refundable once provided.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>Course Cancellation by Academy</h2>
          <p>
            In the rare event that MJ Computer Academy cancels a batch or course before it is completed, students
            will be offered a full refund of fees paid for the remaining, undelivered portion of the course, or the
            option to transfer to another available batch/course.
          </p>

          <h2 className="font-semibold text-base mt-6" style={{ color: "var(--navy)" }}>How to Request a Refund</h2>
          <p>
            To request a refund, please contact the academy directly at{" "}
            <a href="mailto:mjcomputeracademy@gmail.com" className="underline" style={{ color: "var(--navy)" }}>
              mjcomputeracademy@gmail.com
            </a>{" "}
            or call +91 80029 91116 / 88629 77872, along with your Student Code and payment receipt number.
          </p>
        </div>

        <a href="/" className="inline-block mt-8 text-sm font-semibold underline" style={{ color: "var(--navy)" }}>
          ← Back to Login
        </a>
      </div>
    </div>
  );
}
