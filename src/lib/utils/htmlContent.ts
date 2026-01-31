import DOMPurify from 'dompurify'

/**
 * 콘텐츠가 HTML 형식인지 판별
 * 리치에디터로 작성된 콘텐츠는 HTML 태그를 포함
 */
export function isHTMLContent(content: string): boolean {
  if (!content) return false
  // HTML 태그 패턴 확인 (iframe 포함)
  return /<(p|h[1-6]|ul|ol|li|blockquote|pre|br|strong|em|u|s|a|img|iframe|div)[^>]*>/i.test(content)
}

/**
 * Plain text를 HTML로 변환 (줄바꿈 → <p> 태그)
 */
export function plainTextToHTML(text: string): string {
  if (!text) return ''

  // 연속 줄바꿈을 단락 구분으로 처리
  const paragraphs = text.split(/\n\n+/)

  return paragraphs
    .map(p => {
      // 단일 줄바꿈은 <br>로 변환
      const withBreaks = p.split('\n').join('<br>')
      return `<p>${withBreaks}</p>`
    })
    .join('')
}

/**
 * HTML 콘텐츠 sanitize (XSS 방지)
 * 허용된 태그와 속성만 유지
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''

  // DOMPurify 설정
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'hr', 'div', 'span',
      'iframe',  // 동영상 임베드용
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',  // 링크
      'src', 'alt', 'width', 'height',  // 이미지
      'class', 'style',  // 스타일링
      'frameborder', 'allow', 'allowfullscreen',  // iframe
    ],
    ALLOW_DATA_ATTR: false,  // data-* 속성 차단
    ADD_ATTR: ['target', 'allowfullscreen'],  // 링크에 target, iframe에 allowfullscreen 허용
    // iframe src 화이트리스트 (YouTube, Cloudflare Stream만 허용)
    ALLOWED_URI_REGEXP: /^(?:(?:https?:)?\/\/(?:www\.)?youtube\.com\/embed\/|(?:https?:)?\/\/(?:customer-[a-z0-9]+\.)?cloudflarestream\.com\/|(?:https?:)?\/\/)/i,
  }

  return DOMPurify.sanitize(html, config)
}

/**
 * 콘텐츠를 안전한 HTML로 렌더링
 * - HTML 콘텐츠: sanitize 후 반환
 * - Plain text: HTML로 변환 후 sanitize
 */
export function renderContent(content: string): string {
  if (!content) return ''

  if (isHTMLContent(content)) {
    // 리치에디터로 작성된 HTML
    return sanitizeHTML(content)
  } else {
    // 기존 plain text
    const html = plainTextToHTML(content)
    return sanitizeHTML(html)
  }
}
