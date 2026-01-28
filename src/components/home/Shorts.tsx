"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Film, Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getShorts } from "@/lib/actions/media";
import { getStreamThumbnailUrl } from "@/lib/cloudflare";
import type { MediaContent } from "@/types/database";
import styles from "./Shorts.module.css";

export default function Shorts() {
  const [shorts, setShorts] = useState<MediaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShort, setSelectedShort] = useState<MediaContent | null>(null);
  const [activeUnit, setActiveUnit] = useState<"all" | "excel" | "crew">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchShorts() {
      const result = await getShorts({ limit: 20 });
      if (result.data) setShorts(result.data);
      setLoading(false);
    }
    fetchShorts();
  }, []);

  const filtered =
    activeUnit === "all"
      ? shorts
      : shorts.filter((s) => s.unit === activeUnit);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const getEmbedUrl = (item: MediaContent) => {
    if (item.cloudflare_uid) {
      return `https://iframe.videodelivery.net/${item.cloudflare_uid}`;
    }
    const url = item.video_url;
    const youtubeMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\s]+)/
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
        width: 320,
        height: 568,
        fit: "crop",
      });
    }
    // YouTube 썸네일
    const youtubeMatch = item.video_url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\s]+)/
    );
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
    }
    return null;
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h3>SHORTS</h3>
          <div className={styles.line} />
        </div>
        <div className={styles.loading}>로딩 중...</div>
      </section>
    );
  }

  if (shorts.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h3>SHORTS</h3>
          <div className={styles.line} />
        </div>
        <div className={styles.placeholder}>
          <Film size={48} strokeWidth={1} />
          <span className={styles.placeholderTitle}>숏폼 콘텐츠 준비 중</span>
          <span className={styles.placeholderDesc}>
            곧 다양한 숏폼 영상으로 찾아뵙겠습니다
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3>SHORTS</h3>
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
              onClick={() => setSelectedShort(item)}
            >
              <div className={styles.thumbnail}>
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={item.title}
                    fill
                    className={styles.thumbnailImage}
                    sizes="160px"
                  />
                ) : (
                  <div className={styles.thumbnailPlaceholder} />
                )}
                <div className={styles.playOverlay}>
                  <Play />
                </div>
                <div className={styles.info}>
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
      {selectedShort && (
        <div className={styles.modal} onClick={() => setSelectedShort(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeBtn}
              onClick={() => setSelectedShort(null)}
            >
              <X size={20} />
            </button>
            <div className={styles.videoWrapper}>
              <iframe
                src={getEmbedUrl(selectedShort)}
                className={styles.videoFrame}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <div className={styles.videoInfo}>
              <h4>{selectedShort.title}</h4>
              {selectedShort.unit && (
                <span
                  className={`${styles.modalBadge} ${selectedShort.unit === "crew" ? styles.crew : ""}`}
                >
                  {selectedShort.unit === "excel" ? "EXCEL" : "CREW"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
