import './globals.css';
import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import Providers from './providers';

// Initialize the JetBrains Mono font
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

// Metadata for the application
export const metadata: Metadata = {
  title: 'Personal Finance',
  description: 'Monitor your finances seamlessly with your bank account and manage them to your liking',
  openGraph: {
    title: 'Personal Finance',
    description: 'Monitor your finances seamlessly with your bank account and manage them to your liking',
    images: [
      {
        url: '/personalFinanceLogo.png',
        width: 512,
        height: 512,
        alt: 'Personal Finance Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Personal Finance',
    description: 'Monitor your finances seamlessly with your bank account and manage them to your liking',
    images: ['/personalFinanceLogo.png'],
  },
};

// Root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/public/personalFinanceLogo.png" type="image/png" />
      </head>
      <body className={jetbrainsMono.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
