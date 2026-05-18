import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flo Vis',
  description: 'Mermaid-first diagram workspace'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

