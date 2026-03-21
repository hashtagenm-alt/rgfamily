import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Radio } from 'lucide-react'
import { ImageUpload } from '@/components/admin'
import styles from '../../shared.module.css'
import type { OrgMember, Profile } from './types'

interface MemberModalProps {
  isOpen: boolean
  isNew: boolean
  member: Partial<OrgMember> | null
  profiles: Profile[]
  onMemberChange: (member: Partial<OrgMember>) => void
  onClose: () => void
  onSave: () => void
}

export function MemberModal({
  isOpen,
  isNew,
  member,
  profiles,
  onMemberChange,
  onClose,
  onSave,
}: MemberModalProps) {
  if (!member) return null

  return (
    <AnimatePresence>
      {isOpen && (
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
              <h2>{isNew ? '멤버 추가' : '멤버 수정'}</h2>
              <button onClick={onClose} className={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* 프로필 이미지 */}
              <div className={styles.formGroup}>
                <label>프로필 이미지</label>
                <ImageUpload
                  value={member.imageUrl ?? null}
                  onChange={(url) => onMemberChange({ ...member, imageUrl: url })}
                  folder="members"
                  size={80}
                />
              </div>

              <div className={styles.formGroup}>
                <label>이름 *</label>
                <input
                  type="text"
                  value={member.name || ''}
                  onChange={(e) =>
                    onMemberChange({ ...member, name: e.target.value })
                  }
                  className={styles.input}
                  placeholder="멤버 이름"
                />
              </div>

              <div className={styles.formGroup}>
                <label>직책 *</label>
                <select
                  value={member.role || ''}
                  onChange={(e) =>
                    onMemberChange({ ...member, role: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="">선택</option>
                  <option value="대표">대표</option>
                  <option value="멤버">멤버</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>부서</label>
                <div className={styles.typeSelector}>
                  <button
                    type="button"
                    onClick={() => onMemberChange({ ...member, unit: 'excel' })}
                    className={`${styles.typeButton} ${member.unit === 'excel' ? styles.active : ''}`}
                  >
                    엑셀부
                  </button>
                  <button
                    type="button"
                    onClick={() => onMemberChange({ ...member, unit: 'crew' })}
                    className={`${styles.typeButton} ${member.unit === 'crew' ? styles.active : ''}`}
                  >
                    크루부
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>연결된 회원 (선택)</label>
                <select
                  value={member.profileId || ''}
                  onChange={(e) =>
                    onMemberChange({ ...member, profileId: e.target.value || null })
                  }
                  className={styles.select}
                >
                  <option value="">연결 안함</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>순서</label>
                <input
                  type="number"
                  value={member.positionOrder ?? 0}
                  onChange={(e) =>
                    onMemberChange({
                      ...member,
                      positionOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className={styles.input}
                  min={0}
                />
              </div>

              {/* Profile Info */}
              <div className={styles.formGroup}>
                <label style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>프로필 정보</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <label>MBTI</label>
                    <input
                      type="text"
                      value={member.profileInfo?.mbti || ''}
                      onChange={(e) =>
                        onMemberChange({
                          ...member,
                          profileInfo: {
                            ...member.profileInfo,
                            mbti: e.target.value.toUpperCase() || undefined,
                          },
                        })
                      }
                      className={styles.input}
                      placeholder="ENFP"
                      maxLength={4}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <label>혈액형</label>
                    <select
                      value={member.profileInfo?.bloodType || ''}
                      onChange={(e) =>
                        onMemberChange({
                          ...member,
                          profileInfo: {
                            ...member.profileInfo,
                            bloodType: e.target.value || undefined,
                          },
                        })
                      }
                      className={styles.select}
                    >
                      <option value="">선택</option>
                      <option value="A">A형</option>
                      <option value="B">B형</option>
                      <option value="O">O형</option>
                      <option value="AB">AB형</option>
                    </select>
                  </div>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <label>키 (cm)</label>
                    <input
                      type="number"
                      value={member.profileInfo?.height || ''}
                      onChange={(e) =>
                        onMemberChange({
                          ...member,
                          profileInfo: {
                            ...member.profileInfo,
                            height: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })
                      }
                      className={styles.input}
                      placeholder="170"
                      min={100}
                      max={250}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <label>몸무게 (kg)</label>
                    <input
                      type="number"
                      value={member.profileInfo?.weight || ''}
                      onChange={(e) =>
                        onMemberChange({
                          ...member,
                          profileInfo: {
                            ...member.profileInfo,
                            weight: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })
                      }
                      className={styles.input}
                      placeholder="65"
                      min={30}
                      max={200}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ margin: 0, gridColumn: 'span 2' }}>
                    <label>생일</label>
                    <input
                      type="date"
                      value={member.profileInfo?.birthday || ''}
                      onChange={(e) =>
                        onMemberChange({
                          ...member,
                          profileInfo: {
                            ...member.profileInfo,
                            birthday: e.target.value || undefined,
                          },
                        })
                      }
                      className={styles.input}
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className={styles.formGroup}>
                <label>
                  <Radio size={14} style={{ marginRight: '0.25rem' }} />
                  PandaTV ID
                </label>
                <input
                  type="text"
                  value={member.socialLinks?.pandatv || ''}
                  onChange={(e) =>
                    onMemberChange({
                      ...member,
                      socialLinks: {
                        ...member.socialLinks,
                        pandatv: e.target.value || undefined,
                      },
                    })
                  }
                  className={styles.input}
                  placeholder="hj042300"
                />
                <span className={styles.helperText} style={{ color: 'var(--text-tertiary)' }}>
                  팬더티비 아이디만 입력 (예: hj042300)
                </span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={onClose} className={styles.cancelButton}>
                취소
              </button>
              <button onClick={onSave} className={styles.saveButton}>
                <Save size={16} />
                {isNew ? '추가' : '저장'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
