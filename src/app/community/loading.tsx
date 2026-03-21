export default function CommunityLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#fd68ba]" />
        <span className="text-sm text-zinc-400">커뮤니티 로딩 중...</span>
      </div>
    </div>
  )
}
