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
          {/* Live & Notice Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionBadge}>LIVE NOW</div>
              <h2 className={styles.sectionTitle}>실시간 멤버</h2>
            </div>
            <div className={styles.liveNoticeGrid}>
              <LiveMembers />
              <BroadcastNotice />
            </div>
          </section>

          {/* Shorts Section */}
          <section className={styles.section}>
            <Suspense fallback={<SectionSkeleton type="shorts" />}>
              <Shorts />
            </Suspense>
          </section>

          {/* VOD Section */}
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
