export const metadata = { title: "PflegeFit", description: "Interaktiv lernen. Prüfungsfit werden." };
import "./(styles)/globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body>{children}</body>
    </html>
  );
}
