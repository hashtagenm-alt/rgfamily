"use client";

import { motion } from "framer-motion";
import { Crown, Medal, Award } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { RankingItem } from "@/types/common";
import { getInitials, getTributePageUrl } from "@/lib/utils";
import styles from "./RankingPodium.module.css";

interface RankingPodiumProps {
  items: RankingItem[];
}


export default function RankingPodium({ items }: RankingPodiumProps) {
  // Ensure we have 3 slots even if empty (for layout stability)
  const top3 = [
    items.find((i) => i.rank === 1) || null,
    items.find((i) => i.rank === 2) || null,
    items.find((i) => i.rank === 3) || null,
  ];

  // Reorder for Podium: 2nd (Left), 1st (Center), 3rd (Right)
  const podiumOrder = [top3[1], top3[0], top3[2]];

  const getRankClass = (rank: number) => {
    if (rank === 1) return styles.rank1;
    if (rank === 2) return styles.rank2;
    return styles.rank3;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={24} />;
    if (rank === 2) return <Medal size={20} />;
    if (rank === 3) return <Award size={20} />;
    return null;
  };

  return (
    <div className={styles.container}>
      {/* Stage Platform Line */}
      <div className={styles.stageLine} />

      {podiumOrder.map((item, i) => {
        // Correct rank based on position in array
        // i=0 -> Rank 2, i=1 -> Rank 1, i=2 -> Rank 3
        const rank = i === 1 ? 1 : i === 0 ? 2 : 3;

        if (!item) {
          // Placeholder for empty slot
          return (
            <div
              key={`empty-${rank}`}
              className={`${styles.podiumWrapper} ${getRankClass(rank)}`}
            >
              <div className={styles.cube}>
                <div className={styles.top} />
                <div className={styles.face} />
              </div>
            </div>
          );
        }

        const Content = (
          <motion.div
            className={`${styles.podiumWrapper} ${getRankClass(rank)}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            {/* Avatar Section */}
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>
                {item.avatarUrl ? (
                  <Image
                    src={item.avatarUrl}
                    alt={item.donorName}
                    fill
                    className={styles.avatarImage}
                    unoptimized
                  />
                ) : (
                  <div className={styles.initialsWrapper}>
                    <span className={styles.initials}>
                      {getInitials(item.donorName)}
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.rankBadge}>
                {getRankIcon(rank)}
                <span className={styles.rankNumber}>{rank}</span>
              </div>
            </div>

            {/* 3D Glass Cube */}
            <div className={styles.cube}>
              <div className={styles.top}>
                <div className={styles.shine} />
              </div>
              <div className={`${styles.face} ${styles.front}`}>
                <div className={styles.info}>
                  <p className={styles.name} title={item.donorName}>
                    {item.donorName}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );

        // Top 3만 개인 페이지 링크 (해시 URL 사용)
        if (item.donorId) {
          return (
            <Link
              key={item.donorId}
              href={getTributePageUrl(item.donorId)}
              style={{ display: "contents" }}
            >
              {Content}
            </Link>
          );
        }

        return (
          <div key={item.donorName} style={{ display: "contents" }}>
            {Content}
          </div>
        );
      })}
    </div>
  );
}
