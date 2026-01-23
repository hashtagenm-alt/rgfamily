'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Plus, X, Save, Upload, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { DataTable, Column } from '@/components/admin'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { useSupabaseContext } from '@/lib/context'
import type { JoinedProfile, JoinedSeason } from '@/types/common'
import styles from '../shared.module.css'

interface VipImage {
  id: number
  rewardId: number
  imageUrl: string
  title: string
  orderIndex: number
}

interface VipReward {
  id: number
  profileId: string
  nickname: string
  seasonId: number
  seasonName: string
  rank: number
  personalMessage: string
  dedicationVideoUrl: string
  createdAt: string
  images?: VipImage[]
  imageCount?: number
}

interface Season {
  id: number
  name: string
}

interface Profile {
  id: string
  nickname: string
}

export default function VipRewardsPage() {
  const supabase = useSupabaseContext()
  const alertHandler = useAlert()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [galleryImages, setGalleryImages] = useState<VipImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [imageCounts, setImageCounts] = useState<Record<number, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch related data
  const fetchRelatedData = useCallback(async () => {
    const [seasonsRes, profilesRes] = await Promise.all([
      supabase.from('seasons').select('id, name').order('start_date', { ascending: false }),
      supabase.from('profiles').select('id, nickname').order('total_donation', { ascending: false }).limit(50),
    ])
    setSeasons(seasonsRes.data || [])
    setProfiles(profilesRes.data || [])
  }, [supabase])

  useEffect(() => {
    fetchRelatedData()
  }, [fetchRelatedData])

  // Fetch image counts for all rewards
  const fetchImageCounts = useCallback(async (rewardIds: number[]) => {
    if (rewardIds.length === 0) return

    const { data } = await supabase
      .from('vip_images')
      .select('reward_id')
      .in('reward_id', rewardIds)

    // Count images per reward
    const counts: Record<number, number> = {}
    rewardIds.forEach((id) => (counts[id] = 0))
    ;(data || []).forEach((img) => {
      counts[img.reward_id] = (counts[img.reward_id] || 0) + 1
    })
    setImageCounts(counts)
  }, [supabase])

  // Fetch gallery images for a reward
  const fetchGalleryImages = useCallback(async (rewardId: number) => {
    const { data } = await supabase
      .from('vip_images')
      .select('id, reward_id, image_url, title, order_index')
      .eq('reward_id', rewardId)
      .order('order_index', { ascending: true })

    setGalleryImages(
      (data || []).map((img) => ({
        id: img.id,
        rewardId: img.reward_id,
        imageUrl: img.image_url,
        title: img.title || '',
        orderIndex: img.order_index,
      }))
    )
  }, [supabase])

  // Upload image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, rewardId: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'vip-gallery')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '업로드 실패')
      }

      const { url } = await res.json()

      // Save to database
      const { error } = await supabase.from('vip_images').insert({
        reward_id: rewardId,
        image_url: url,
        title: file.name.replace(/\.[^/.]+$/, ''),
        order_index: galleryImages.length,
      })

      if (error) throw error

      alertHandler.showSuccess('이미지가 업로드되었습니다')
      fetchGalleryImages(rewardId)
      // Update image count
      setImageCounts((prev) => ({ ...prev, [rewardId]: (prev[rewardId] || 0) + 1 }))
    } catch (err) {
      alertHandler.showError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Delete image
  const handleImageDelete = async (imageId: number, rewardId: number) => {
    if (!confirm('이미지를 삭제하시겠습니까?')) return

    const { error } = await supabase.from('vip_images').delete().eq('id', imageId)
    if (error) {
      alertHandler.showError('삭제 실패')
      return
    }
    alertHandler.showSuccess('이미지가 삭제되었습니다')
    fetchGalleryImages(rewardId)
    // Update image count
    setImageCounts((prev) => ({ ...prev, [rewardId]: Math.max(0, (prev[rewardId] || 0) - 1) }))
  }

  const {
    items: rewards,
    isLoading,
    isModalOpen,
    isNew,
    editingItem: editingReward,
    setEditingItem: setEditingReward,
    openAddModal: baseOpenAddModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
  } = useAdminCRUD<VipReward>({
    tableName: 'vip_rewards',
    defaultItem: {
      profileId: '',
      seasonId: seasons[0]?.id || 0,
      rank: 1,
      personalMessage: '',
      dedicationVideoUrl: '',
    },
    orderBy: { column: 'created_at', ascending: false },
    selectQuery: `
      id,
      profile_id,
      season_id,
      rank,
      personal_message,
      dedication_video_url,
      created_at,
      profiles:profile_id (nickname),
      seasons:season_id (name)
    `,
    fromDbFormat: (row) => {
      const profile = row.profiles as JoinedProfile | JoinedProfile[] | null
      const season = row.seasons as JoinedSeason | JoinedSeason[] | null
      // Supabase는 배열 또는 객체로 반환할 수 있음
      const profileData = Array.isArray(profile) ? profile[0] : profile
      const seasonData = Array.isArray(season) ? season[0] : season
      return {
        id: row.id as number,
        profileId: row.profile_id as string,
        nickname: profileData?.nickname || '',
        seasonId: row.season_id as number,
        seasonName: seasonData?.name || '',
        rank: row.rank as number,
        personalMessage: (row.personal_message as string) || '',
        dedicationVideoUrl: (row.dedication_video_url as string) || '',
        createdAt: row.created_at as string,
      }
    },
    toDbFormat: (item) => ({
      profile_id: item.profileId,
      season_id: item.seasonId,
      rank: item.rank,
      personal_message: item.personalMessage,
      dedication_video_url: item.dedicationVideoUrl,
    }),
    validate: (item) => {
      if (!item.profileId) return 'VIP 회원을 선택해주세요.'
      if (!item.seasonId || item.seasonId <= 0) return '시즌을 선택해주세요.'
      if (!item.rank || item.rank < 1) return '순위를 입력해주세요.'
      return null
    },
    alertHandler,
  })

  // Fetch image counts when rewards are loaded
  useEffect(() => {
    if (rewards.length > 0) {
      const rewardIds = rewards.map((r) => r.id)
      fetchImageCounts(rewardIds)
    }
  }, [rewards, fetchImageCounts])

  const openAddModal = () => {
    baseOpenAddModal()
    setGalleryImages([])
    setEditingReward((prev) => prev ? { ...prev, seasonId: seasons[0]?.id || 0 } : null)
  }

  // Override openEditModal to fetch images
  const handleOpenEditModal = (reward: VipReward) => {
    openEditModal(reward)
    fetchGalleryImages(reward.id)
  }

  const handleView = (reward: VipReward) => {
    window.open(`/ranking`, '_blank')
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { background: 'rgba(255, 215, 0, 0.2)', color: '#ffd700' }
    if (rank === 2) return { background: 'rgba(192, 192, 192, 0.2)', color: '#c0c0c0' }
    if (rank === 3) return { background: 'rgba(205, 127, 50, 0.2)', color: '#cd7f32' }
    return { background: 'var(--color-background)', color: 'var(--color-text-secondary)' }
  }

  const columns: Column<VipReward>[] = [
    {
      key: 'rank',
      header: '순위',
      width: '80px',
      render: (item) => {
        const { background, color } = getRankBadge(item.rank)
        return (
          <span className={styles.badge} style={{ background, color, fontWeight: 700 }}>
            {item.rank}위
          </span>
        )
      },
    },
    { key: 'nickname', header: 'VIP', width: '150px' },
    {
      key: 'seasonName',
      header: '시즌',
      width: '160px',
      render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{item.seasonName || '-'}</span>,
    },
    {
      key: 'personalMessage',
      header: '개인 메시지',
      render: (item) => (
        <span className={styles.messageCell}>
          {item.personalMessage || '-'}
        </span>
      ),
    },
    {
      key: 'imageCount',
      header: '시그니처',
      width: '100px',
      render: (item) => {
        const count = imageCounts[item.id] || 0
        return count > 0 ? (
          <span className={styles.badge} style={{ background: 'rgba(253, 104, 186, 0.15)', color: '#fd68ba', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ImageIcon size={12} />
            {count}개
          </span>
        ) : (
          <span className={styles.badge}>미등록</span>
        )
      },
    },
    {
      key: 'dedicationVideoUrl',
      header: '헌정 영상',
      width: '100px',
      render: (item) => (
        item.dedicationVideoUrl ? (
          <span className={styles.badge} style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
            등록됨
          </span>
        ) : (
          <span className={styles.badge}>미등록</span>
        )
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Crown size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>VIP 보상 관리</h1>
            <p className={styles.subtitle}>VIP 개인 페이지 보상 관리</p>
          </div>
        </div>
        <button onClick={openAddModal} className={styles.addButton}>
          <Plus size={18} />
          VIP 보상 추가
        </button>
      </header>

      <DataTable
        data={rewards}
        columns={columns}
        onView={handleView}
        onEdit={handleOpenEditModal}
        onDelete={handleDelete}
        searchPlaceholder="VIP 이름으로 검색..."
        isLoading={isLoading}
      />

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && editingReward && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>{isNew ? 'VIP 보상 추가' : 'VIP 보상 수정'}</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>VIP 회원</label>
                  <select
                    value={editingReward.profileId || ''}
                    onChange={(e) =>
                      setEditingReward({ ...editingReward, profileId: e.target.value })
                    }
                    className={styles.select}
                  >
                    <option value="">선택하세요</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nickname}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>시즌</label>
                    <select
                      value={editingReward.seasonId || ''}
                      onChange={(e) =>
                        setEditingReward({
                          ...editingReward,
                          seasonId: parseInt(e.target.value),
                        })
                      }
                      className={styles.select}
                    >
                      {seasons.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>순위</label>
                    <input
                      type="number"
                      value={editingReward.rank || 1}
                      onChange={(e) =>
                        setEditingReward({
                          ...editingReward,
                          rank: parseInt(e.target.value) || 1,
                        })
                      }
                      className={styles.input}
                      min={1}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>헌정 영상 URL (선택)</label>
                  <input
                    type="text"
                    value={editingReward.dedicationVideoUrl || ''}
                    onChange={(e) =>
                      setEditingReward({ ...editingReward, dedicationVideoUrl: e.target.value })
                    }
                    className={styles.input}
                    placeholder="https://..."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>개인 메시지 (선택)</label>
                  <textarea
                    value={editingReward.personalMessage || ''}
                    onChange={(e) =>
                      setEditingReward({ ...editingReward, personalMessage: e.target.value })
                    }
                    className={styles.textarea}
                    placeholder="VIP에게 전하는 감사 메시지..."
                    rows={5}
                  />
                </div>

                {/* Gallery Images Section */}
                {!isNew && editingReward.id != null && (
                  <div className={styles.formGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ImageIcon size={16} />
                      갤러리 이미지
                    </label>
                    <div className={styles.galleryGrid}>
                      {galleryImages.map((img) => (
                        <div key={img.id} className={styles.galleryItem}>
                          <Image
                            src={img.imageUrl}
                            alt={img.title}
                            width={120}
                            height={120}
                            className={styles.galleryImage}
                          />
                          <button
                            type="button"
                            onClick={() => handleImageDelete(img.id, editingReward.id as number)}
                            className={styles.galleryDeleteBtn}
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <label className={styles.galleryUploadBtn}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, editingReward.id as number)}
                          style={{ display: 'none' }}
                          disabled={isUploading}
                        />
                        {isUploading ? (
                          <div className={styles.spinner} style={{ width: 24, height: 24 }} />
                        ) : (
                          <>
                            <Upload size={24} />
                            <span>이미지 추가</span>
                          </>
                        )}
                      </label>
                    </div>
                    <p className={styles.hint}>최대 10MB, JPG/PNG/GIF 지원</p>
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button onClick={closeModal} className={styles.cancelButton}>
                  취소
                </button>
                <button onClick={handleSave} className={styles.saveButton}>
                  <Save size={16} />
                  {isNew ? '추가' : '저장'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
