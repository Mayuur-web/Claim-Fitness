import { Sora, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata = {
  title: 'Claimr — Claim Your Ground',
  description: 'Mobile-first real-world territory turf-war game powered by walking and running.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Claimr',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B0F14',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sora.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg text-text antialiased overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}

