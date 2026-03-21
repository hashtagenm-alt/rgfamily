'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ImageIcon,
  Video,
  Send,
  Loader2,
  Globe,
  Lock,
  Crown,
} from 'lucide-react'
import { useVipMessageForm } from './useVipMessageForm'
import type { VipMessageFormProps, MessageType } from './useVipMessageForm'
import VipMessageUploadSection from './VipMessageUploadSection'
import styles from './VipMessageForm.module.css'

const tabs: { type: MessageType; icon: typeof ImageIcon; label: string }[] = [
  { type: 'image', icon: ImageIcon, label: '사진' },
  { type: 'video', icon: Video, label: '영상' },
]

export default function VipMessageForm({
  isOpen,
  onClose,
  onSubmit,
  vipInfo,
}: VipMessageFormProps) {
  const form = useVipMessageForm({ onClose, onSubmit })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={form.handleClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button className={styles.closeBtn} onClick={form.handleClose}>
              <X size={20} />
            </button>

            {/* 헤더 */}
            <div className={styles.header}>
              <div className={styles.vipProfile}>
                {vipInfo?.avatarUrl ? (
                  <Image
                    src={vipInfo.avatarUrl}
                    alt={vipInfo.nickname}
                    width={48}
                    height={48}
                    className={styles.vipAvatar}
                  />
                ) : (
                  <div className={styles.vipAvatarPlaceholder}>
                    <Crown size={24} />
                  </div>
                )}
                <div className={styles.headerText}>
                  <h2 className={styles.title}>VIP 메시지 작성</h2>
                  <p className={styles.subtitle}>
                    나만의 페이지에 사진 또는 영상을 남겨보세요
                  </p>
                </div>
              </div>
            </div>

            {/* 타입 탭 */}
            <div className={styles.tabs}>
              {tabs.map((tab) => (
                <button
                  key={tab.type}
                  className={`${styles.tab} ${form.messageType === tab.type ? styles.activeTab : ''}`}
                  onClick={() => form.handleTypeChange(tab.type)}
                  disabled={form.isSubmitting || form.uploadStatus === 'uploading' || form.uploadStatus === 'processing'}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 폼 콘텐츠 */}
            <div className={styles.content}>
              {/* 파일 업로드 영역 */}
              <VipMessageUploadSection
                messageType={form.messageType}
                uploadStatus={form.uploadStatus}
                uploadProgress={form.uploadProgress}
                isDragActive={form.isDragActive}
                selectedFile={form.selectedFile}
                previewUrl={form.previewUrl}
                error={form.error}
                fileInputRef={form.fileInputRef}
                onDrop={form.handleDrop}
                onDragOver={form.handleDragOver}
                onDragLeave={form.handleDragLeave}
                onInputChange={form.handleInputChange}
                onResetUpload={form.handleResetUpload}
              />

              {/* 함께 전할 메시지 */}
              {form.uploadStatus === 'success' && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>함께 전할 메시지 (선택)</label>
                  <textarea
                    className={styles.textareaSmall}
                    placeholder={`${form.messageType === 'image' ? '사진' : '영상'}과 함께 전할 짧은 메시지...`}
                    value={form.contentText}
                    onChange={(e) => form.setContentText(e.target.value)}
                    maxLength={500}
                    disabled={form.isSubmitting}
                  />
                </div>
              )}

              {/* 공개/비공개 설정 */}
              {form.uploadStatus === 'success' && (
                <div className={styles.visibilityToggle}>
                  <label className={styles.label}>공개 설정</label>
                  <div className={styles.toggleButtons}>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${form.isPublic ? styles.activeToggle : ''}`}
                      onClick={() => form.setIsPublic(true)}
                      disabled={form.isSubmitting}
                    >
                      <Globe size={16} />
                      <span>공개</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${!form.isPublic ? styles.activeToggle : ''}`}
                      onClick={() => form.setIsPublic(false)}
                      disabled={form.isSubmitting}
                    >
                      <Lock size={16} />
                      <span>비공개</span>
                    </button>
                  </div>
                  <span className={styles.visibilityHint}>
                    {form.isPublic
                      ? '모든 VIP 회원이 이 메시지를 볼 수 있습니다'
                      : '나만 이 메시지를 볼 수 있습니다'}
                  </span>
                </div>
              )}

              {/* 에러 메시지 */}
              {form.error && form.uploadStatus !== 'error' && <p className={styles.error}>{form.error}</p>}
            </div>

            {/* 액션 버튼 */}
            <div className={styles.actions}>
              <button
                className={styles.cancelBtn}
                onClick={form.handleClose}
                disabled={form.isSubmitting}
              >
                취소
              </button>
              <button
                className={styles.submitBtn}
                onClick={form.handleSubmit}
                disabled={form.isSubmitting || form.uploadStatus !== 'success'}
              >
                {form.isSubmitting ? (
                  <>
                    <Loader2 size={18} className={styles.spinner} />
                    <span>등록 중...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>메시지 등록</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
