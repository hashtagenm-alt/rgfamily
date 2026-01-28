"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Video, Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getVODs } from "@/lib/actions/media";
import { getStreamThumbnailUrl } from "@/lib/cloudflare";
import type { MediaContent } from "@/types/database";
import styles from "./VOD.module.css";

export default function VOD() {
  const [vods, setVods] = useState<MediaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVod, setSelectedVod] = useState<MediaContent | null>(null);
  const [activeUnit, setActiveUnit] = useState<"all" | "excel" | "crew">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchVods() {
      const result = await getVODs({ limit: 20 });
      if (result.data) setVods(result.data);
      setLoading(false);
    }
    fetchVods();
  }, []);

  const filtered =
    activeUnit === "all"
      ? vods
      : vods.filter((v) => v.unit === activeUnit);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -560 : 560;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const getEmbedUrl = (item: MediaContent) => {
    if (item.cloudflare_uid) {
      return `https://iframe.videodelivery.net/${item.cloudflare_uid}`;
    }
    const url = item.video_url;
    const youtubeMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/
    );
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    return url;
  };

  const getThumbnail = (item: MediaContent) => {
    if (item.thumbnail_url) return item.thumbnail_url;
    if (item.cloudflare_uid) {
      return getStreamThumbnailUrl(item.cloudflare_uid, {
        width: 560,
        height: 315,
        fit: "crop",
      });
    }
    const youtubeMatch = item.video_url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/
    );
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
    }
    return null;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h3>VOD</h3>
          <div className={styles.line} />
        </div>
        <div className={styles.loading}>로딩 중...</div>
      </section>
    );
  }

  if (vods.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h3>VOD</h3>
          <div className={styles.line} />
        </div>
        <div className={styles.placeholder}>
          <Video size={48} strokeWidth={1} />
          <span className={styles.placeholderTitle}>VOD 콘텐츠 준비 중</span>
          <span className={styles.placeholderDesc}>
            곧 다양한 VOD 영상으로 찾아뵙겠습니다
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3>VOD</h3>
        <div className={styles.line} />
        <div className={styles.unitToggle}>
          {(["all", "excel", "crew"] as const).map((unit) => (
            <button
              key={unit}
              className={`${styles.toggleBtn} ${activeUnit === unit ? styles.active : ""} ${unit === "crew" ? styles.crewBtn : ""}`}
              onClick={() => setActiveUnit(unit)}
            >
              {unit === "all" ? "전체" : unit === "excel" ? "EXCEL" : "CREW"}
            </button>
          ))}
        </div>
        <div className={styles.arrows}>
          <button className={styles.arrowButton} onClick={() => scroll("left")}>
            <ChevronLeft size={16} />
          </button>
          <button className={styles.arrowButton} onClick={() => scroll("right")}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className={styles.grid} ref={scrollRef}>
        {filtered.map((item) => {
          const thumb = getThumbnail(item);
          return (
            <div
              key={item.id}
              className={styles.card}
              onClick={() => setSelectedVod(item)}
            >
              <div className={styles.thumbnail}>
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={item.title}
                    fill
                    className={styles.thumbnailImage}
                    sizes="280px"
                  />
                ) : (
                  <div className={styles.thumbnailPlaceholder} />
                )}
                <div className={styles.playOverlay}>
                  <Play />
                </div>
                <div className={styles.info}>
                  <span className={styles.date}>{formatDate(item.created_at)}</span>
                  <span className={styles.title}>{item.title}</span>
                </div>
                {item.unit && (
                  <span
                    className={`${styles.unitBadge} ${item.unit === "crew" ? styles.crew : ""}`}
                  >
                    {item.unit === "excel" ? "EXCEL" : "CREW"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 재생 모달 */}
      {selectedVod && (
        <div className={styles.modal} onClick={() => setSelectedVod(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeBtn}
              onClick={() => setSelectedVod(null)}
            >
              <X size={20} />
            </button>
            <div className={styles.videoWrapper}>
              <iframe
                src={getEmbedUrl(selectedVod)}
                className={styles.videoFrame}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <div className={styles.videoInfo}>
              <div className={styles.videoMeta}>
                <h4>{selectedVod.title}</h4>
                <span className={styles.videoDate}>
                  {formatDate(selectedVod.created_at)}
                </span>
              </div>
              {selectedVod.unit && (
                <span
                  className={`${styles.modalBadge} ${selectedVod.unit === "crew" ? styles.crew : ""}`}
                >
                  {selectedVod.unit === "excel" ? "EXCEL" : "CREW"}
                </span>
              )}
            </div>
            {selectedVod.description && (
              <p className={styles.videoDesc}>{selectedVod.description}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
