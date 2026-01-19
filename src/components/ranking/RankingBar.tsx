"use client";

import { motion } from "framer-motion";
import styles from "./RankingBar.module.css";

interface RankingBarProps {
  label: string;
  value: number;
  max: number;
  rank: number;
  color?: string;
}

export default function RankingBar({
  label,
  value,
  max,
  rank,
  color = "var(--primary)",
}: RankingBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={styles.container}>
      <div className={styles.rank}>{rank}</div>
      <div className={styles.info}>
        <div className={styles.header}>
          <span className={styles.label}>{label}</span>
          {/* 하트 개수 숨김 - 게이지바만 표시 */}
        </div>
        <div className={styles.track}>
          <motion.div
            className={styles.fill}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          />
        </div>
      </div>
    </div>
  );
}
