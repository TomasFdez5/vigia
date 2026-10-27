import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { geistMono, geistSans } from './geist';
import './globals.css';

export { viewport } from './viewport';

export const metadata: Metadata = {
  title: 'Vigía',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
