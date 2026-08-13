"use client";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg border text-center" style={{ borderColor: "#E9EAF0" }}>
        <img src="/logo.png" alt="MJ Computer Academy" className="w-24 h-24 mx-auto object-contain mb-3" />
        <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>
          Account Admin Banayega
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Naya student account sirf academy admin bana sakta hai. Apna login detail lene ke liye academy office se sampark karo.
        </p>
        <a
          href="/"
          className="inline-block w-full rounded-lg py-2.5 font-semibold text-white"
          style={{ background: "var(--navy)" }}
        >
          Login Page Pe Wapas Jao
        </a>
      </div>
    </div>
  );
}
