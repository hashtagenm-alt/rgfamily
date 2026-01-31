'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import ImageResize from 'tiptap-extension-resize-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Undo,
  Redo,
} from 'lucide-react'
import { useState, useCallback, useEffect, useRef } from 'react'
import styles from './RichEditor.module.css'

interface RichEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: string
  onImageUpload?: (file: File) => Promise<string | null>
}

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${styles.toolbarButton} ${isActive ? styles.active : ''}`}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className={styles.toolbarDivider} />
}

interface MenuBarProps {
  editor: Editor | null
  onImageUpload?: (file: File) => Promise<string | null>
}

function MenuBar({ editor, onImageUpload }: MenuBarProps) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return

    // URL 유효성 검사 및 자동 https 추가
    let url = linkUrl.trim()
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run()

    setLinkUrl('')
    setIsLinkModalOpen(false)
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run()
    setIsLinkModalOpen(false)
  }, [editor])

  const handleImageUpload = useCallback(async () => {
    if (!onImageUpload) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const url = await onImageUpload(file)
      if (url) {
        editor?.chain().focus().setImage({ src: url }).run()
      }
    }
    input.click()
  }, [editor, onImageUpload])

  if (!editor) {
    return null
  }

  return (
    <div className={styles.toolbar}>
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="굵게 (Ctrl+B)"
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="기울임 (Ctrl+I)"
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="밑줄 (Ctrl+U)"
      >
        <UnderlineIcon size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="취소선"
      >
        <Strikethrough size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="제목 1"
      >
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="제목 2"
      >
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="제목 3"
      >
        <Heading3 size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="글머리 기호 목록"
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="번호 매기기 목록"
      >
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="인용"
      >
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="코드 블록"
      >
        <Code size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="왼쪽 정렬"
      >
        <AlignLeft size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="가운데 정렬"
      >
        <AlignCenter size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="오른쪽 정렬"
      >
        <AlignRight size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Link */}
      <div className={styles.linkWrapper}>
        <ToolbarButton
          onClick={() => setIsLinkModalOpen(!isLinkModalOpen)}
          isActive={editor.isActive('link') || isLinkModalOpen}
          title="링크 삽입"
        >
          <LinkIcon size={16} />
        </ToolbarButton>
        {isLinkModalOpen && (
          <div className={styles.linkModal}>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="URL 입력"
              className={styles.linkInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addLink()
                } else if (e.key === 'Escape') {
                  setIsLinkModalOpen(false)
                }
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={addLink}
              className={styles.linkButton}
            >
              확인
            </button>
            {editor.isActive('link') && (
              <button
                type="button"
                onClick={removeLink}
                className={styles.linkRemoveButton}
              >
                제거
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image */}
      {onImageUpload && (
        <ToolbarButton onClick={handleImageUpload} title="이미지 삽입">
          <ImageIcon size={16} />
        </ToolbarButton>
      )}

      <ToolbarDivider />

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="실행 취소 (Ctrl+Z)"
      >
        <Undo size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="다시 실행 (Ctrl+Y)"
      >
        <Redo size={16} />
      </ToolbarButton>
    </div>
  )
}

export default function RichEditor({
  content = '',
  onChange,
  placeholder = '내용을 입력하세요...',
  disabled = false,
  minHeight = '240px',
  onImageUpload,
}: RichEditorProps) {
  // 사용자 입력 중인지 추적 (IME 조합 중 content prop 변경 방지)
  const isUserInputRef = useRef(false)
  // 초기 content 값 저장 (최초 마운트 시점의 값)
  const initialContentRef = useRef(content)
  // 에디터가 초기화되었는지 추적
  const isInitializedRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: styles.editorLink,
        },
      }),
      ImageResize.configure({
        HTMLAttributes: {
          class: styles.editorImage,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      isUserInputRef.current = true
      onChange?.(editor.getHTML())
      // 다음 틱에서 플래그 리셋 (React 상태 업데이트 후)
      setTimeout(() => {
        isUserInputRef.current = false
      }, 0)
    },
    // SSR 호환성을 위해 즉시 렌더링 설정
    immediatelyRender: false,
  })

  // content prop이 변경되면 에디터 내용 업데이트
  // 단, 사용자 입력 중이거나 IME 조합 중일 때는 업데이트하지 않음
  useEffect(() => {
    if (!editor) return

    // 사용자 입력 중이면 무시 (한글 IME 조합 방해 방지)
    if (isUserInputRef.current) return

    const currentHtml = editor.getHTML()

    // 최초 마운트 시점: 에디터 내용이 prop과 다르면 동기화
    // (immediatelyRender: false로 인해 비동기 초기화될 수 있음)
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      // 에디터가 빈 상태(<p></p>)인데 content prop이 있으면 설정
      if (content && content !== '<p></p>' && currentHtml !== content) {
        editor.commands.setContent(content, { emitUpdate: false })
        initialContentRef.current = content
      }
      return
    }

    // 외부에서 content가 변경된 경우에만 업데이트
    // (예: 수정 모드에서 기존 데이터 로드, 프로그래매틱 변경)
    if (content !== currentHtml && content !== initialContentRef.current) {
      editor.commands.setContent(content, { emitUpdate: false })
      initialContentRef.current = content
    }
  }, [content, editor])

  // disabled 상태 변경 시 editable 업데이트
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  // YouTube URL 붙여넣기 시 자동 임베드
  useEffect(() => {
    if (!editor) return

    const handlePaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain')
      if (!text) return

      // YouTube URL 패턴 체크
      const youtubePatterns = [
        /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/,
        /^(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
        /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
        /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
      ]

      const trimmedText = text.trim()
      for (const pattern of youtubePatterns) {
        const match = trimmedText.match(pattern)
        if (match) {
          event.preventDefault()
          const videoId = match[1]
          const embedHtml = `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p></p>`
          editor.chain().focus().insertContent(embedHtml).run()
          return
        }
      }
    }

    // 에디터 DOM 요소에 이벤트 리스너 추가
    const editorElement = editor.view.dom
    editorElement.addEventListener('paste', handlePaste)

    return () => {
      editorElement.removeEventListener('paste', handlePaste)
    }
  }, [editor])

  return (
    <div className={`${styles.editor} ${disabled ? styles.disabled : ''}`}>
      <MenuBar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent
        editor={editor}
        className={styles.content}
        style={{ minHeight }}
      />
    </div>
  )
}
