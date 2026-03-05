import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ThemeSync } from '@/components/ThemeSync';
import { AuthProvider } from '@/components/AuthProvider';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'mockIt — AI UI/UX Generator',
  description: 'Generate, preview, and edit AI-powered UI screens on an infinite canvas. Like Cursor, but for UI design.',
  keywords: ['AI', 'UI generator', 'UX', 'design tool', 'mockIt'],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeSync />
        <AuthProvider>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </AuthProvider>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1e1e2e',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'white',
            },
          }}
        />
      </body>
    </html>
  );
}