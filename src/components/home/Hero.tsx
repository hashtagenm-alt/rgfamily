"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Hero.module.css";

/**
 * 배너 타입 정의
 * - image: 이미지 배너
 * - text: 텍스트 기반 배너 (기존 RG FAMILY 로고)
 */
type Banner = {
  id: string;
  type: "image" | "text";
  src?: string; // 이미지 배너용
  alt?: string;
  title?: string; // 텍스트 배너용
  subtitle?: string;
};

/**
 * 배너 목록 - 여기에 배너 추가 가능
 */
const banners: Banner[] = [
  {
    id: "banner-image-1",
    type: "image",
    src: "/images/banner.png",
    alt: "RG FAMILY",
  },
  {
    id: "banner-text-1",
    type: "text",
    title: "RG FAMILY",
    subtitle: "OFFICIAL FAN COMMUNITY",
  },
  // 새 배너 추가 예시:
  // {
  //   id: "banner-image-2",
  //   type: "image",
  //   src: "/images/banner2.png",
  //   alt: "새 배너",
  // },
];

const SLIDE_INTERVAL = 5000; // 5초마다 전환

/**
 * Hero - 홈페이지 메인 배너 슬라이더
 */
export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // 자동 슬라이드
  useEffect(() => {
    if (isPaused || banners.length <= 1) return;

    const interval = setInterval(nextSlide, SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const currentBanner = banners[currentIndex];

  return (
    <section
      className={styles.hero}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.container}>
        <AnimatePresence mode="wait">
          {currentBanner.type === "image" ? (
            <motion.div
              key={currentBanner.id}
              className={styles.imageWrapper}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Image
                src={currentBanner.src!}
                alt={currentBanner.alt || "배너"}
                fill
                priority
                className={styles.bannerImage}
                sizes="100vw"
              />
            </motion.div>
          ) : (
            <motion.div
              key={currentBanner.id}
              className={styles.textBanner}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
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
                  <p className={styles.logoSubtitle}>
                    {currentBanner.subtitle}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
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
      </div>
    </section>
  );
}
