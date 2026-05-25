import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"
import remarkGfm from "remark-gfm"

const ReactMarkdown = lazy(() => import("react-markdown"))

interface AutoResizeTextareaProps {
	value: string
	onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	placeholder?: string
	readOnly?: boolean
	className?: string
	minRows?: number
	maxRows?: number
  onKeyDown?: boolean

	// When true, render markdown preview instead of a textarea.
	renderMarkdown?: boolean
	markdownClassName?: string
}

export function AutoResizeTextarea({
	value,
	onChange,
	placeholder,
	readOnly = false,
	className = "",
	minRows = 1,
	maxRows = 20,
	renderMarkdown = false,
	markdownClassName = "",
  //@ts-ignore
  onKeyDown,
}: AutoResizeTextareaProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const previewRef = useRef<HTMLDivElement>(null)

	// Used to clamp preview height to minRows/maxRows like the textarea.
	const [previewLineHeight, setPreviewLineHeight] = useState<number>(20)

	useEffect(() => {
		// Only needed for preview sizing.
		if (!renderMarkdown) return
		const el = previewRef.current
		if (!el) return

		const lh = Number.parseInt(getComputedStyle(el).lineHeight)
		if (Number.isFinite(lh) && lh > 0) setPreviewLineHeight(lh)
	}, [renderMarkdown, markdownClassName])

	useEffect(() => {
		// Auto-resize textarea only in edit mode.
		if (renderMarkdown) return

		const textarea = textareaRef.current
		if (!textarea) return

		// Reset height to auto to get correct scrollHeight.
		textarea.style.height = "auto"

		// Calculate height based on content.
		const scrollHeight = textarea.scrollHeight
		const lineHeight = Number.parseInt(getComputedStyle(textarea).lineHeight) || 20

		// Calculate min/max heights from rows.
		const minHeight = minRows * lineHeight
		const maxHeight = maxRows * lineHeight

		let newHeight = scrollHeight
		if (newHeight < minHeight) newHeight = minHeight

		// Clamp to max and enable scrolling if needed.
		if (newHeight > maxHeight) {
			newHeight = maxHeight
			textarea.style.overflowY = "auto"
		} else {
			textarea.style.overflowY = "hidden"
		}

		textarea.style.height = `${newHeight}px`
	}, [value, minRows, maxRows, renderMarkdown])

	const previewStyle = useMemo<React.CSSProperties>(() => {
		const minHeight = minRows * previewLineHeight
		const maxHeight = maxRows * previewLineHeight
		return {
			minHeight,
			maxHeight,
			overflowY: "auto",
      userSelect: "text",
      cursor: "text",
		}
	}, [minRows, maxRows, previewLineHeight])

  if (renderMarkdown) {
    return (
      <div
        ref={previewRef}
        className={markdownClassName}
        style={previewStyle}
        onMouseDown={e => e.stopPropagation()}
        onDragStart={e => e.preventDefault()}
      >
        <Suspense fallback={<div className="text-xs text-muted-foreground p-2">Loading preview...</div>}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {value || ""}
          </ReactMarkdown>
        </Suspense>
      </div>
    )
  }

	return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`resize-y min-h-0 ${className}`}
      rows={minRows}
    />
	)
}
