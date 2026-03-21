'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Image as ImageIcon,
  Plus,
  X,
  Save,
  Eye,
  EyeOff,
  GripVertical,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react'
import Image from 'next/image'
import { DataTable, Column } from '@/components/admin'
import {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner as deleteBannerAction,
  toggleBannerActive,
} from '@/lib/actions/banners'
import type { Banner } from '@/types/database'
import { useAlert } from '@/lib/hooks'
import { logger } from '@/lib/utils/logger'
import styles from '../shared.module.css'
import bannerStyles from './page.module.css'

interface BannerFormData {
  id?: number
  title: string
  image_url: string
  link_url: string | null
  display_order: number
  is_active: boolean
}

export default function BannersPage() {
  const { showConfirm, showError } = useAlert()
  const [banners, setBanners] = useState<Banner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<BannerFormData | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fetchBanners = useCallback(async () => {
    setIsLoading(true)

    const result = await getAllBanners()

    if (result.error) {
      logger.dbError('select', 'banners', result.error)
    } else {
      setBanners(result.data || [])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  const handleAdd = () => {
    const maxOrder = Math.max(0, ...banners.map(b => b.display_order))
    setEditingBanner({
      title: '',
      image_url: '',
      link_url: '',
      display_order: maxOrder + 1,
      is_active: true,
    })
    setIsNew(true)
    setPreviewUrl(null)
    setIsModalOpen(true)
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner({
      id: banner.id,
      title: banner.title || '',
      image_url: banner.image_url,
      link_url: banner.link_url,
      display_order: banner.display_order,
      is_active: banner.is_active,
    })
    setIsNew(false)
    setPreviewUrl(banner.image_url)
    setIsModalOpen(true)
  }

  const handleDelete = async (banner: Banner) => {
    const confirmed = await showConfirm('정말 삭제하시겠습니까?', {
      title: '배너 삭제',
      variant: 'danger',
      confirmText: '삭제',
      cancelText: '취소',
    })
    if (!confirmed) return

    const result = await deleteBannerAction(banner.id)

    if (result.error) {
      logger.dbError('delete', 'banners', result.error)
      showError('삭제에 실패했습니다.')
    } else {
      fetchBanners()
    }
  }

  const handleToggleActive = async (banner: Banner) => {
    const result = await toggleBannerActive(banner.id, !banner.is_active)

    if (result.error) {
      logger.dbError('update', 'banners', result.error)
      showError('상태 변경에 실패했습니다.')
    } else {
      fetchBanners()
    }
  }

  const handleSave = async () => {
    if (!editingBanner || !editingBanner.image_url) {
      showError('이미지 URL을 입력해주세요.', '입력 오류')
      return
    }

    if (isNew) {
      const result = await createBanner({
        title: editingBanner.title || null,
        image_url: editingBanner.image_url,
        link_url: editingBanner.link_url || null,
        display_order: editingBanner.display_order,
        is_active: editingBanner.is_active ?? true,
      })

      if (result.error) {
        logger.dbError('insert', 'banners', result.error)
        showError('등록에 실패했습니다.')
        return
      }
    } else {
      const result = await updateBanner(editingBanner.id!, {
        title: editingBanner.title || null,
        image_url: editingBanner.image_url,
        link_url: editingBanner.link_url || null,
        display_order: editingBanner.display_order,
        is_active: editingBanner.is_active,
      })

      if (result.error) {
        logger.dbError('update', 'banners', result.error)
        showError('수정에 실패했습니다.')
        return
      }
    }

    setIsModalOpen(false)
    setEditingBanner(null)
    setPreviewUrl(null)
    fetchBanners()
  }

  const handleImageUrlChange = (url: string) => {
    setEditingBanner(prev => prev ? { ...prev, image_url: url } : null)
    setPreviewUrl(url)
  }

  const columns: Column<Banner>[] = [
    {
      key: 'display_order',
      header: '순서',
      width: '60px',
      render: (banner) => (
        <div className={bannerStyles.orderCell}>
          <GripVertical size={14} />
          <span>{banner.display_order}</span>
        </div>
      ),
    },
    {
      key: 'image_url',
      header: '미리보기',
      width: '120px',
      render: (banner) => (
        <div className={bannerStyles.previewCell}>
          {banner.image_url ? (
            <Image
              src={banner.image_url}
              alt={banner.title || '배너'}
              width={100}
              height={50}
              className={bannerStyles.thumbnail}
            />
          ) : (
            <div className={bannerStyles.noImage}>
              <ImageIcon size={20} />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: '제목',
      render: (banner) => banner.title || '-',
    },
    {
      key: 'link_url',
      header: '링크',
      render: (banner) =>
        banner.link_url ? (
          <a
            href={banner.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className={bannerStyles.link}
          >
            <LinkIcon size={14} />
            <span>{banner.link_url.length > 30 ? `${banner.link_url.slice(0, 30)}...` : banner.link_url}</span>
          </a>
        ) : (
          '-'
        ),
    },
    {
      key: 'is_active',
      header: '상태',
      width: '80px',
      render: (banner) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggleActive(banner)
          }}
          className={`${bannerStyles.statusButton} ${banner.is_active ? bannerStyles.active : bannerStyles.inactive}`}
        >
          {banner.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
          <span>{banner.is_active ? '활성' : '비활성'}</span>
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (banner) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete(banner)
          }}
          className={bannerStyles.deleteButton}
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ImageIcon size={28} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>배너 관리</h1>
            <p className={styles.subtitle}>메인 페이지 슬라이드 배너를 관리합니다</p>
          </div>
        </div>
        <button className={styles.addButton} onClick={handleAdd}>
          <Plus size={18} />
          <span>배너 추가</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={banners}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && editingBanner && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              className={styles.modal}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>{isNew ? '배너 추가' : '배너 수정'}</h2>
                <button
                  className={styles.closeButton}
                  onClick={() => setIsModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* Image Preview */}
                <div className={bannerStyles.imagePreview}>
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="배너 미리보기"
                      fill
                      className={bannerStyles.previewImage}
                      onError={() => setPreviewUrl(null)}
                    />
                  ) : (
                    <div className={bannerStyles.noPreview}>
                      <ImageIcon size={48} />
                      <span>이미지 URL을 입력하면 미리보기가 표시됩니다</span>
                    </div>
                  )}
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    이미지 URL <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="url"
                    value={editingBanner.image_url || ''}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>제목 (선택)</label>
                  <input
                    type="text"
                    value={editingBanner.title || ''}
                    onChange={(e) =>
                      setEditingBanner({ ...editingBanner, title: e.target.value })
                    }
                    placeholder="배너 제목"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>링크 URL (선택)</label>
                  <input
                    type="url"
                    value={editingBanner.link_url || ''}
                    onChange={(e) =>
                      setEditingBanner({ ...editingBanner, link_url: e.target.value })
                    }
                    placeholder="https://example.com"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>표시 순서</label>
                  <input
                    type="number"
                    value={editingBanner.display_order || 0}
                    onChange={(e) =>
                      setEditingBanner({
                        ...editingBanner,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    min="0"
                    className={styles.input}
                    style={{ width: '100px' }}
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editingBanner.is_active ?? true}
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          is_active: e.target.checked,
                        })
                      }
                      className={styles.checkbox}
                    />
                    <span>활성화</span>
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setIsModalOpen(false)}
                >
                  취소
                </button>
                <button className={styles.saveButton} onClick={handleSave}>
                  <Save size={16} />
                  <span>{isNew ? '등록' : '저장'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
