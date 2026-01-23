'use client'

import { useMemo, useCallback } from 'react'
import { Paper, Text, Group, Stack, Badge, Table, Button, ScrollArea, Progress } from '@mantine/core'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Download, AlertTriangle } from 'lucide-react'
import type { DataVerificationItem } from '@/lib/actions/analytics'

interface DataVerificationTableProps {
  data: DataVerificationItem[]
  seasonName?: string
  isLoading?: boolean
  onExportCsv?: () => void
}

// 숫자 포맷
function formatNumber(num: number): string {
  return num.toLocaleString()
}

export default function DataVerificationTable({
  data,
  seasonName = '',
  isLoading = false,
  onExportCsv,
}: DataVerificationTableProps) {
  // 통계 계산
  const stats = useMemo(() => {
    const total = data.length
    const matched = data.filter(d => d.isMatched).length
    const mismatched = total - matched
    const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0

    return { total, matched, mismatched, matchRate }
  }, [data])

  // CSV 내보내기
  const handleExportCsv = useCallback(() => {
    if (onExportCsv) {
      onExportCsv()
      return
    }

    // 기본 CSV 내보내기
    const headers = ['순위', '원본 닉네임', '원본 금액', '처리 닉네임', '처리 금액', '차이', '상태']
    const rows = data.map(d => [
      d.rank,
      d.originalDonorName,
      d.originalAmount,
      d.processedDonorName,
      d.processedAmount,
      d.difference,
      d.isMatched ? '일치' : '불일치',
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `data_verification_${seasonName || 'export'}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [data, seasonName, onExportCsv])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          {/* 헤더 */}
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text size="lg" fw={600}>데이터 검증</Text>
              <Text size="sm" c="dimmed">
                원본 donations vs season_donation_rankings 비교
                {seasonName && ` (${seasonName})`}
              </Text>
            </Stack>

            <Button
              variant="light"
              size="xs"
              leftSection={<Download size={14} />}
              onClick={handleExportCsv}
              disabled={data.length === 0}
            >
              CSV 내보내기
            </Button>
          </Group>

          {/* 요약 통계 */}
          <Group gap="xl">
            <Stack gap={4}>
              <Text size="xs" c="dimmed">전체</Text>
              <Text size="lg" fw={600}>{stats.total}</Text>
            </Stack>
            <Stack gap={4}>
              <Group gap={4}>
                <CheckCircle2 size={14} color="var(--mantine-color-green-6)" />
                <Text size="xs" c="dimmed">일치</Text>
              </Group>
              <Text size="lg" fw={600} c="green">{stats.matched}</Text>
            </Stack>
            <Stack gap={4}>
              <Group gap={4}>
                <XCircle size={14} color="var(--mantine-color-red-6)" />
                <Text size="xs" c="dimmed">불일치</Text>
              </Group>
              <Text size="lg" fw={600} c="red">{stats.mismatched}</Text>
            </Stack>
            <Stack gap={4} style={{ flex: 1, maxWidth: 200 }}>
              <Text size="xs" c="dimmed">일치율</Text>
              <Group gap="xs">
                <Progress
                  value={stats.matchRate}
                  color={stats.matchRate >= 95 ? 'green' : stats.matchRate >= 80 ? 'yellow' : 'red'}
                  size="lg"
                  style={{ flex: 1 }}
                />
                <Text size="sm" fw={600}>{stats.matchRate}%</Text>
              </Group>
            </Stack>
          </Group>

          {/* 불일치 경고 */}
          {stats.mismatched > 0 && (
            <Paper p="sm" bg="red.0" radius="sm">
              <Group gap="xs">
                <AlertTriangle size={16} color="var(--mantine-color-red-6)" />
                <Text size="sm" c="red.7">
                  {stats.mismatched}개 항목에서 불일치가 발견되었습니다. 데이터 동기화가 필요할 수 있습니다.
                </Text>
              </Group>
            </Paper>
          )}

          {/* 테이블 */}
          <ScrollArea h={400}>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 60 }}>순위</Table.Th>
                  <Table.Th>원본 닉네임</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>원본 금액</Table.Th>
                  <Table.Th>처리 닉네임</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>처리 금액</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>차이</Table.Th>
                  <Table.Th style={{ width: 80, textAlign: 'center' }}>상태</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading ? (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text ta="center" c="dimmed" py="xl">로딩 중...</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : data.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text ta="center" c="dimmed" py="xl">데이터가 없습니다</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  data.map((item) => (
                    <Table.Tr
                      key={item.rank}
                      style={{
                        backgroundColor: !item.isMatched ? 'var(--mantine-color-red-0)' : undefined,
                      }}
                    >
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={item.rank <= 3 ? 'yellow' : 'gray'}
                          size="sm"
                        >
                          {item.rank}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text
                          size="sm"
                          fw={!item.isMatched && item.originalDonorName !== item.processedDonorName ? 600 : undefined}
                          c={!item.isMatched && item.originalDonorName !== item.processedDonorName ? 'red' : undefined}
                        >
                          {item.originalDonorName}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm">{formatNumber(item.originalAmount)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text
                          size="sm"
                          fw={!item.isMatched && item.originalDonorName !== item.processedDonorName ? 600 : undefined}
                          c={!item.isMatched && item.originalDonorName !== item.processedDonorName ? 'red' : undefined}
                        >
                          {item.processedDonorName}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm">{formatNumber(item.processedAmount)}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text
                          size="sm"
                          c={item.difference !== 0 ? 'red' : 'dimmed'}
                          fw={item.difference !== 0 ? 600 : undefined}
                        >
                          {item.difference !== 0 ? (item.difference > 0 ? '+' : '') + formatNumber(item.difference) : '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        {item.isMatched ? (
                          <CheckCircle2 size={18} color="var(--mantine-color-green-6)" />
                        ) : (
                          <XCircle size={18} color="var(--mantine-color-red-6)" />
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Stack>
      </Paper>
    </motion.div>
  )
}
