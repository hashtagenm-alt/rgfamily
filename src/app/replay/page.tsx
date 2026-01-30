"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Video, Film, Play, X, ArrowLeft,
  SkipBack, SkipForward, Home
} from "lucide-react";
import { getVODs, getShorts, getVODParts } from "@/lib/actions/media";
import { getStreamThumbnailUrl } from "@/lib/cloudflare";
import Footer from "@/components/Footer";
import type { MediaContent } from "@/types/database";
import styles from "./page.module.css";

type TabType = "all" | "vod" | "shorts";
type UnitType = "all" | "excel" | "crew";

function ReplayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as TabType | null;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>(tabParam || "all");
  const [activeUnit, setActiveUnit] = useState<UnitType>("all");
  const [vods, setVods] = useState<MediaContent[]>([]);
  const [shorts, setShorts] = useState<MediaContent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Multi-part playback state
  const [selectedMedia, setSelectedMedia] = useState<MediaContent | null>(null);
  const [videoParts, setVideoParts] = useState<MediaContent[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [loadingParts, setLoadingParts] = useState(false);

  // Pagination
  const [vodPage, setVodPage] = useState(1);
  const [shortsPage, setShortsPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    async function fetchMedia() {
      setLoading(true);
      const [vodResult, shortsResult] = await Promise.all([
        getVODs({ limit: 100 }),
        getShorts({ limit: 100 }),
      ]);

      if (vodResult.data) setVods(vodResult.data);
      if (shortsResult.data) setShorts(shortsResult.data);
      setLoading(false);
    }
    fetchMedia();
  }, []);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleSelectMedia = useCallback(async (item: MediaContent) => {
    setSelectedMedia(item);
    setCurrentPartIndex(0);

    if (item.content_type === "vod" && item.total_parts > 1) {
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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin.includes("videodelivery.net") || event.origin.includes("cloudflarestream.com")) {
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data.event === "ended" && videoParts.length > 1 && currentPartIndex < videoParts.length - 1) {
            setCurrentPartIndex(prev => prev + 1);
          }
        } catch {
          // Not JSON or not our message
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [videoParts, currentPartIndex]);

  const handleCloseModal = () => {
    setSelectedMedia(null);
    setVideoParts([]);
    setCurrentPartIndex(0);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setVodPage(1);
    setShortsPage(1);
    router.push(`/replay${tab !== "all" ? `?tab=${tab}` : ""}`, { scroll: false });
  };

  const goToPart = (index: number) => {
    if (index >= 0 && index < videoParts.length) {
      setCurrentPartIndex(index);
    }
  };

  const filteredVods = activeUnit === "all"
    ? vods
    : vods.filter(v => v.unit === activeUnit);

  const filteredShorts = activeUnit === "all"
    ? shorts
    : shorts.filter(s => s.unit === activeUnit);

  const paginatedVods = filteredVods.slice(0, vodPage * ITEMS_PER_PAGE);
  const paginatedShorts = filteredShorts.slice(0, shortsPage * ITEMS_PER_PAGE);

  const currentPart = videoParts[currentPartIndex] || selectedMedia;

  const getEmbedUrl = (item: MediaContent | null) => {
    if (!item) return "";
    if (item.cloudflare_uid) {
      const autoplay = currentPartIndex > 0 ? "&autoplay=true" : "";
      return `https://iframe.videodelivery.net/${item.cloudflare_uid}?preload=metadata${autoplay}`;
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

  const getThumbnail = (item: MediaContent, isVertical = false) => {
    if (item.thumbnail_url) return item.thumbnail_url;
    if (item.cloudflare_uid) {
      return getStreamThumbnailUrl(item.cloudflare_uid, isVertical ? {
        width: 320,
        height: 568,
        fit: "crop",
      } : {
        width: 480,
        height: 270,
        fit: "crop",
      });
    }
    const youtubeMatch = item.video_url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\s]+)/
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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}시간 ${mins}분`;
    return `${mins}분`;
  };

  return (
    <div className={styles.main}>
      {/* Navigation */}
      <nav className={styles.pageNav}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>홈</span>
        </Link>
        <div className={styles.navTabs}>
          <button
            onClick={() => handleTabChange("all")}
            className={`${styles.navTab} ${activeTab === "all" ? styles.active : ""}`}
          >
            <Home size={16} />
            <span>전체</span>
          </button>
          <button
            onClick={() => handleTabChange("vod")}
            className={`${styles.navTab} ${activeTab === "vod" ? styles.active : ""}`}
          >
            <Video size={16} />
            <span>VOD</span>
          </button>
          <button
            onClick={() => handleTabChange("shorts")}
            className={`${styles.navTab} ${activeTab === "shorts" ? styles.active : ""}`}
          >
            <Film size={16} />
            <span>SHORTS</span>
          </button>
        </div>
      </nav>

      {/* Page Header */}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>다시보기</h1>
        <p className={styles.pageDesc}>VOD 풀영상과 숏폼 하이라이트를 감상하세요</p>

        {/* Unit Filter */}
        <div className={styles.unitFilter}>
          {(["all", "excel", "crew"] as const).map((unit) => (
            <button
              key={unit}
              className={`${styles.unitBtn} ${activeUnit === unit ? styles.active : ""} ${unit === "crew" ? styles.crew : ""}`}
              onClick={() => setActiveUnit(unit)}
            >
              {unit === "all" ? "전체" : unit === "excel" ? "EXCEL" : "CREW"}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>로딩 중...</div>
        ) : (
          <>
            {/* VOD Section */}
            {(activeTab === "all" || activeTab === "vod") && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Video size={20} />
                  <h2>VOD 풀영상</h2>
                  <span className={styles.count}>{filteredVods.length}개</span>
                </div>

                {filteredVods.length === 0 ? (
                  <div className={styles.empty}>
                    <Video size={48} strokeWidth={1} />
                    <span>VOD 콘텐츠가 없습니다</span>
                  </div>
                ) : (
                  <>
                    <div className={styles.vodGrid}>
                      {paginatedVods.map((item) => {
                        const thumb = getThumbnail(item);
                        return (
                          <div
                            key={item.id}
                            className={styles.vodCard}
                            onClick={() => handleSelectMedia(item)}
                          >
                            <div className={styles.vodThumbnail}>
                              {thumb ? (
                                <Image
                                  src={thumb}
                                  alt={item.title}
                                  fill
                                  className={styles.thumbnailImage}
                                  sizes="(max-width: 768px) 100vw, 320px"
                                />
                              ) : (
                                <div className={styles.thumbnailPlaceholder}>
                                  <Video size={32} />
                                </div>
                              )}
                              <div className={styles.playOverlay}>
                                <Play size={40} />
                              </div>
                              {item.unit && (
                                <span className={`${styles.badge} ${item.unit === "crew" ? styles.crew : ""}`}>
                                  {item.unit === "excel" ? "EXCEL" : "CREW"}
                                </span>
                              )}
                              {item.total_parts > 1 && (
                                <span className={styles.partsBadge}>
                                  {item.total_parts}파트
                                </span>
                              )}
                            </div>
                            <div className={styles.vodInfo}>
                              <h3>{item.title}</h3>
                              <span className={styles.date}>{formatDate(item.created_at)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {paginatedVods.length < filteredVods.length && (
                      <button
                        className={styles.loadMore}
                        onClick={() => setVodPage(p => p + 1)}
                      >
                        더보기 ({paginatedVods.length} / {filteredVods.length})
                      </button>
                    )}
                  </>
                )}
              </section>
            )}

            {/* Shorts Section */}
            {(activeTab === "all" || activeTab === "shorts") && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Film size={20} />
                  <h2>SHORTS 숏폼</h2>
                  <span className={styles.count}>{filteredShorts.length}개</span>
                </div>

                {filteredShorts.length === 0 ? (
                  <div className={styles.empty}>
                    <Film size={48} strokeWidth={1} />
                    <span>숏폼 콘텐츠가 없습니다</span>
                  </div>
                ) : (
                  <>
                    <div className={styles.shortsGrid}>
                      {paginatedShorts.map((item) => {
                        const thumb = getThumbnail(item, true);
                        return (
                          <div
                            key={item.id}
                            className={styles.shortCard}
                            onClick={() => handleSelectMedia(item)}
                          >
                            <div className={styles.shortThumbnail}>
                              {thumb ? (
                                <Image
                                  src={thumb}
                                  alt={item.title}
                                  fill
                                  className={styles.thumbnailImage}
                                  sizes="(max-width: 768px) 50vw, 200px"
                                />
                              ) : (
                                <div className={styles.thumbnailPlaceholder}>
                                  <Film size={32} />
                                </div>
                              )}
                              <div className={styles.playOverlay}>
                                <Play size={32} />
                              </div>
                              {item.unit && (
                                <span className={`${styles.badge} ${item.unit === "crew" ? styles.crew : ""}`}>
                                  {item.unit === "excel" ? "EXCEL" : "CREW"}
                                </span>
                              )}
                              <div className={styles.shortInfo}>
                                <span className={styles.shortTitle}>{item.title}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {paginatedShorts.length < filteredShorts.length && (
                      <button
                        className={styles.loadMore}
                        onClick={() => setShortsPage(p => p + 1)}
                      >
                        더보기 ({paginatedShorts.length} / {filteredShorts.length})
                      </button>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <Footer />

      {/* Video Modal with Multi-part Support */}
      {selectedMedia && (
        <div className={styles.modal} onClick={handleCloseModal}>
          <div
            className={`${styles.modalContent} ${selectedMedia.content_type === "shorts" ? styles.vertical : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeBtn} onClick={handleCloseModal}>
              <X size={24} />
            </button>

            <div className={styles.videoWrapper}>
              {loadingParts ? (
                <div className={styles.videoLoading}>파트 로딩 중...</div>
              ) : (
                <iframe
                  ref={iframeRef}
                  key={currentPart?.cloudflare_uid || currentPart?.id}
                  src={getEmbedUrl(currentPart)}
                  className={styles.videoFrame}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              )}
            </div>

            {videoParts.length > 1 && (
              <div className={styles.partNav}>
                <button
                  className={styles.partNavBtn}
                  onClick={() => goToPart(currentPartIndex - 1)}
                  disabled={currentPartIndex === 0}
                >
                  <SkipBack size={20} />
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
                  <SkipForward size={20} />
                </button>
              </div>
            )}

            <div className={styles.videoMeta}>
              <h3>
                {selectedMedia.title}
                {videoParts.length > 1 && (
                  <span className={styles.partLabel}>
                    Part {currentPartIndex + 1}/{videoParts.length}
                  </span>
                )}
              </h3>
              <div className={styles.metaRow}>
                <span className={styles.date}>{formatDate(selectedMedia.created_at)}</span>
                {currentPart?.duration && (
                  <span className={styles.duration}>{formatDuration(currentPart.duration)}</span>
                )}
                {selectedMedia.unit && (
                  <span className={`${styles.badge} ${selectedMedia.unit === "crew" ? styles.crew : ""}`}>
                    {selectedMedia.unit === "excel" ? "EXCEL" : "CREW"}
                  </span>
                )}
              </div>
              {selectedMedia.description && (
                <p className={styles.description}>{selectedMedia.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReplayPage() {
  return (
    <Suspense fallback={<div className={styles.main}><div className={styles.loading}>로딩 중...</div></div>}>
      <ReplayContent />
    </Suspense>
  );
}
