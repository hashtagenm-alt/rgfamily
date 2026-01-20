"use client";

import { Video } from "lucide-react";
import styles from "./VOD.module.css";

// 플레이스홀더 모드: 항상 준비 중 표시
export default function VOD() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3>VOD</h3>
        <div className={styles.line} />
      </div>
      <div className={styles.placeholder}>
        <Video size={48} strokeWidth={1} />
        <span className={styles.placeholderTitle}>VOD 콘텐츠 준비 중</span>
        <span className={styles.placeholderDesc}>
          곧 다양한 VOD 영상으로 찾아뵙겠습니다
        </span>
      </div>
    </section>
  );
}
