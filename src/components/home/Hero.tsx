"use client";

import { motion } from "framer-motion";
import styles from "./Hero.module.css";

/**
 * Hero - 홈페이지 메인 배너
 * 린아 이미지 양쪽 + RG FAMILY 로고 가운데 배치
 * 레퍼런스: MOONA DOA 스타일
 */
export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        {/* 배경 오버레이 */}
        <div className={styles.bannerOverlay} />

        {/* 가운데 로고 영역 */}
        <div className={styles.centerSection}>
          <motion.div
            className={styles.logoArea}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* 텍스트 전용 타이포 */}

            {/* 로고 텍스트 */}
            <h1 className={styles.logoTitle}>
              <span className={styles.logoTitleRG}>RG</span>
              <span className={styles.logoTitleFamily}>FAMILY</span>
            </h1>
            <p className={styles.logoSubtitle}>OFFICIAL FAN COMMUNITY</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
