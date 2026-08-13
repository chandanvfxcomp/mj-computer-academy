import "./globals.css";

export const metadata = {
  title: "MJ Computer Academy | Fee Portal",
  description: "Fee payment tracking and receipt portal for MJ Computer Academy students",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
