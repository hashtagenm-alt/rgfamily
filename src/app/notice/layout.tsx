import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공지사항 | RG FAMILY",
  description: "RG FAMILY 공식 공지사항. 이벤트, 업데이트, 안내 등 최신 소식을 확인하세요.",
  openGraph: {
    title: "공지사항 | RG FAMILY",
    description: "RG FAMILY 공식 공지사항",
    type: "website",
  },
};

export default function NoticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
