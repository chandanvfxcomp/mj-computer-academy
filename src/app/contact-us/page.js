export const metadata = { title: "Contact Us | MJ Computer Academy" };

export default function ContactUs() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <img src="/logo.png" alt="MJ Computer Academy" className="w-16 h-16 object-contain mb-4" />
        <h1 className="font-display text-2xl font-bold mb-6" style={{ color: "var(--navy)" }}>Contact Us</h1>

        <div className="space-y-3 text-sm" style={{ color: "#333" }}>
          <p><strong>MJ Computer Academy</strong></p>
          <p>Email: <a href="mailto:mjcomputeracademy@gmail.com" className="underline" style={{ color: "var(--navy)" }}>mjcomputeracademy@gmail.com</a></p>
          <p>Phone: +91 80029 91116, +91 88629 77872</p>
          <p className="pt-4" style={{ color: "var(--muted)" }}>
            This portal is used to manage fee payments for students currently enrolled at MJ Computer Academy. For
            admissions or general enquiries, please reach out using the details above.
          </p>
        </div>

        <a href="/" className="inline-block mt-8 text-sm font-semibold underline" style={{ color: "var(--navy)" }}>
          ← Back to Login
        </a>
      </div>
    </div>
  );
}
