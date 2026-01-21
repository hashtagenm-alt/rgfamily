'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, User, Radio, Edit2, Trash2 } from 'lucide-react'

// Types matching organization page interfaces
interface SocialLinks {
  pandatv?: string
  youtube?: string
  instagram?: string
}

interface ProfileInfo {
  mbti?: string
  bloodType?: string
  height?: number
  weight?: number
  birthday?: string
}

interface OrgTreeMember {
  id: number
  name: string
  role: string
  unit: 'excel' | 'crew'
  parentId: number | null
  imageUrl: string | null
  isLive: boolean
  positionOrder: number
  profileId: string | null
  socialLinks: SocialLinks | null
  profileInfo: ProfileInfo | null
}

interface OrgTreeViewProps {
  members: OrgTreeMember[]
  onEdit?: (member: OrgTreeMember) => void
  onDelete?: (member: OrgTreeMember) => void
}

interface TreeNode extends OrgTreeMember {
  children: TreeNode[]
}

export default function OrgTreeView({ members, onEdit, onDelete }: OrgTreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // Build tree structure from flat list
  const tree = useMemo(() => {
    const memberMap = new Map<number, TreeNode>()
    const roots: TreeNode[] = []

    // Initialize all nodes
    members.forEach((member) => {
      memberMap.set(member.id, { ...member, children: [] })
    })

    // Build tree
    members.forEach((member) => {
      const node = memberMap.get(member.id)!
      if (member.parentId && memberMap.has(member.parentId)) {
        memberMap.get(member.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    // Sort children by positionOrder
    const sortChildren = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.positionOrder - b.positionOrder)
      nodes.forEach((node) => sortChildren(node.children))
    }
    sortChildren(roots)

    return roots
  }, [members])

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedIds.has(node.id)
    const isLeader = node.role === '대표'

    return (
      <div key={node.id}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            marginLeft: `${depth * 2}rem`,
            background: isLeader ? 'var(--color-pink-overlay-10)' : 'var(--card-bg)',
            border: `1px solid ${isLeader ? 'var(--primary)' : 'var(--card-border)'}`,
            borderRadius: '10px',
            marginBottom: '0.5rem',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <div style={{ width: '24px' }} />
          )}

          {/* Profile Image */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: node.isLive ? '2px solid var(--live-color)' : '1px solid var(--card-border)',
              boxShadow: node.isLive ? '0 0 8px var(--live-glow)' : 'none',
              flexShrink: 0,
            }}
          >
            {node.imageUrl ? (
              <Image
                src={node.imageUrl}
                alt={node.name}
                width={40}
                height={40}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <User size={20} style={{ color: 'var(--text-tertiary)' }} />
            )}
          </div>

          {/* Name & Role */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {node.isLive && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '2px 6px',
                    background: 'var(--live-color)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.625rem',
                    fontWeight: 600,
                  }}
                >
                  <Radio size={10} />
                  LIVE
                </span>
              )}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{node.name}</span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                color: isLeader ? 'var(--primary)' : 'var(--text-tertiary)',
                fontWeight: isLeader ? 600 : 400,
              }}
            >
              {node.role}
            </span>
          </div>

          {/* Children Count */}
          {hasChildren && (
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--surface)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
              }}
            >
              {node.children.length}명
            </span>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {onEdit && (
              <button
                onClick={() => onEdit(node)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                }}
                title="수정"
              >
                <Edit2 size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(node)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--color-error)',
                  cursor: 'pointer',
                }}
                title="삭제"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              {/* Connector Line */}
              <div
                style={{
                  marginLeft: `${depth * 2 + 1}rem`,
                  paddingLeft: '1rem',
                  borderLeft: '2px solid var(--card-border)',
                }}
              >
                {node.children.map((child) => renderNode(child, depth + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
        }}
      >
        멤버가 없습니다.
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '1rem',
        background: 'var(--surface)',
        borderRadius: '12px',
        border: '1px solid var(--card-border)',
      }}
    >
      {tree.map((node) => renderNode(node))}
    </div>
  )
}
