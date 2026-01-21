'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Group,
  Text,
  Button,
  Alert,
  Table,
  Paper,
  Stack,
  ActionIcon,
  Badge,
  ScrollArea,
  Loader,
  Anchor,
  rem,
  CloseButton,
} from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import {
  IconUpload,
  IconFileSpreadsheet,
  IconAlertCircle,
  IconCircleCheck,
  IconTrash,
  IconX,
  IconCopy,
  IconReplace,
  IconPlus,
} from '@tabler/icons-react'
import '@mantine/dropzone/styles.css'

interface CsvRow {
  [key: string]: string
}

export type DuplicateHandling = 'skip' | 'overwrite' | 'accumulate'

interface UploadResult {
  success: number
  errors: string[]
  skipped?: number
  updated?: number
  profilesCreated?: number
}

interface CsvColumn {
  key: string
  altKey?: string // 대체 컬럼명 (랭킹 CSV 등 다른 형식 지원)
  label: string
  required?: boolean
}

interface CsvUploaderProps {
  onUpload: (data: CsvRow[], options?: { duplicateHandling?: DuplicateHandling }) => Promise<UploadResult>
  columns: CsvColumn[]
  sampleFile?: string
  showDuplicateOptions?: boolean
}

export default function CsvUploader({ onUpload, columns, sampleFile, showDuplicateOptions = false }: CsvUploaderProps) {
  const [parsedData, setParsedData] = useState<CsvRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>('skip')

  const parseCSV = useCallback((text: string): CsvRow[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const data: CsvRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: CsvRow = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      data.push(row)
    }

    return data
  }, [])

  const validateData = useCallback((data: CsvRow[]): string[] => {
    const errors: string[] = []
    const requiredColumns = columns.filter(c => c.required)

    data.forEach((row, idx) => {
      requiredColumns.forEach(col => {
        // key 또는 altKey 중 하나라도 값이 있으면 OK
        const hasValue = (row[col.key] && row[col.key].trim() !== '') ||
                         (col.altKey && row[col.altKey] && row[col.altKey].trim() !== '')
        if (!hasValue) {
          errors.push(`Row ${idx + 2}: Missing required field "${col.label}"`)
        }
      })
    })

    return errors
  }, [columns])

  const handleDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const data = parseCSV(text)
      const validationErrors = validateData(data)

      setParsedData(data)
      setErrors(validationErrors)
      setUploadResult(null)
    }
    reader.readAsText(file)
  }, [parseCSV, validateData])

  const handleUpload = async () => {
    if (parsedData.length === 0 || errors.length > 0) return

    setIsUploading(true)
    try {
      const result = await onUpload(parsedData, { duplicateHandling })
      setUploadResult(result)
      if (result.success > 0 && result.errors.length === 0) {
        setParsedData([])
      }
    } catch {
      setUploadResult({
        success: 0,
        errors: ['업로드 중 오류가 발생했습니다.'],
      })
    }
    setIsUploading(false)
  }

  const handleClear = () => {
    setParsedData([])
    setErrors([])
    setUploadResult(null)
  }

  return (
    <Stack gap="md">
      {/* Dropzone */}
      <Dropzone
        onDrop={handleDrop}
        accept={[MIME_TYPES.csv, 'text/csv']}
        maxSize={5 * 1024 * 1024}
        multiple={false}
      >
        <Group justify="center" gap="xl" mih={parsedData.length > 0 ? 80 : 140} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-pink-6)' }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            {parsedData.length === 0 ? (
              <IconUpload
                style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
                stroke={1.5}
              />
            ) : (
              <IconFileSpreadsheet
                style={{ width: rem(40), height: rem(40), color: 'var(--mantine-color-pink-6)' }}
                stroke={1.5}
              />
            )}
          </Dropzone.Idle>

          <div>
            {parsedData.length === 0 ? (
              <>
                <Text size="lg" inline fw={600}>
                  CSV 파일을 드래그하거나 클릭하여 선택
                </Text>
                <Text size="sm" c="dimmed" inline mt={7}>
                  {columns.map(c => c.label).join(', ')} 컬럼이 포함되어야 합니다
                </Text>
                {sampleFile && (
                  <Anchor
                    href={sampleFile}
                    download
                    size="xs"
                    mt="xs"
                    onClick={(e) => e.stopPropagation()}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <Group gap={4}>
                      <IconFileSpreadsheet size={14} />
                      샘플 파일 다운로드
                    </Group>
                  </Anchor>
                )}
              </>
            ) : (
              <Group>
                <div>
                  <Text size="md" fw={600}>
                    {parsedData.length}개 데이터
                  </Text>
                  <Text size="xs" c="dimmed">
                    다시 클릭하여 파일 변경
                  </Text>
                </div>
                <ActionIcon
                  variant="light"
                  color="red"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            )}
          </div>
        </Group>
      </Dropzone>

      {/* Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert
              icon={<IconAlertCircle size={18} />}
              title={`검증 오류 (${errors.length}개)`}
              color="red"
              variant="light"
              radius="md"
            >
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {errors.slice(0, 5).map((err, idx) => (
                  <li key={idx} style={{ fontSize: '0.8125rem' }}>{err}</li>
                ))}
                {errors.length > 5 && (
                  <li style={{ fontStyle: 'italic', color: 'var(--mantine-color-dimmed)' }}>
                    ... 외 {errors.length - 5}개 오류
                  </li>
                )}
              </ul>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Table */}
      {parsedData.length > 0 && errors.length === 0 && (
        <Paper withBorder radius="md" p={0}>
          <Text fw={600} size="sm" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
            미리보기 (처음 5개)
          </Text>
          <ScrollArea>
            <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  {columns.map(col => (
                    <Table.Th key={col.key}>
                      {col.label}
                      {col.required && <Badge size="xs" color="red" ml={4}>필수</Badge>}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {parsedData.slice(0, 5).map((row, idx) => (
                  <Table.Tr key={idx}>
                    {columns.map(col => {
                      // key 또는 altKey 중 값이 있는 것 표시
                      const value = row[col.key] || (col.altKey ? row[col.altKey] : '') || '-'
                      return <Table.Td key={col.key}>{value}</Table.Td>
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      )}

      {/* Duplicate Handling Options */}
      {showDuplicateOptions && parsedData.length > 0 && errors.length === 0 && (
        <Paper withBorder radius="md" p="md">
          <Text fw={600} size="sm" mb="sm">중복 데이터 처리 방식</Text>
          <Group gap="sm">
            <Button
              variant={duplicateHandling === 'skip' ? 'filled' : 'light'}
              color={duplicateHandling === 'skip' ? 'pink' : 'gray'}
              size="sm"
              leftSection={<IconCopy size={16} />}
              onClick={() => setDuplicateHandling('skip')}
            >
              건너뛰기
            </Button>
            <Button
              variant={duplicateHandling === 'overwrite' ? 'filled' : 'light'}
              color={duplicateHandling === 'overwrite' ? 'pink' : 'gray'}
              size="sm"
              leftSection={<IconReplace size={16} />}
              onClick={() => setDuplicateHandling('overwrite')}
            >
              덮어쓰기
            </Button>
            <Button
              variant={duplicateHandling === 'accumulate' ? 'filled' : 'light'}
              color={duplicateHandling === 'accumulate' ? 'pink' : 'gray'}
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => setDuplicateHandling('accumulate')}
            >
              누적
            </Button>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            {duplicateHandling === 'skip' && '동일한 후원자+날짜의 기존 데이터가 있으면 건너뜁니다.'}
            {duplicateHandling === 'overwrite' && '동일한 후원자+날짜의 기존 데이터를 새 데이터로 교체합니다.'}
            {duplicateHandling === 'accumulate' && '동일한 후원자+날짜의 기존 데이터에 금액을 누적합니다.'}
          </Text>
        </Paper>
      )}

      {/* Upload Result */}
      <AnimatePresence>
        {uploadResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert
              icon={uploadResult.errors.length === 0 ? <IconCircleCheck size={20} /> : <IconAlertCircle size={20} />}
              color={uploadResult.errors.length === 0 ? 'green' : 'red'}
              variant="light"
              radius="md"
              withCloseButton
              onClose={() => setUploadResult(null)}
            >
              {uploadResult.errors.length === 0 ? (
                <Stack gap={4}>
                  <Text fw={500}>업로드 완료!</Text>
                  <Group gap="md">
                    {uploadResult.success > 0 && (
                      <Badge color="green" variant="light" size="sm">
                        신규 등록: {uploadResult.success}건
                      </Badge>
                    )}
                    {(uploadResult.updated ?? 0) > 0 && (
                      <Badge color="blue" variant="light" size="sm">
                        업데이트: {uploadResult.updated}건
                      </Badge>
                    )}
                    {(uploadResult.skipped ?? 0) > 0 && (
                      <Badge color="gray" variant="light" size="sm">
                        건너뜀: {uploadResult.skipped}건
                      </Badge>
                    )}
                    {(uploadResult.profilesCreated ?? 0) > 0 && (
                      <Badge color="cyan" variant="light" size="sm">
                        프로필 생성: {uploadResult.profilesCreated}건
                      </Badge>
                    )}
                  </Group>
                </Stack>
              ) : (
                <>
                  <Group gap="md" mb="xs">
                    {uploadResult.success > 0 && (
                      <Badge color="green" variant="light" size="sm">
                        성공: {uploadResult.success}건
                      </Badge>
                    )}
                    {(uploadResult.updated ?? 0) > 0 && (
                      <Badge color="blue" variant="light" size="sm">
                        업데이트: {uploadResult.updated}건
                      </Badge>
                    )}
                    {(uploadResult.skipped ?? 0) > 0 && (
                      <Badge color="gray" variant="light" size="sm">
                        건너뜀: {uploadResult.skipped}건
                      </Badge>
                    )}
                    {(uploadResult.profilesCreated ?? 0) > 0 && (
                      <Badge color="cyan" variant="light" size="sm">
                        프로필 생성: {uploadResult.profilesCreated}건
                      </Badge>
                    )}
                    <Badge color="red" variant="light" size="sm">
                      실패: {uploadResult.errors.length}건
                    </Badge>
                  </Group>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem' }}>
                    {uploadResult.errors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </>
              )}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Button */}
      {parsedData.length > 0 && (
        <Button
          size="md"
          radius="md"
          color="pink"
          leftSection={isUploading ? <Loader size={18} color="white" /> : <IconUpload size={18} />}
          onClick={handleUpload}
          disabled={isUploading || errors.length > 0}
          fullWidth
        >
          {isUploading ? '업로드 중...' : `${parsedData.length}개 데이터 업로드`}
        </Button>
      )}
    </Stack>
  )
}
