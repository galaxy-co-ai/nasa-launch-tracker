import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Mission Control — Artemis II",
  description:
    "Real-time tracking dashboard for NASA's Artemis II crewed lunar flyby mission. Live telemetry, 3D visualization, and NASA data feeds.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Mission Control — Artemis II",
    description: "Track NASA's Artemis II mission to the Moon in real time.",
    type: "website",
    url: "https://mission.galaxyco.ai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
