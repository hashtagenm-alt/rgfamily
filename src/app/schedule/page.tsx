import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Calendar } from "@/components/schedule";
import styles from "./page.module.css";

export const metadata = {
  title: "일정 | RG FAMILY",
  description: "RG FAMILY 방송 일정 및 이벤트 캘린더",
};

const EVENT_TYPES = [
  { label: "방송", color: "#7fb28a" },
  { label: "콜라보", color: "#7aa2d8" },
  { label: "이벤트", color: "#d1a36c" },
  { label: "공지", color: "#c2a77a" },
  { label: "휴방", color: "#94a3b8" },
];

export default function SchedulePage() {
  return (
    <div className={styles.main}>
      <Navbar />
      <div className={styles.hero}>
        <span className={styles.heroBadge}>CALENDAR</span>
        <h1 className={styles.title}>SCHEDULE</h1>
        <p className={styles.subtitle}>RG FAMILY 방송 일정 및 이벤트</p>

        {/* Event Type Legend */}
        <div className={styles.legend}>
          {EVENT_TYPES.map((type) => (
            <div key={type.label} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: type.color }}
              />
              <span>{type.label}</span>
            </div>
          ))}
        </div>
      </div>
      <Calendar />
      <Footer />
    </div>
  );
}
