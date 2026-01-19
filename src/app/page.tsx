import { Suspense } from "react";
import { PageLayout } from "@/components/layout";
import Navbar from "@/components/Navbar";
import { Hero, LiveMembers, BroadcastNotice, Shorts, VOD } from "@/components/home";
import Footer from "@/components/Footer";
import SectionSkeleton from "@/components/ui/SectionSkeleton";
import styles from "./page.module.css";

export default function Home() {
  return (
    <PageLayout>
      <div className={styles.main}>
        <Navbar />
        <Hero />
        <div className={styles.content}>
          {/* Section Header */}
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>LIVE NOW</span>
            <h2 className={styles.sectionTitle}>실시간 멤버</h2>
          </div>

          {/* 2-Column Layout: Live Members & Broadcast Notice */}
          <div className={styles.liveNoticeGrid}>
            <LiveMembers />
            <BroadcastNotice />
          </div>

          {/* Shorts Section - Full Width */}
          <section className={styles.section}>
            <Suspense fallback={<SectionSkeleton type="shorts" />}>
              <Shorts />
            </Suspense>
          </section>

          {/* VOD Section - Full Width */}
          <section className={styles.section}>
            <Suspense fallback={<SectionSkeleton type="vod" />}>
              <VOD />
            </Suspense>
          </section>
        </div>

        <Footer />
      </div>
    </PageLayout>
  );
}
