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
          {/* 3-Column Layout: Left Sidebar - Main Content - Right Sidebar */}
          <div className={styles.threeColumnLayout}>
            {/* Left Sidebar - Live Members */}
            <aside className={styles.leftSidebar}>
              <div className={styles.stickyWrapper}>
                <LiveMembers />
              </div>
            </aside>

            {/* Main Content - Shorts & VOD */}
            <main className={styles.mainContent}>
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
            </main>

            {/* Right Sidebar - Broadcast Notice */}
            <aside className={styles.rightSidebar}>
              <div className={styles.stickyWrapper}>
                <BroadcastNotice />
              </div>
            </aside>
          </div>
        </div>

        <Footer />
      </div>
    </PageLayout>
  );
}
