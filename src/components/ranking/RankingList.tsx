"use client";

import { motion } from "framer-motion";
import { User, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { RankingItem } from "@/types/common";
import { getInitials } from "@/lib/utils";
import styles from "./RankingList.module.css";

interface RankingListProps {
  rankings: RankingItem[];
  maxAmount?: number; // Kept for compatibility but unused
  startRank?: number;
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

export default function RankingList({
  rankings,
  startRank = 1,
}: RankingListProps) {
  const getRankClass = (rank: number) => {
    if (rank === 1) return styles.rank1;
    if (rank === 2) return styles.rank2;
    if (rank === 3) return styles.rank3;
    return "";
  };

  // 빈 상태 처리
  if (rankings.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Trophy size={48} className={styles.emptyIcon} />
        <p className={styles.emptyText}>아직 랭킹 데이터가 없습니다</p>
        <span className={styles.emptySubtext}>시즌이 시작되면 순위가 표시됩니다</span>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {/* Header Row */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>RANK</span>
        <span className={`${styles.headerTitle} ${styles.left}`}>USER</span>
        <span className={styles.headerTitle}>BADGE</span>
      </div>

      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className={styles.listContainer}
      >
        {rankings.map((item, index) => {
          const actualRank = startRank + index;

          const ItemContent = (
            <motion.div
              className={`${styles.item} ${getRankClass(actualRank)}`}
              variants={itemVariants}
            >
              {/* Rank Column */}
              <div className={styles.rank}>{actualRank}</div>

              {/* User Column */}
              <div className={styles.userSection}>
                <div className={styles.avatar}>
                  {item.avatarUrl ? (
                    <Image
                      src={item.avatarUrl}
                      alt={item.donorName}
                      fill
                      className={styles.avatarImage}
                    />
                  ) : (
                    <User size={18} className="text-gray-400 m-auto" />
                  )}
                </div>
                <span className={styles.name}>{item.donorName}</span>
              </div>

              {/* Badge Column */}
              <div className={styles.badge}>
                {/* Visual placeholder for badge, can be replaced with real badge logic */}
                <div className={styles.badgeIcon}>
                  {/* Simple circle or icon */}
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "currentColor",
                    }}
                  />
                </div>
              </div>
            </motion.div>
          );

          // 모든 순위 링크 없이 표시
          return <div key={item.donorId || index}>{ItemContent}</div>;
        })}
      </motion.div>
    </div>
  );
}
