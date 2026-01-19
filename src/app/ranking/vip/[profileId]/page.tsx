'use client'

import { useState, useEffect, use, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, ArrowLeft, Heart, Play, ImageIcon,
  Trophy, Star, MessageSquare, Video
} from 'lucide-react'
import Footer from '@/components/Footer'
import { useSupabaseContext } from '@/lib/context'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import styles from './page.module.css'

interface VipRewardData {
  id: number
  profileId: string
  nickname: string
  rank: number
  personalMessage: string | null
  dedicationVideoUrl: string | null
  seasonName: string
  totalDonation: number
  images: {
    id: number
    imageUrl: string
    title: string
    orderIndex: number
  }[]
}

export default function VipProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = use(params)
  const supabase = useSupabaseContext()
  const [vipData, setVipData] = useState<VipRewardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGate, setShowGate] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // 2.5초 후 자동으로 게이트 열림
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGate(false)
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  const fetchVipData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // VIP 보상 데이터 조회
      const { data: reward, error: rewardError } = await withRetry(async () =>
        await supabase
          .from('vip_rewards')
          .select(`
            id,
            profile_id,
            rank,
            personal_message,
            dedication_video_url,
            season_id,
            profiles:profile_id (nickname, total_donation),
            seasons:season_id (name)
          `)
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      )

      if (rewardError) {
        if (rewardError.code === 'PGRST116') {
          setError('등록된 VIP 보상 정보가 없습니다.')
        } else {
          throw rewardError
        }
        setIsLoading(false)
        return
      }

      // VIP 이미지 조회
      const { data: images } = await withRetry(async () =>
        await supabase
          .from('vip_images')
          .select('id, image_url, title, order_index')
          .eq('reward_id', reward.id)
          .order('order_index', { ascending: true })
      )

      // Supabase returns joined data - handle both array and object cases
      const profileData = reward.profiles
      const profile = Array.isArray(profileData)
        ? profileData[0] as { nickname: string; total_donation: number } | undefined
        : profileData as { nickname: string; total_donation: number } | null

      const seasonData = reward.seasons
      const season = Array.isArray(seasonData)
        ? seasonData[0] as { name: string } | undefined
        : seasonData as { name: string } | null

      setVipData({
        id: reward.id,
        profileId: reward.profile_id,
        nickname: profile?.nickname || '알 수 없음',
        rank: reward.rank,
        personalMessage: reward.personal_message,
        dedicationVideoUrl: reward.dedication_video_url,
        seasonName: season?.name || '',
        totalDonation: profile?.total_donation || 0,
        images: (images || []).map((img) => ({
          id: img.id,
          imageUrl: img.image_url,
          title: img.title || '',
          orderIndex: img.order_index,
        })),
      })
    } catch (err) {
      console.error('VIP 데이터 로드 실패:', err)
      setError('VIP 정보를 불러오는 데 실패했습니다.')
    }

    setIsLoading(false)
  }, [supabase, profileId])

  useEffect(() => {
    fetchVipData()
  }, [fetchVipData])

  // 로딩 중
  if (isLoading) {
    return (
      <div className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>VIP 정보를 불러오는 중...</span>
        </div>
        <Footer />
      </div>
    )
  }

  // 에러
  if (error || !vipData) {
    return (
      <div className={styles.main}>
        <div className={styles.empty}>
          <Crown size={48} />
          <p>{error || 'VIP 정보를 찾을 수 없습니다'}</p>
          <Link href="/ranking/vip" className={styles.backLink}>
            <ArrowLeft size={18} />
            <span>VIP 라운지로 돌아가기</span>
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return { bg: 'rgba(255, 215, 0, 0.2)', color: '#ffd700', label: '1위' }
    if (rank === 2) return { bg: 'rgba(192, 192, 192, 0.2)', color: '#c0c0c0', label: '2위' }
    if (rank === 3) return { bg: 'rgba(205, 127, 50, 0.2)', color: '#cd7f32', label: '3위' }
    return { bg: 'var(--surface)', color: 'var(--text-secondary)', label: `${rank}위` }
  }

  const rankStyle = getRankBadgeColor(vipData.rank)

  return (
    <div className={styles.main}>
      {/* Entrance Gate Animation */}
      <AnimatePresence>
        {showGate && (
          <motion.div
            className={styles.gateOverlay}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 0.8 }}
            onClick={() => setShowGate(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={styles.gateIcon}
            >
              <Crown size={80} strokeWidth={1} />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.2 }}
              className={styles.gateText}
            >
              {vipData.nickname}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4 }}
              className={styles.gateSubtext}
            >
              VIP PROFILE
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className={styles.pageNav}>
        <Link href="/ranking/vip" className={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>VIP 라운지</span>
        </Link>
        <div className={styles.navTitle}>
          <Crown size={18} />
          <span>VIP PROFILE</span>
        </div>
        <div className={styles.navActions}>
          <Link href="/ranking" className={styles.navBtn}>
            <Trophy size={16} />
            <span>랭킹</span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.heroContent}>
          <div className={styles.rankBadge} style={{ background: rankStyle.bg, color: rankStyle.color }}>
            <Crown size={16} />
            <span>{rankStyle.label}</span>
          </div>
          <h1 className={styles.heroTitle}>{vipData.nickname}</h1>
          <p className={styles.heroSubtitle}>
            {vipData.seasonName && <span className={styles.seasonTag}>{vipData.seasonName}</span>}
            {vipData.totalDonation > 0 && (
              <span className={styles.donationTag}>
                <Heart size={14} />
                {vipData.totalDonation.toLocaleString()} 하트
              </span>
            )}
          </p>
        </div>
        <div className={styles.heroDecoration}>
          <div className={styles.glow} />
          <Star className={styles.star1} size={24} />
          <Star className={styles.star2} size={16} />
          <Star className={styles.star3} size={20} />
        </div>
      </motion.div>

      <div className={styles.container}>
        {/* Personal Message */}
        {vipData.personalMessage && (
          <motion.section
            className={styles.messageSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.sectionHeader}>
              <MessageSquare size={20} />
              <h2>감사 메시지</h2>
            </div>
            <div className={styles.messageCard}>
              <p>{vipData.personalMessage}</p>
            </div>
          </motion.section>
        )}

        {/* Dedication Video */}
        {vipData.dedicationVideoUrl && (
          <motion.section
            className={styles.videoSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className={styles.sectionHeader}>
              <Video size={20} />
              <h2>헌정 영상</h2>
            </div>
            <div className={styles.videoContainer}>
              <a
                href={vipData.dedicationVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.videoLink}
              >
                <Play size={32} />
                <span>영상 보기</span>
              </a>
            </div>
          </motion.section>
        )}

        {/* Gallery Images */}
        {vipData.images.length > 0 && (
          <motion.section
            className={styles.gallerySection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.sectionHeader}>
              <ImageIcon size={20} />
              <h2>갤러리</h2>
            </div>
            <div className={styles.galleryGrid}>
              {vipData.images.map((img, index) => (
                <motion.div
                  key={img.id}
                  className={styles.galleryItem}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                  onClick={() => setSelectedImage(img.imageUrl)}
                >
                  <Image
                    src={img.imageUrl}
                    alt={img.title || `갤러리 이미지 ${index + 1}`}
                    fill
                    className={styles.galleryImage}
                    unoptimized
                  />
                  {img.title && <span className={styles.galleryTitle}>{img.title}</span>}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Empty State */}
        {!vipData.personalMessage && !vipData.dedicationVideoUrl && vipData.images.length === 0 && (
          <motion.div
            className={styles.emptyContent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Crown size={48} />
            <p>아직 등록된 VIP 콘텐츠가 없습니다</p>
          </motion.div>
        )}
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className={styles.imageModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              className={styles.imageModalContent}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <Image
                src={selectedImage}
                alt="갤러리 이미지"
                fill
                className={styles.modalImage}
                unoptimized
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
