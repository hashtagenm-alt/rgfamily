import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "후원 랭킹 | RG FAMILY",
  description: "RG FAMILY 후원자 순위 및 명예의 전당",
  openGraph: {
    title: "후원 랭킹 | RG FAMILY",
    description: "RG FAMILY 후원자 순위 및 명예의 전당",
    type: "website",
  },
  robots: {
    index: false, // 후원 정보 외부 노출 방지
    follow: false,
  },
};

export default function RankingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
