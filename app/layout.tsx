import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "营养与价格记录",
  description: "个人商品营养、价格历史、促销活动与好价判断工具。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
