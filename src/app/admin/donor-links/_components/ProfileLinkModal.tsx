import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Search, User, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import type { RankingEntry, Profile } from './types'
import styles from '../../shared.module.css'
import pageStyles from '../page.module.css'

interface ProfileLinkModalProps {
  linkingEntry: RankingEntry | null
  profiles: Profile[]
  profileSearchTerm: string
  selectedProfile: Profile | null
  isLinking: boolean
  onClose: () => void
  onProfileSearchChange: (value: string) => void
  onProfileSelect: (profile: Profile) => void
  onLink: () => void
}

export function ProfileLinkModal({
  linkingEntry,
  profiles,
  profileSearchTerm,
  selectedProfile,
  isLinking,
  onClose,
  onProfileSearchChange,
  onProfileSelect,
  onLink,
}: ProfileLinkModalProps) {
  return (
    <AnimatePresence>
      {linkingEntry && (
        <motion.div
          className={styles.modalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>프로필 연결: {linkingEntry.donor_name}</h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>프로필 검색</label>
                <div className={pageStyles.searchInput}>
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="닉네임 또는 이메일로 검색..."
                    value={profileSearchTerm}
                    onChange={(e) => onProfileSearchChange(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={pageStyles.profileList}>
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`${pageStyles.profileItem} ${selectedProfile?.id === profile.id ? pageStyles.selected : ''}`}
                    onClick={() => onProfileSelect(profile)}
                  >
                    <div className={pageStyles.profileAvatar}>
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.nickname}
                          width={40}
                          height={40}
                        />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div className={pageStyles.profileDetails}>
                      <span className={pageStyles.profileNickname}>{profile.nickname}</span>
                      <span className={pageStyles.profileEmail}>{profile.email || '-'}</span>
                    </div>
                    <span className={`${styles.badge} ${styles[`badge${profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}`]}`}>
                      {profile.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={onClose}
              >
                취소
              </button>
              <button
                className={styles.saveButton}
                onClick={onLink}
                disabled={!selectedProfile || isLinking}
              >
                {isLinking ? <Loader2 size={16} className={pageStyles.spinner} /> : <Link2 size={16} />}
                연결하기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
