"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pin, ChevronRight } from "lucide-react";
import { useSupabaseContext } from "@/lib/context";
import styles from "./Notice.module.css";

interface NoticeItem {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  thumbnailUrl: string | null;
}

export default function Notice() {
  const supabase = useSupabaseContext();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotices = useCallback(async () => {
    const { data, error } = await supabase
      .from("notices")
      .select("id, title, content, is_pinned, created_at, thumbnail_url")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2);

    if (error) {
      console.error("공지사항 로드 실패:", error);
    } else {
      setNotices(
        (data || []).map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content || "",
          isPinned: n.is_pinned,
          createdAt: n.created_at,
          thumbnailUrl: n.thumbnail_url,
        }))
      );
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      await fetchNotices();
    };
    init();
  }, [fetchNotices]);

  const getPreviewLines = (content: string, maxLines: number = 2) => {
    return content.split("\n").slice(0, maxLines);
  };

  if (isLoading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h3>
            <span className={styles.rgIcon}>RG</span>
            전체 공지 (NOTICE)
          </h3>
          <div className={styles.line} />
        </div>
        <div className={styles.loading}>로딩 중...</div>
      </section>
    );
  }

  if (notices.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h3>
            <span className={styles.rgIcon}>RG</span>
            전체 공지 (NOTICE)
          </h3>
          <div className={styles.line} />
        </div>
        <div className={styles.empty}>등록된 공지사항이 없습니다</div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3>
          <span className={styles.rgIcon}>RG</span>
          전체 공지 (NOTICE)
        </h3>
        <div className={styles.line} />
        <Link href="/notice" className={styles.viewAll}>
          전체보기 <ChevronRight size={16} />
        </Link>
      </div>

      <div className={styles.list}>
        {notices.map((notice) => (
          <Link
            key={notice.id}
            href={`/notice/${notice.id}`}
            className={styles.item}
          >
            {notice.isPinned && (
              <div className={styles.pinBadge}>
                <Pin size={14} className={styles.pin} />
              </div>
            )}
            {/* Thumbnail - Left */}
            {notice.thumbnailUrl ? (
              <div className={styles.itemThumbnail}>
                <Image
                  src={notice.thumbnailUrl}
                  alt={notice.title}
                  fill
                  sizes="64px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            ) : (
              <div className={styles.itemLogo}>
                <Image
                  src="/assets/logo/rg_logo_flat.png"
                  alt="RG"
                  width={48}
                  height={48}
                  style={{
                    objectFit: "contain",
                    filter: "brightness(0) invert(1)",
                  }}
                />
              </div>
            )}
            {/* Content - Right */}
            <div className={styles.itemContent}>
              <span
                className={`${styles.tag} ${notice.isPinned ? styles.tagPinned : ""}`}
                style={{
                  color: notice.isPinned
                    ? "var(--color-primary-deep)"
                    : "var(--text-muted)",
                }}
              >
                {notice.isPinned ? "중요 공지" : "전체 공지"}
              </span>
              <div className={styles.content}>
                {getPreviewLines(notice.content).map((line, idx) => (
                  <p key={idx}>{line || "\u00A0"}</p>
                ))}
              </div>
              <span className={styles.more}>자세히 보기</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
