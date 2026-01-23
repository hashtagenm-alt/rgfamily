"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getActiveBanners } from "@/lib/actions/banners";
import AdminHeroOverlay from "./AdminHeroOverlay";
import type { Banner } from "@/types/database";
import styles from "./Hero.module.css";

const SLIDE_INTERVAL = 5000; // 5초마다 전환

// 기본 배너 (DB에 배너가 없을 때 표시)
const DEFAULT_BANNER: Banner = {
  id: 0,
  title: 'RG FAMILY',
  image_url: '/images/banner-main.png',
  link_url: null,
  display_order: 0,
  is_active: true,
  created_at: '',
  updated_at: '',
};

/**
 * Hero - 홈페이지 메인 배너 슬라이더
 *
 * Supabase에서 활성 배너를 조회하여 슬라이드로 표시
 * 관리자인 경우 인라인 편집 기능 제공
 */
export default function Hero() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 배너 조회
  const fetchBanners = useCallback(async () => {
    const result = await getActiveBanners();
    if (result.data && result.data.length > 0) {
      setBanners(result.data);
    } else {
      // DB에 배너가 없으면 기본 배너 표시
      setBanners([DEFAULT_BANNER]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const nextSlide = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // 자동 슬라이드
  useEffect(() => {
    if (isPaused || banners.length <= 1) return;

    const interval = setInterval(nextSlide, SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, banners.length]);

  // 현재 배너 인덱스가 범위를 벗어나면 리셋
  useEffect(() => {
    if (banners.length > 0 && currentIndex >= banners.length) {
      setCurrentIndex(0);
    }
  }, [banners.length, currentIndex]);

  const currentBanner = banners.length > 0 ? banners[currentIndex] : null;

  // 배너 변경 후 새로고침
  const handleBannersChanged = () => {
    fetchBanners();
  };

  // 로딩 중이거나 배너가 없을 때 폴백
  if (isLoading) {
    return (
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.textBanner}>
            <div className={styles.bannerOverlay} />
            <div className={styles.centerSection}>
              <div className={styles.logoArea}>
                <h1 className={styles.logoTitle}>
                  <span className={styles.logoTitleRG}>RG</span>
                  <span className={styles.logoTitleFamily}>FAMILY</span>
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 배너가 없을 때 기본 텍스트 배너
  if (banners.length === 0) {
    return (
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.textBanner}>
            <div className={styles.bannerOverlay} />
            <div className={styles.centerSection}>
              <motion.div
                className={styles.logoArea}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <h1 className={styles.logoTitle}>
                  <span className={styles.logoTitleRG}>RG</span>
                  <span className={styles.logoTitleFamily}>FAMILY</span>
                </h1>
                <p className={styles.logoSubtitle}>OFFICIAL FAN COMMUNITY</p>
              </motion.div>
            </div>
          </div>
          {/* 관리자 오버레이 - 배너 없어도 추가 가능 */}
          <AdminHeroOverlay
            currentBanner={null}
            onBannersChanged={handleBannersChanged}
          />
        </div>
      </section>
    );
  }

  // 배너 콘텐츠 렌더링
  const renderBannerContent = (banner: Banner) => {
    const imageContent = (
      <motion.div
        key={banner.id}
        className={styles.imageWrapper}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Image
          src={banner.image_url}
          alt={banner.title || "배너"}
          fill
          priority
          className={styles.bannerImage}
          sizes="100vw"
        />
      </motion.div>
    );

    // 링크가 있으면 Link로 감싸기
    if (banner.link_url) {
      return (
        <Link href={banner.link_url} className={styles.bannerLink}>
          {imageContent}
        </Link>
      );
    }

    return imageContent;
  };

  return (
    <section
      className={styles.hero}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.container}>
        <AnimatePresence mode="wait">
          {currentBanner && renderBannerContent(currentBanner)}
        </AnimatePresence>

        {/* 인디케이터 (배너가 2개 이상일 때만) */}
        {banners.length > 1 && (
          <div className={styles.indicators}>
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                className={`${styles.indicator} ${
                  index === currentIndex ? styles.indicatorActive : ""
                }`}
                onClick={() => goToSlide(index)}
                aria-label={`배너 ${index + 1}로 이동`}
              />
            ))}
          </div>
        )}

        {/* 관리자 오버레이 */}
        <AdminHeroOverlay
          currentBanner={currentBanner}
          onBannersChanged={handleBannersChanged}
        />
      </div>
    </section>
  );
}
