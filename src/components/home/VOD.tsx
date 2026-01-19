"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Play, ChevronLeft, ChevronRight, X, Video } from "lucide-react";
import { useSupabaseContext } from "@/lib/context";
import { formatShortDate } from "@/lib/utils/format";
import { getYouTubeEmbedUrl, getYouTubeThumbnail, extractYouTubeId } from "@/lib/utils/youtube";
import styles from "./VOD.module.css";

interface VodItem {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  unit: "excel" | "crew" | null;
  createdAt: string;
}

type UnitFilter = "all" | "excel" | "crew";

export default function VOD() {
  const supabase = useSupabaseContext();
  const [vods, setVods] = useState<VodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeUnit, setActiveUnit] = useState<UnitFilter>("all");
  const [selectedVideo, setSelectedVideo] = useState<VodItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const fetchVods = useCallback(async () => {
    const { data, error } = await supabase
      .from("media_content")
      .select(
        "id, title, description, video_url, thumbnail_url, unit, created_at"
      )
      .eq("content_type", "vod")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("VOD 로드 실패:", error);
    } else {
      setVods(
        (data || []).map((v) => ({
          id: v.id,
          title: v.title,
          description: v.description || "",
          videoUrl: v.video_url,
          thumbnailUrl: v.thumbnail_url || getYouTubeThumbnail(v.video_url, "hq") || "",
          unit: v.unit,
          createdAt: v.created_at,
        }))
      );
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      await fetchVods();
    };
    init();
  }, [fetchVods]);

  const handleClick = (vod: VodItem) => {
    setSelectedVideo(vod);
  };

  const closeModal = () => {
    setSelectedVideo(null);
  };

  // Filter VODs by unit
  const filteredVods = activeUnit === "all"
    ? vods
    : vods.filter((v) => v.unit === activeUnit);

  if (isLoading) {
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

  // 데이터가 없으면 플레이스홀더 표시
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
        <div className={styles.unitToggle}>
          <button
            className={`${styles.toggleBtn} ${activeUnit === "all" ? styles.active : ""}`}
            onClick={() => setActiveUnit("all")}
          >
            ALL
          </button>
          <button
            className={`${styles.toggleBtn} ${activeUnit === "excel" ? styles.active : ""}`}
            onClick={() => setActiveUnit("excel")}
          >
            EXCEL
          </button>
          <button
            className={`${styles.toggleBtn} ${styles.crewBtn} ${activeUnit === "crew" ? styles.active : ""}`}
            onClick={() => setActiveUnit("crew")}
          >
            CREW
          </button>
        </div>
        <div className={styles.line} />
        <div className={styles.arrows}>
          <button onClick={() => scroll("left")} className={styles.arrowButton}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => scroll("right")} className={styles.arrowButton}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className={styles.grid} ref={scrollRef}>
        {filteredVods.map((item) => (
          <div
            key={item.id}
            className={styles.card}
            onClick={() => handleClick(item)}
          >
            <div className={styles.thumbnail}>
              {item.thumbnailUrl ? (
                <Image
                  src={item.thumbnailUrl}
                  alt={item.title}
                  fill
                  className={styles.thumbnailImage}
                />
              ) : (
                <div className={styles.thumbnailPlaceholder} />
              )}
              <div className={styles.playOverlay}>
                <Play />
              </div>
              {item.unit && (
                <span
                  className={`${styles.unitBadge} ${
                    item.unit === "crew" ? styles.crew : ""
                  }`}
                >
                  {item.unit === "excel" ? "EXCEL" : "CREW"}
                </span>
              )}
              <div className={styles.info}>
                <span className={styles.date}>
                  {formatShortDate(item.createdAt)}
                </span>
                <span className={styles.title}>{item.title}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* YouTube Embed Modal */}
      {selectedVideo && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeModal}>
              <X size={24} />
            </button>
            <div className={styles.videoWrapper}>
              {extractYouTubeId(selectedVideo.videoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(selectedVideo.videoUrl, { autoplay: true }) || ""}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={styles.videoFrame}
                />
              ) : (
                <div className={styles.videoError}>
                  YouTube URL을 확인해주세요
                </div>
              )}
            </div>
            <div className={styles.videoInfo}>
              <div className={styles.videoMeta}>
                <h4>{selectedVideo.title}</h4>
                <span className={styles.videoDate}>
                  {formatShortDate(selectedVideo.createdAt)}
                </span>
              </div>
              {selectedVideo.unit && (
                <span className={`${styles.modalBadge} ${selectedVideo.unit === "crew" ? styles.crew : ""}`}>
                  {selectedVideo.unit.toUpperCase()}
                </span>
              )}
            </div>
            {selectedVideo.description && (
              <p className={styles.videoDesc}>{selectedVideo.description}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
