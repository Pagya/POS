import './globals.css';
import Script from 'next/script';

export const metadata = { title: 'Commerce OS' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-717TQPBNBB"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-717TQPBNBB');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
