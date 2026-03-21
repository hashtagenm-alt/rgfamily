'use client'

import type { Column, SelectOption } from './types'

interface InlineCellEditorProps {
  editType?: Column<unknown>['editType']
  editingValue: unknown
  setEditingValue: (value: unknown) => void
  onSave: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  isSaving: boolean
  selectOptions?: SelectOption[]
  /** Auto-save callback for checkbox type */
  onAutoSave?: (value: boolean) => void
}

const inputStyle = {
  padding: '0.25rem 0.5rem',
  border: '1px solid var(--primary)',
  borderRadius: '4px',
  background: 'var(--card-bg)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
}

export function InlineCellEditor({
  editType,
  editingValue,
  setEditingValue,
  onSave,
  onKeyDown,
  isSaving,
  selectOptions,
  onAutoSave,
}: InlineCellEditorProps) {
  if (editType === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={!!editingValue}
        onChange={(e) => {
          setEditingValue(e.target.checked)
          onAutoSave?.(e.target.checked)
        }}
        disabled={isSaving}
        style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
      />
    )
  }

  if (editType === 'select') {
    return (
      <select
        value={String(editingValue ?? '')}
        onChange={(e) => setEditingValue(e.target.value)}
        onBlur={onSave}
        onKeyDown={onKeyDown}
        autoFocus
        disabled={isSaving}
        style={{ ...inputStyle, minWidth: '100px' }}
      >
        {selectOptions?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }

  if (editType === 'number') {
    return (
      <input
        type="number"
        value={String(editingValue ?? '')}
        onChange={(e) => setEditingValue(e.target.valueAsNumber || e.target.value)}
        onBlur={onSave}
        onKeyDown={onKeyDown}
        autoFocus
        disabled={isSaving}
        style={{ ...inputStyle, width: '100%', minWidth: '60px' }}
      />
    )
  }

  if (editType === 'date') {
    return (
      <input
        type="date"
        value={String(editingValue ?? '').split('T')[0]}
        onChange={(e) => setEditingValue(e.target.value)}
        onBlur={onSave}
        onKeyDown={onKeyDown}
        autoFocus
        disabled={isSaving}
        style={{ ...inputStyle, minWidth: '140px' }}
      />
    )
  }

  // Default: text input
  return (
    <input
      type="text"
      value={String(editingValue ?? '')}
      onChange={(e) => setEditingValue(e.target.value)}
      onBlur={onSave}
      onKeyDown={onKeyDown}
      autoFocus
      disabled={isSaving}
      style={{ ...inputStyle, width: '100%', minWidth: '100px' }}
    />
  )
}
