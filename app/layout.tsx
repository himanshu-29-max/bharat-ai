import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Bharat AI',
  description: 'Bharat ka apna AI platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
