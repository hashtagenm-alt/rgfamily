"use client";

import { motion } from "framer-motion";
import { Crown, Medal, Award, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { RankingItem } from "@/types/common";
import { getInitials } from "@/lib/utils";
import styles from "./RankingPodium.module.css";

interface RankingPodiumProps {
  items: RankingItem[];
  /** 포디움 달성자 profile_id 목록 (VIP 페이지 링크용) */
  podiumProfileIds?: string[];
}

export default function RankingPodium({ items, podiumProfileIds = [] }: RankingPodiumProps) {
  const top3 = [
    items.find((i) => i.rank === 1) || null,
    items.find((i) => i.rank === 2) || null,
    items.find((i) => i.rank === 3) || null,
  ];

  const champion = top3[0];
  const runnerUp = top3[1];
  const thirdPlace = top3[2];

  // 애니메이션 variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const championVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.85 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 80,
        damping: 12,
        delay: 0.2,
      },
    },
  };

  const getRankConfig = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: Crown,
          label: "1ST",
          colorClass: styles.gold,
          glowClass: styles.goldGlow,
          borderClass: "border-yellow-500/40",
          textClass: "text-yellow-400",
          bgClass: "bg-yellow-500/5",
        };
      case 2:
        return {
          icon: Medal,
          label: "2ND",
          colorClass: styles.silver,
          glowClass: styles.silverGlow,
          borderClass: "border-zinc-400/30",
          textClass: "text-zinc-300",
          bgClass: "bg-zinc-400/5",
        };
      case 3:
        return {
          icon: Award,
          label: "3RD",
          colorClass: styles.bronze,
          glowClass: styles.bronzeGlow,
          borderClass: "border-orange-600/30",
          textClass: "text-orange-400",
          bgClass: "bg-orange-500/5",
        };
      default:
        return {
          icon: Award,
          label: `${rank}TH`,
          colorClass: "",
          glowClass: "",
          borderClass: "border-zinc-700",
          textClass: "text-zinc-400",
          bgClass: "bg-zinc-800/50",
        };
    }
  };

  const renderCard = (
    item: RankingItem | null,
    rank: number,
    isChampion: boolean = false
  ) => {
    if (!item) {
      return (
        <div className={`${styles.emptyCard} ${isChampion ? styles.championEmpty : ""}`}>
          <div className={styles.emptyAvatar} />
          <span className={styles.emptyText}>-</span>
        </div>
      );
    }

    const config = getRankConfig(rank);
    const Icon = config.icon;
    const hasVipPage = item.donorId && podiumProfileIds.includes(item.donorId);

    const CardContent = (
      <motion.div
        className={`
          ${styles.card}
          ${isChampion ? styles.championCard : styles.runnerCard}
          ${config.colorClass}
        `}
        variants={isChampion ? championVariants : cardVariants}
        whileHover={{
          scale: isChampion ? 1.03 : 1.05,
          y: -8,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* 배경 글로우 효과 */}
        <div className={`${styles.cardGlow} ${config.glowClass}`} />

        {/* 상단 랭크 라벨 */}
        <div className={`${styles.rankLabel} ${config.textClass}`}>
          <Icon className={isChampion ? "w-5 h-5" : "w-4 h-4"} />
          <span>{config.label}</span>
        </div>

        {/* 아바타 영역 */}
        <div className={`${styles.avatarWrapper} ${isChampion ? styles.championAvatar : ""}`}>
          <div className={`${styles.avatarRing} ${config.colorClass}`}>
            {item.avatarUrl ? (
              <Image
                src={item.avatarUrl}
                alt={item.donorName}
                fill
                className="object-cover rounded-full"
              />
            ) : (
              <div className={styles.initialsWrapper}>
                <span className={`${styles.initials} ${config.textClass}`}>
                  {getInitials(item.donorName)}
                </span>
              </div>
            )}
          </div>

          {/* 1위 전용 스파클 효과 */}
          {isChampion && (
            <motion.div
              className={styles.sparkleEffect}
              animate={{
                rotate: 360,
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <Sparkles className="w-6 h-6 text-yellow-400/60" />
            </motion.div>
          )}
        </div>

        {/* 닉네임 */}
        <div className={styles.nameSection}>
          <h3 className={`${styles.name} ${isChampion ? styles.championName : ""}`}>
            {item.donorName}
          </h3>

          {/* VIP 인디케이터 */}
          {hasVipPage && (
            <div className={styles.vipIndicator}>
              <span>VIP</span>
            </div>
          )}
        </div>

        {/* 하단 장식 라인 */}
        <div className={`${styles.bottomLine} ${config.colorClass}`} />
      </motion.div>
    );

    if (hasVipPage) {
      return (
        <Link
          href={`/ranking/vip/${item.donorId}`}
          className={styles.cardLink}
        >
          {CardContent}
        </Link>
      );
    }

    return <div className={styles.cardWrapper}>{CardContent}</div>;
  };

  return (
    <motion.div
      className={styles.container}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 섹션 타이틀 */}
      <motion.div
        className={styles.sectionHeader}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className={styles.titleWrapper}>
          <Crown className="w-6 h-6 text-yellow-400" />
          <h2 className={styles.title}>TOP 3 SUPPORTERS</h2>
          <Crown className="w-6 h-6 text-yellow-400" />
        </div>
        <p className={styles.subtitle}>RG Family를 빛내주시는 분들</p>
      </motion.div>

      {/* 포디움 그리드 */}
      <div className={styles.podiumGrid}>
        {/* 2등 - 왼쪽 */}
        <motion.div
          className={styles.runnerUpSlot}
          variants={cardVariants}
        >
          {renderCard(runnerUp, 2)}
        </motion.div>

        {/* 1등 - 중앙 (가장 큼) */}
        <motion.div
          className={styles.championSlot}
          variants={championVariants}
        >
          {renderCard(champion, 1, true)}
        </motion.div>

        {/* 3등 - 오른쪽 */}
        <motion.div
          className={styles.thirdSlot}
          variants={cardVariants}
        >
          {renderCard(thirdPlace, 3)}
        </motion.div>
      </div>

      {/* 하단 장식 */}
      <motion.div
        className={styles.bottomDecoration}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      />
    </motion.div>
  );
}
