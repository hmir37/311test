import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

export const metadata: Metadata = {
  title: "NYC 311 — Live Service Request Dashboard",
  description:
    "Explore live NYC 311 service requests on an interactive map. Filter by complaint type, status, borough, and more.",
  keywords: ["NYC", "311", "service requests", "dashboard", "map", "open data"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to data sources */}
        <link rel="preconnect" href="https://data.cityofnewyork.us" />
        <link rel="preconnect" href="https://basemaps.cartocdn.com" />
        {/* Inline script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="overflow-hidden">
        {children}
      </body>
    </html>
  );
}
