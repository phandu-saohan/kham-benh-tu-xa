import React, { useState, useEffect, useRef } from 'react'
import { Calendar as CalendarIcon, CheckCircle2, AlertCircle } from 'lucide-react'

export interface DateOfBirthInputProps {
  value: string // Format ISO 'YYYY-MM-DD' hoặc 'DD/MM/YYYY' hoặc rỗng ''
  onChange: (isoValue: string, displayValue?: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  inputStyle?: React.CSSProperties
  label?: string
  id?: string
  name?: string
  autoFocus?: boolean
  showAgeBadge?: boolean
  error?: string
}

/**
 * Tính toán tuổi chính xác từ ngày sinh (ISO YYYY-MM-DD hoặc DD/MM/YYYY)
 */
export function calculateAge(val: string): { years: number; months: number; text: string } | null {
  if (!val) return null
  const s = val.trim()
  let y = 0, m = 0, d = 0

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const parts = s.split('-').map(Number)
    y = parts[0]; m = parts[1]; d = parts[2]
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split('/').map(Number)
    d = parts[0]; m = parts[1]; y = parts[2]
  } else {
    return null
  }

  if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900) return null

  const today = new Date()
  const birthDate = new Date(y, m - 1, d)
  if (isNaN(birthDate.getTime()) || birthDate > today) return null

  let years = today.getFullYear() - birthDate.getFullYear()
  let mDiff = today.getMonth() - birthDate.getMonth()
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
    years--
    mDiff += 12
  }

  if (years > 0) {
    return { years, months: mDiff, text: `${years} tuổi` }
  } else {
    const totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth())
    const months = Math.max(0, today.getDate() < birthDate.getDate() ? totalMonths - 1 : totalMonths)
    if (months > 0) {
      return { years: 0, months, text: `${months} tháng tuổi` }
    }
    const diffDays = Math.max(0, Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)))
    return { years: 0, months: 0, text: `${diffDays} ngày tuổi` }
  }
}

/**
 * Kiểm tra tính hợp lệ của ngày, tháng, năm
 */
export function isValidDateParts(day: number, month: number, year: number): boolean {
  const currentYear = new Date().getFullYear()
  if (year < 1900 || year > currentYear) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false

  const daysInMonth = new Date(year, month, 0).getDate()
  if (day > daysInMonth) return false

  const targetDate = new Date(year, month - 1, day)
  const today = new Date()
  if (targetDate > today) return false

  return true
}

/**
 * Chuyển đổi định dạng ISO YYYY-MM-DD sang hiển thị DD/MM/YYYY
 */
export function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const s = iso.trim()
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-')
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/')
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  return s
}

/**
 * Phân tích chuỗi người dùng gõ hoặc dán thành định dạng ISO YYYY-MM-DD
 */
export function parseToIso(raw: string): string {
  if (!raw) return ''
  const s = raw.trim()

  // 1. Đã là chuẩn ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    if (isValidDateParts(d, m, y)) return s
    return ''
  }

  // 2. Chứa dấu gạch /, -, hoặc .
  if (/[\/\-\.]/.test(s)) {
    const parts = s.split(/[\/\-\.]/).map(p => p.trim())
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10)
        const d = parseInt(parts[2], 10)
        if (isValidDateParts(d, m, y)) {
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        }
      } else {
        // DD/MM/YYYY
        const d = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10)
        const y = parseInt(parts[2], 10)
        if (parts[2].length === 4 && isValidDateParts(d, m, y)) {
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        }
      }
    }
  }

  // 3. Chuỗi số liền nhau: 8 chữ số DDMMYYYY
  const digits = s.replace(/\D/g, '')
  if (digits.length === 8) {
    const d = parseInt(digits.slice(0, 2), 10)
    const m = parseInt(digits.slice(2, 4), 10)
    const y = parseInt(digits.slice(4, 8), 10)
    if (isValidDateParts(d, m, y)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  return ''
}

export const DateOfBirthInput: React.FC<DateOfBirthInputProps> = ({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY (ví dụ: 24/09/1990)',
  required = false,
  disabled = false,
  className = '',
  style,
  inputStyle,
  label,
  id,
  name,
  autoFocus = false,
  showAgeBadge = true,
  error
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => isoToDisplay(value))
  const [inputError, setInputError] = useState<string | null>(null)
  const hiddenDateRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastDisplayRef = useRef<string>(displayValue)

  // Đồng bộ khi prop `value` từ bên ngoài thay đổi (ví dụ: khi quét QR CCCD hoặc tải dữ liệu)
  useEffect(() => {
    const currentIso = parseToIso(displayValue)
    if (value !== currentIso) {
      const formatted = isoToDisplay(value)
      setDisplayValue(formatted)
      lastDisplayRef.current = formatted
      if (value) {
        setInputError(null)
      }
    }
  }, [value])

  // Tính tuổi thời gian thực
  const ageInfo = calculateAge(displayValue || value)

  // Xử lý khi người dùng gõ phím
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const prev = lastDisplayRef.current
    const isDeleting = raw.length < prev.length

    // Nếu người dùng dán hoặc gõ chuỗi
    let formatted = raw

    if (!isDeleting) {
      // Nếu dán chuỗi ISO YYYY-MM-DD
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw.trim())) {
        formatted = isoToDisplay(raw.trim())
      } else {
        // Chỉ giữ số và dấu gạch /
        const digits = raw.replace(/\D/g, '').slice(0, 8)
        if (digits.length <= 2) {
          formatted = digits
          if (digits.length === 2 && !raw.includes('/')) {
            formatted = digits + '/'
          }
        } else if (digits.length <= 4) {
          formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
          if (digits.length === 4 && raw.split('/').length < 3) {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2)}/`
          }
        } else {
          formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
        }
      }
    }

    setDisplayValue(formatted)
    lastDisplayRef.current = formatted

    // Thử phân tích thành ISO
    const iso = parseToIso(formatted)
    if (iso) {
      setInputError(null)
      onChange(iso, formatted)
    } else {
      if (formatted.replace(/\D/g, '').length === 8) {
        setInputError('Ngày sinh không hợp lệ. Vui lòng kiểm tra lại ngày, tháng hoặc năm sinh.')
      } else {
        setInputError(null)
      }
      // Chưa đủ hoặc không hợp lệ -> thông báo rỗng cho form
      onChange('', formatted)
    }
  }

  // Xử lý khi blur: Tự động format thêm số 0 nếu người dùng nhập 1/5/1990
  const handleBlur = () => {
    if (!displayValue) {
      setInputError(null)
      return
    }

    const s = displayValue.trim()
    if (/[\/\-\.]/.test(s)) {
      const parts = s.split(/[\/\-\.]/).map(p => p.trim())
      if (parts.length === 3) {
        let d = parts[0]
        let m = parts[1]
        let y = parts[2]
        if (parts[0].length === 4) {
          y = parts[0]
          m = parts[1]
          d = parts[2]
        }
        if (d && m && y && y.length === 4) {
          const dPad = d.padStart(2, '0')
          const mPad = m.padStart(2, '0')
          const normalized = `${dPad}/${mPad}/${y}`
          setDisplayValue(normalized)
          lastDisplayRef.current = normalized
          const iso = parseToIso(normalized)
          if (iso) {
            setInputError(null)
            onChange(iso, normalized)
          } else {
            setInputError('Ngày sinh không hợp lệ hoặc nằm trong tương lai.')
          }
          return
        }
      }
    }

    const iso = parseToIso(displayValue)
    if (!iso && displayValue.replace(/\D/g, '').length > 0) {
      setInputError('Ngày sinh không hợp lệ. Định dạng chuẩn: DD/MM/YYYY (ví dụ: 24/09/1990).')
    } else {
      setInputError(null)
    }
  }

  // Xử lý phím Backspace thông minh trên mobile/desktop để không bị kẹt ở dấu gạch /
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const input = e.currentTarget
      const { selectionStart, selectionEnd, value: curVal } = input
      if (selectionStart !== null && selectionStart === selectionEnd) {
        // Nếu con trỏ nằm ngay sau dấu '/' (ví dụ: vị trí 3 hoặc 6)
        if (selectionStart === 3 || selectionStart === 6) {
          e.preventDefault()
          const nextVal = curVal.slice(0, selectionStart - 2) + curVal.slice(selectionStart)
          setDisplayValue(nextVal)
          lastDisplayRef.current = nextVal
          setTimeout(() => {
            if (inputRef.current) {
              const newPos = Math.max(0, selectionStart - 2)
              inputRef.current.setSelectionRange(newPos, newPos)
            }
          }, 0)
        }
      }
    }
  }

  // Mở trình chọn ngày native khi bấm vào icon lịch
  const handleOpenCalendar = () => {
    if (disabled) return
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        try {
          hiddenDateRef.current.showPicker()
        } catch {
          hiddenDateRef.current.focus()
          hiddenDateRef.current.click()
        }
      } else {
        hiddenDateRef.current.focus()
        hiddenDateRef.current.click()
      }
    }
  }

  // Khi chọn từ date picker native
  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosenIso = e.target.value
    if (chosenIso) {
      const formatted = isoToDisplay(chosenIso)
      setDisplayValue(formatted)
      lastDisplayRef.current = formatted
      setInputError(null)
      onChange(chosenIso, formatted)
    }
  }

  const currentIso = parseToIso(displayValue) || (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '')
  const maxTodayIso = new Date().toISOString().split('T')[0]

  return (
    <div style={{ width: '100%', ...style }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 700,
            color: '#334155',
            marginBottom: '4px'
          }}
        >
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          pattern="[0-9/]*"
          autoComplete="bday"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          value={displayValue}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '10px',
            border: inputError || error ? '1px solid #ef4444' : '1px solid #cbd5e1',
            padding: '0 44px 0 12px',
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#0f172a',
            background: disabled ? '#f1f5f9' : '#ffffff',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            letterSpacing: displayValue ? '0.5px' : 'normal',
            ...inputStyle
          }}
        />

        {/* Nút biểu tượng Lịch (Click để mở lịch chọn nếu muốn) */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={handleOpenCalendar}
          title="Nhập tay trực tiếp hoặc bấm để mở lịch chọn"
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s, background 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.color = '#0f766e'
              e.currentTarget.style.background = '#f1f5f9'
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.color = '#64748b'
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          <CalendarIcon size={18} />
        </button>

        {/* Input date ẩn hỗ trợ mở Native Picker */}
        <input
          ref={hiddenDateRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          max={maxTodayIso}
          min="1900-01-01"
          value={currentIso}
          onChange={handleNativePickerChange}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            width: 0,
            height: 0,
            bottom: 0,
            right: 0
          }}
        />
      </div>

      {/* Dòng trợ giúp: Tính tuổi tự động & cảnh báo lỗi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', minHeight: '18px', flexWrap: 'wrap', gap: '6px' }}>
        {(inputError || error) ? (
          <span style={{ fontSize: '11.5px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <AlertCircle size={13} /> {inputError || error}
          </span>
        ) : ageInfo && showAgeBadge ? (
          <span style={{
            fontSize: '11.5px',
            color: '#0f766e',
            background: '#f0fdfa',
            border: '1px solid #ccfbf1',
            padding: '2px 8px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 700
          }}>
            <CheckCircle2 size={13} color="#0d9488" />
            {ageInfo.text} (sinh năm {parseToIso(displayValue).split('-')[0]})
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Nhập tay theo thứ tự: Ngày / Tháng / Năm (VD: 24091990 hoặc 24/09/1990)
          </span>
        )}
      </div>
    </div>
  )
}

export default DateOfBirthInput
