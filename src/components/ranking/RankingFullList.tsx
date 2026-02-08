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
  limit?: number;
  /** 포디움 달성자 profile_id 목록 (VIP 페이지 링크용) */
  podiumProfileIds?: string[];
}

export default function RankingFullList({
  rankings,
  limit = 50,
  podiumProfileIds = [],
}: RankingFullListProps) {
  const displayRankings = rankings.slice(0, limit);

  // 1위 점수 (상대 프로그레스 바 계산용)
  const maxScore = displayRankings.length > 0 ? displayRankings[0].viewerScore : 1;

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

  // 순위 배지 스타일 (1-3위: 원형 배지)
  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return styles.rankBadgeGold;
    if (rank === 2) return styles.rankBadgeSilver;
    if (rank === 3) return styles.rankBadgeBronze;
    return "";
  };

  // 티어 구분선 위치 (Top 3 → Top 10 → 나머지)
  const tierBreakpoints = new Set([3, 10]);

  return (
    <div className={styles.container}>
      {/* 테이블 헤더 - 아바타 빈 공간으로 pixel-perfect 정렬 */}
      <div className={styles.tableHeader}>
        <span className={styles.headerRank}>순위</span>
        <span className={styles.headerName}>닉네임</span>
        <span className={styles.headerScore}>시청자 점수</span>
        <span className={styles.headerCount}>후원 횟수</span>
        <span className={styles.headerBj}>최다후원 BJ</span>
      </div>

      {displayRankings.map((item, index) => {
        const itemDelay = Math.min(index * 0.006, 0.3);
        const isTopRank = item.rank <= 3;
        const scorePercent = maxScore > 0 ? (item.viewerScore / maxScore) * 100 : 0;

        const Content = (
          <motion.div
            className={`${styles.item} ${getRankStyle(item.rank)} ${getTierStyle(item.rank)}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: itemDelay }}
          >
            {/* Left Border Accent */}
            <div className={styles.borderAccent} />

            {/* Relative Score Progress Bar */}
            <div
              className={styles.progressBar}
              style={{ width: `${scorePercent}%` }}
            />

            {/* Rank Number */}
            <div className={styles.rankSection}>
              {isTopRank ? (
                <span className={`${styles.rankBadge} ${getRankBadgeClass(item.rank)}`}>
                  {item.rank}
                </span>
              ) : (
                <span className={styles.rank}>{item.rank}</span>
              )}
            </div>

            {/* Avatar - 별도 그리드 컬럼 */}
            <div className={styles.avatarColumn}>
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
            </div>

            {/* Name - 별도 그리드 컬럼 */}
            <div className={styles.nameColumn}>
              <span className={styles.name}>{item.donorName}</span>
            </div>

            {/* 시청자 점수 - 별도 컬럼 */}
            <div className={styles.scoreColumn}>
              <span className={styles.viewerScore}>
                {item.viewerScore.toLocaleString()}
              </span>
              <span className={styles.scoreUnit}>점</span>
            </div>

            {/* 후원 횟수 - 별도 컬럼 */}
            <div className={styles.countColumn}>
              {item.donationCount > 0 ? (
                <span className={styles.donationCount}>
                  {item.donationCount}회
                </span>
              ) : (
                <span className={styles.topBjEmpty}>-</span>
              )}
            </div>

            {/* 최애 BJ - 별도 컬럼 */}
            <div className={styles.bjColumn}>
              {item.topBj ? (
                <span className={styles.topBjName}>{item.topBj}</span>
              ) : (
                <span className={styles.topBjEmpty}>-</span>
              )}
            </div>

            {/* Hover Arrow */}
            <div className={styles.hoverArrow}>
              <ChevronRight size={16} />
            </div>
          </motion.div>
        );

        // 티어 구분선 + 아이템 래핑
        const showDivider = tierBreakpoints.has(item.rank - 1) && item.rank > 1;

        // VIP 페이지가 있는 경우 (avatar_url + VIP rewards 모두 있어야 클릭 가능)
        const hasVipPage = item.donorId && item.avatarUrl && item.hasVipRewards;

        const wrappedContent = hasVipPage ? (
          <Link
            key={`${item.donorName}-${index}`}
            href={`/ranking/vip/${item.donorId}`}
            className={styles.vipLink}
          >
            {Content}
          </Link>
        ) : (
          <div key={`${item.donorName}-${index}`} className={styles.noLink}>
            {Content}
          </div>
        );

        if (showDivider) {
          return (
            <div key={`${item.donorName}-${index}`}>
              <div className={styles.tierDivider} />
              {hasVipPage ? (
                <Link
                  href={`/ranking/vip/${item.donorId}`}
                  className={styles.vipLink}
                >
                  {Content}
                </Link>
              ) : (
                <div className={styles.noLink}>
                  {Content}
                </div>
              )}
            </div>
          );
        }

        return wrappedContent;
      })}
    </div>
  );
}
