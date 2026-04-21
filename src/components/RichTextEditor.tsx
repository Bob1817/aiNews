import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import {
  Bold,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react'

type RichTextEditorProps = {
  value: string
  placeholder?: string
  disabled?: boolean
  onChange: (value: string) => void
  onUploadImage?: (file: File) => Promise<string>
}

function ToolbarButton({
  active = false,
  disabled = false,
  onClick,
  children,
  title,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-slate-600 transition ${
        active
          ? 'border-sky-300 bg-sky-50 text-sky-700'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  placeholder = '输入正文内容',
  disabled = false,
  onChange,
  onUploadImage,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '<p></p>',
    editable: !disabled,
    immediatelyRender: true,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.isEmpty ? '' : currentEditor.getHTML())
    },
  }, [placeholder])

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.setEditable(!disabled)
  }, [disabled, editor])

  const toolbarActions = useMemo(
    () =>
      editor
        ? [
            {
              key: 'bold',
              title: '加粗',
              icon: <Bold className="h-4 w-4" />,
              active: editor.isActive('bold'),
              onClick: () => editor.chain().focus().toggleBold().run(),
            },
            {
              key: 'italic',
              title: '斜体',
              icon: <Italic className="h-4 w-4" />,
              active: editor.isActive('italic'),
              onClick: () => editor.chain().focus().toggleItalic().run(),
            },
            {
              key: 'strike',
              title: '删除线',
              icon: <Strikethrough className="h-4 w-4" />,
              active: editor.isActive('strike'),
              onClick: () => editor.chain().focus().toggleStrike().run(),
            },
            {
              key: 'heading1',
              title: '一级标题',
              icon: <Heading1 className="h-4 w-4" />,
              active: editor.isActive('heading', { level: 1 }),
              onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            },
            {
              key: 'heading2',
              title: '二级标题',
              icon: <Heading2 className="h-4 w-4" />,
              active: editor.isActive('heading', { level: 2 }),
              onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            },
            {
              key: 'bullet',
              title: '无序列表',
              icon: <List className="h-4 w-4" />,
              active: editor.isActive('bulletList'),
              onClick: () => editor.chain().focus().toggleBulletList().run(),
            },
            {
              key: 'ordered',
              title: '有序列表',
              icon: <ListOrdered className="h-4 w-4" />,
              active: editor.isActive('orderedList'),
              onClick: () => editor.chain().focus().toggleOrderedList().run(),
            },
            {
              key: 'quote',
              title: '引用',
              icon: <Quote className="h-4 w-4" />,
              active: editor.isActive('blockquote'),
              onClick: () => editor.chain().focus().toggleBlockquote().run(),
            },
          ]
        : [],
    [editor]
  )

  const handleUploadImage = async (file: File | null) => {
    if (!editor || !file || !onUploadImage) {
      return
    }

    try {
      setIsUploadingImage(true)
      const imageUrl = await onUploadImage(file)
      editor.chain().focus().setImage({ src: imageUrl, alt: file.name }).run()
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex h-[min(72vh,900px)] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
      <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-slate-200 bg-white/95 p-3 backdrop-blur">
        {toolbarActions.map((action) => (
          <ToolbarButton
            key={action.key}
            title={action.title}
            active={action.active}
            disabled={disabled}
            onClick={action.onClick}
          >
            {action.icon}
          </ToolbarButton>
        ))}

        <ToolbarButton
          title="撤销"
          disabled={disabled || !editor?.can().chain().focus().undo().run()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="重做"
          disabled={disabled || !editor?.can().chain().focus().redo().run()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="上传图片"
          disabled={disabled || isUploadingImage || !onUploadImage}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleUploadImage(event.target.files?.[0] || null)}
        />
      </div>

      <EditorContent editor={editor} className="rich-editor flex-1 overflow-y-auto px-5 py-4" />
    </div>
  )
}
