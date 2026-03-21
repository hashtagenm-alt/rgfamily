'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ImageIcon, Video, Send, Loader2, Globe, Lock } from 'lucide-react'
import { useBjMessageForm } from './useBjMessageForm'
import type { BjMessageFormProps, MessageType } from './useBjMessageForm'
import BjMessageImageSection from './BjMessageImageSection'
import BjMessageVideoSection from './BjMessageVideoSection'
import styles from './BjMessageForm.module.css'

const tabs: { type: MessageType; icon: typeof ImageIcon; label: string }[] = [
  { type: 'image', icon: ImageIcon, label: '사진' },
  { type: 'video', icon: Video, label: '영상' },
]

export default function BjMessageForm({
  isOpen,
  onClose,
  onSubmit,
  bjMemberInfo,
  vipNickname,
  isAdminMode = false,
  bjMembers = [],
}: BjMessageFormProps) {
  const form = useBjMessageForm({ onClose, onSubmit, isAdminMode, bjMembers })

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
            {/* Close button */}
            <button className={styles.closeBtn} onClick={form.handleClose}>
              <X size={20} />
            </button>

            {/* Header */}
            <div className={styles.header}>
              <div className={styles.bjProfile}>
                {isAdminMode ? (
                  form.selectedMember?.imageUrl ? (
                    <Image
                      src={form.selectedMember.imageUrl}
                      alt={form.selectedMember.name}
                      width={48}
                      height={48}
                      className={styles.bjAvatar}
                    />
                  ) : (
                    <div className={styles.bjAvatarPlaceholder}>
                      {form.selectedMember?.name?.charAt(0) || '?'}
                    </div>
                  )
                ) : bjMemberInfo?.imageUrl ? (
                  <Image
                    src={bjMemberInfo.imageUrl}
                    alt={bjMemberInfo.name}
                    width={48}
                    height={48}
                    className={styles.bjAvatar}
                  />
                ) : (
                  <div className={styles.bjAvatarPlaceholder}>
                    {(bjMemberInfo?.name || 'BJ').charAt(0)}
                  </div>
                )}
                <div className={styles.headerText}>
                  <h2 className={styles.title}>감사 메시지 작성</h2>
                  <p className={styles.subtitle}>
                    <span className={styles.vipName}>{vipNickname}</span>님에게 감사 인사를 남겨주세요
                  </p>
                </div>
              </div>
            </div>

            {/* Admin member select */}
            {isAdminMode && (
              <div className={styles.memberSelect}>
                <label className={styles.label}>등록할 멤버 선택</label>
                <div className={styles.memberGrid}>
                  {bjMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className={`${styles.memberBtn} ${form.selectedMemberId === member.id ? styles.memberBtnActive : ''}`}
                      onClick={() => form.setSelectedMemberId(member.id)}
                      disabled={form.isSubmitting || form.isUploading}
                    >
                      {member.imageUrl ? (
                        <Image
                          src={member.imageUrl}
                          alt={member.name}
                          width={28}
                          height={28}
                          className={styles.memberBtnAvatar}
                        />
                      ) : (
                        <div className={styles.memberBtnAvatarPlaceholder}>
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <span className={styles.memberBtnName}>{member.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type tabs */}
            <div className={styles.tabs}>
              {tabs.map((tab) => (
                <button
                  key={tab.type}
                  className={`${styles.tab} ${form.messageType === tab.type ? styles.activeTab : ''}`}
                  onClick={() => form.handleTabChange(tab.type)}
                  disabled={form.isSubmitting || form.isUploading}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Form content */}
            <div className={styles.content}>
              {form.messageType === 'image' && (
                <BjMessageImageSection
                  previewUrl={form.previewUrl}
                  isUploading={form.isUploading}
                  uploadProgress={form.uploadProgress}
                  contentText={form.contentText}
                  isSubmitting={form.isSubmitting}
                  fileInputRef={form.fileInputRef}
                  onFileChange={form.handleFileChange}
                  onRemoveImage={form.handleRemoveImage}
                  onContentTextChange={form.setContentText}
                />
              )}

              {form.messageType === 'video' && (
                <BjMessageVideoSection
                  videoUploadMode={form.videoUploadMode}
                  videoProcessingStatus={form.videoProcessingStatus}
                  previewUrl={form.previewUrl}
                  isUploading={form.isUploading}
                  uploadProgress={form.uploadProgress}
                  contentUrl={form.contentUrl}
                  contentText={form.contentText}
                  isSubmitting={form.isSubmitting}
                  videoInputRef={form.videoInputRef}
                  onVideoModeChange={form.handleVideoModeChange}
                  onVideoFileChange={form.handleVideoFileChange}
                  onRemoveVideo={form.handleRemoveVideo}
                  onContentUrlChange={form.setContentUrl}
                  onContentTextChange={form.setContentText}
                />
              )}

              {/* Visibility toggle */}
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
                    : `${vipNickname}님과 나만 이 메시지를 볼 수 있습니다`}
                </span>
              </div>

              {/* Error */}
              {form.error && <p className={styles.error}>{form.error}</p>}
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button
                className={styles.cancelBtn}
                onClick={form.handleClose}
                disabled={form.isSubmitting || form.isUploading}
              >
                취소
              </button>
              <button
                className={styles.submitBtn}
                onClick={form.handleSubmit}
                disabled={form.isSubmitting || form.isUploading}
              >
                {form.isSubmitting ? (
                  <>
                    <Loader2 size={18} className={styles.spinner} />
                    <span>전송 중...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>메시지 보내기</span>
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
