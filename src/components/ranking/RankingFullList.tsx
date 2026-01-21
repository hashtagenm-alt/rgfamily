"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { RankingItem } from "@/types/common";
import { getInitials } from "@/lib/utils";
import styles from "./RankingFullList.module.css";

interface RankingFullListProps {
  rankings: RankingItem[];
  maxAmount: number;
  limit?: number;
  /** 포디움 달성자 profile_id 목록 (VIP 페이지 링크용) */
  podiumProfileIds?: string[];
}

export default function RankingFullList({
  rankings,
  maxAmount,
  limit = 50,
  podiumProfileIds = [],
}: RankingFullListProps) {
  const displayRankings = rankings.slice(0, limit);

  const getPercentage = (amount: number) => {
    return maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  };

  // 티어별 스타일 분류
  const getTierStyle = (rank: number) => {
    if (rank === 1) return styles.champion;
    if (rank === 2 || rank === 3) return styles.elite;
    if (rank <= 10) return styles.top10;
    if (rank <= 20) return styles.rising;
    return styles.standard;
  };

  // 레거시 함수 유지
  const getRankStyle = (rank: number) => {
    if (rank === 1) return styles.gold;
    if (rank === 2 || rank === 3) return styles.elite;
    if (rank <= 10) return styles.top10;
    return "";
  };

  return (
    <div className={styles.container}>
      {displayRankings.map((item, index) => {
        const percentage = getPercentage(item.totalAmount);

        const Content = (
          <motion.div
            className={`${styles.item} ${getRankStyle(item.rank)} ${getTierStyle(item.rank)}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.02 }}
          >
            {/* Left Border Accent */}
            <div className={styles.borderAccent} />

            {/* Rank Number */}
            <div className={styles.rankSection}>
              <span className={styles.rank}>{item.rank}</span>
            </div>

            {/* Avatar - 화려한 이니셜 표시 */}
            <div className={styles.avatar}>
              {item.avatarUrl ? (
                <Image
                  src={item.avatarUrl}
                  alt={item.donorName}
                  fill
                  className={styles.avatarImage}
                />
              ) : (
                <span className={styles.initials}>
                  {getInitials(item.donorName, { koreanMax: 1 })}
                </span>
              )}
            </div>

            {/* User Info */}
            <div className={styles.infoSection}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{item.donorName}</span>
              </div>

              {/* Gauge Bar with Glow Dot */}
              <div className={styles.gaugeContainer}>
                <motion.div
                  className={styles.gaugeFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.02 + 0.2 }}
                >
                  {item.rank === 1 && <span className={styles.gaugeGlowDot} />}
                </motion.div>
                {item.rank <= 3 && (
                  <motion.div
                    className={styles.gaugeGlow}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.02 + 0.2 }}
                  />
                )}
              </div>
            </div>

            {/* Hover Arrow */}
            <div className={styles.hoverArrow}>
              <ChevronRight size={18} />
            </div>
          </motion.div>
        );

        // VIP 페이지가 있는 경우 (포디움 달성자) 클릭 가능
        const hasVipPage = item.donorId && podiumProfileIds.includes(item.donorId);

        if (hasVipPage) {
          return (
            <Link
              key={`${item.donorName}-${index}`}
              href={`/ranking/vip/${item.donorId}`}
              className={styles.vipLink}
            >
              {Content}
            </Link>
          );
        }

        // VIP 페이지가 없으면 링크 없이 표시
        return (
          <div key={`${item.donorName}-${index}`} className={styles.noLink}>
            {Content}
          </div>
        );
      })}
    </div>
  );
}
