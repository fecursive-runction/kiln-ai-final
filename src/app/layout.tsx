import type { Metadata } from 'next';
import { Inter, Space_Mono } from 'next/font/google';
import './globals.css';
import { DataProvider } from '@/context/DataProvider';
import { Toaster } from '@/components/ui/toaster';
import { AppShell } from '@/components/layout/app-shell';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  title: 'kiln.AI - Plant Control System',
  description: 'AI-powered cement plant production monitoring and optimization system',
  keywords: ['cement', 'manufacturing', 'AI', 'optimization', 'process control', 'SCADA'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} ${spaceMono.variable} font-sans bg-background text-foreground`}>
        <div className="grid-background fixed inset-0 z-0" />
        <div className="particle-container" />
        <DataProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </DataProvider>
      </body>
    </html>
  );
}