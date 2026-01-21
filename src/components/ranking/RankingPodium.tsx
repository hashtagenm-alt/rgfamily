"use client";

import { Crown, Medal, Award } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { RankingItem } from "@/types/common";
import { getInitials } from "@/lib/utils";
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

  // Get animation delay class based on position
  const getDelayClass = (index: number) => {
    if (index === 0) return styles.delay1;
    if (index === 1) return styles.delay2;
    return styles.delay3;
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
              className={`${styles.podiumWrapper} ${getRankClass(rank)} ${styles.empty}`}
            >
              <div className={styles.avatar} />
              <div className={styles.rankBadge}>
                {getRankIcon(rank)}
                <span className={styles.rankNumber}>{rank}</span>
              </div>
              <div className={styles.nameCard}>
                <p className={styles.name}>-</p>
              </div>
            </div>
          );
        }

        const Content = (
          <div
            className={`${styles.podiumWrapper} ${getRankClass(rank)} ${styles.animate} ${getDelayClass(i)}`}
          >
            {/* Avatar */}
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

            {/* Rank Badge - 아바타 아래 분리 */}
            <div className={styles.rankBadge}>
              {getRankIcon(rank)}
              <span className={styles.rankNumber}>{rank}</span>
            </div>

            {/* Name Card */}
            <div className={styles.nameCard}>
              <p className={styles.name} title={item.donorName}>
                {item.donorName}
              </p>
            </div>
          </div>
        );

        // Top 3 표시 (클릭 비활성화)
        return (
          <div key={item.donorId || item.donorName} className={styles.podiumLinkDisabled}>
            {Content}
          </div>
        );
      })}
    </div>
  );
}
