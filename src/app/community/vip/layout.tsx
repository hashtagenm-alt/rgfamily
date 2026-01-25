import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VIP 라운지 | RG FAMILY",
  description: "RG FAMILY Top 50 VIP 전용 프리미엄 커뮤니티 공간.",
  openGraph: {
    title: "VIP 라운지 | RG FAMILY",
    description: "Top 50 VIP 전용 공간",
    type: "website",
  },
  robots: {
    index: false, // VIP 전용 콘텐츠 외부 노출 방지
    follow: false,
  },
};

export default function VipBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
