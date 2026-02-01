"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Video, Play, X, ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react";
import { getVODs, getVODParts } from "@/lib/actions/media";
import { getStreamThumbnailUrl } from "@/lib/cloudflare";
import type { MediaContent } from "@/types/database";
import styles from "./VOD.module.css";

export default function VOD() {
  const [vods, setVods] = useState<MediaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVod, setSelectedVod] = useState<MediaContent | null>(null);
  const [activeUnit, setActiveUnit] = useState<"all" | "excel" | "crew">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Multi-part playback state
  const [videoParts, setVideoParts] = useState<MediaContent[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [loadingParts, setLoadingParts] = useState(false);

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

  // Handle VOD selection with multi-part support
  const handleSelectVod = useCallback(async (item: MediaContent) => {
    setSelectedVod(item);
    setCurrentPartIndex(0);

    if (item.total_parts > 1) {
      setLoadingParts(true);
      const result = await getVODParts(item.id);
      if (result.data) {
        setVideoParts(result.data);
      }
      setLoadingParts(false);
    } else {
      setVideoParts([item]);
    }
  }, []);

  const handleCloseModal = () => {
    setSelectedVod(null);
    setVideoParts([]);
    setCurrentPartIndex(0);
  };

  const goToPart = (index: number) => {
    if (index >= 0 && index < videoParts.length) {
      setCurrentPartIndex(index);
    }
  };

  const currentPart = videoParts[currentPartIndex] || selectedVod;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
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
      // 인코딩 중에도 기본 썸네일이 표시되도록 파라미터 없이 사용
      return getStreamThumbnailUrl(item.cloudflare_uid);
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
              onClick={() => handleSelectVod(item)}
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

      {/* 재생 모달 with Multi-part Support */}
      {selectedVod && (
        <div className={styles.modal} onClick={handleCloseModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeBtn}
              onClick={handleCloseModal}
            >
              <X size={20} />
            </button>
            <div className={styles.videoWrapper}>
              {loadingParts ? (
                <div className={styles.videoLoading}>파트 로딩 중...</div>
              ) : (
                <iframe
                  key={currentPart?.cloudflare_uid || currentPart?.id}
                  src={getEmbedUrl(currentPart)}
                  className={styles.videoFrame}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              )}
            </div>

            {/* Part Navigation */}
            {videoParts.length > 1 && (
              <div className={styles.partNav}>
                <button
                  className={styles.partNavBtn}
                  onClick={() => goToPart(currentPartIndex - 1)}
                  disabled={currentPartIndex === 0}
                >
                  <SkipBack size={18} />
                  이전
                </button>

                <div className={styles.partIndicator}>
                  {videoParts.map((_, idx) => (
                    <button
                      key={idx}
                      className={`${styles.partDot} ${idx === currentPartIndex ? styles.active : ""}`}
                      onClick={() => goToPart(idx)}
                      title={`Part ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  className={styles.partNavBtn}
                  onClick={() => goToPart(currentPartIndex + 1)}
                  disabled={currentPartIndex === videoParts.length - 1}
                >
                  다음
                  <SkipForward size={18} />
                </button>
              </div>
            )}

            <div className={styles.videoInfo}>
              <div className={styles.videoMeta}>
                <h4>
                  {selectedVod.title}
                  {videoParts.length > 1 && (
                    <span className={styles.partLabel}>
                      Part {currentPartIndex + 1}/{videoParts.length}
                    </span>
                  )}
                </h4>
                <span className={styles.videoDate}>
                  {formatDate(selectedVod.created_at)}
                  {currentPart?.duration && (
                    <> · {formatDuration(currentPart.duration)}</>
                  )}
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
