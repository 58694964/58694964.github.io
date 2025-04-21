import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "移动端H5网页 - Next.js版",
  description: "响应式移动端H5网页，使用Next.js构建，支持热刷新",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
