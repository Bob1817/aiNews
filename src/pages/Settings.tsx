import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, Briefcase, Edit, Layers3, Plus, Save, Sparkles, Tag, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/lib/toast'
import { NewsCategory } from '../../shared/types'
import { createCategory, deleteCategory, getCategories, updateCategory } from '@/lib/api/categories'
import { getErrorMessage } from '@/lib/errors'
import { getUserProfile, updateUserProfile } from '@/lib/api/settings'
import { getDefaultCategories, getDefaultInterests } from '@/lib/fallbacks'

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-editorial-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function ChipList({
  items,
  tone,
  onRemove,
}: {
  items: string[]
  tone: 'blue' | 'slate'
  onRemove: (value: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-editorial-muted">
        暂无内容，先在上方输入后添加。
      </div>
    )
  }

  const styles =
    tone === 'blue'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-slate-200 bg-slate-100 text-slate-700'

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div key={item} className={`flex items-center gap-2 rounded-full border px-4 py-2 ${styles}`}>
          <span className="text-sm font-medium">{item}</span>
          <button
            onClick={() => onRemove(item)}
            className="rounded-full p-0.5 transition-colors hover:bg-white/70"
            aria-label={`删除 ${item}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function Settings() {
  const [industries, setIndustries] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [newIndustry, setNewIndustry] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const data = await getUserProfile('1')
        setIndustries(data.industries || [])
        setKeywords(data.keywords || [])
      } catch (_error) {
        const defaults = getDefaultInterests()
        setIndustries(defaults.industries)
        setKeywords(defaults.keywords)
        showToast({
          title: '用户设置加载失败',
          message: '已切换为默认兴趣配置。',
          variant: 'info',
        })
      }
    }

    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const data = await getCategories()
        setCategories(data)
      } catch (_error) {
        setCategories(getDefaultCategories())
        showToast({
          title: '分类加载失败',
          message: '已切换为默认分类。',
          variant: 'info',
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchUserSettings()
    fetchCategories()
  }, [showToast])

  const handleAddIndustry = () => {
    if (newIndustry.trim() && !industries.includes(newIndustry.trim())) {
      setIndustries([...industries, newIndustry.trim()])
      setNewIndustry('')
    }
  }

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword('')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateUserProfile({
        userId: '1',
        industries,
        keywords,
      })
      showToast({
        title: '保存成功',
        message: '工作流偏好已更新。',
        variant: 'success',
      })
    } catch (error) {
      showToast({
        title: '保存失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditCategory = (category: NewsCategory) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setNewCategoryDescription(category.description || '')
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setNewCategoryName('')
    setNewCategoryDescription('')
  }

  const handleSubmitCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      if (editingCategory) {
        const updatedCategory = await updateCategory(editingCategory.id, {
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim(),
        })
        setCategories(categories.map((item) => (item.id === editingCategory.id ? updatedCategory : item)))
        showToast({
          title: '分类已更新',
          variant: 'success',
        })
      } else {
        const newCategory = await createCategory({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim(),
        })
        setCategories([...categories, newCategory])
        showToast({
          title: '分类已创建',
          variant: 'success',
        })
      }

      handleCancelEdit()
    } catch (error) {
      showToast({
        title: editingCategory ? '更新分类失败' : '创建分类失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id)
      setCategories(categories.filter((item) => item.id !== id))
      showToast({
        title: '分类已删除',
        variant: 'success',
      })
    } catch (error) {
      showToast({
        title: '删除分类失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    }
  }

  const summary = useMemo(
    () => [
      { label: '关注行业', value: industries.length },
      { label: '关键词', value: keywords.length },
      { label: '自定义分类', value: categories.length },
    ],
    [categories.length, industries.length, keywords.length]
  )

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4">
          <Link
            to="/chat"
            className="focus-ring flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-slate-900">用户设置</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="focus-ring flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <SectionCard
              icon={<Briefcase className="h-5 w-5" />}
              title="关注行业"
              description="影响推荐与推送。"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddIndustry()}
                  placeholder="例如：人工智能、金融科技、制造业"
                  className="focus-ring flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-editorial-muted"
                />
                <button
                  onClick={handleAddIndustry}
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <Plus className="h-4 w-4" />
                  添加行业
                </button>
              </div>
              <ChipList
                items={industries}
                tone="blue"
                onRemove={(industry) => setIndustries(industries.filter((item) => item !== industry))}
              />
            </SectionCard>

            <SectionCard
              icon={<Sparkles className="h-5 w-5" />}
              title="关键词设置"
              description="影响检索与命中。"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                  placeholder="例如：大模型、企业服务、自动化办公"
                  className="focus-ring flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-editorial-muted"
                />
                <button
                  onClick={handleAddKeyword}
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  添加关键词
                </button>
              </div>
              <ChipList
                items={keywords}
                tone="slate"
                onRemove={(keyword) => setKeywords(keywords.filter((item) => item !== keyword))}
              />
            </SectionCard>

            <SectionCard
              icon={<Layers3 className="h-5 w-5" />}
              title="内容分类管理"
              description="分类用于组织任务结果和新闻草稿。把常用分类整理好，后续编辑和发布会更高效。"
            >
              <div className="mb-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                  {editingCategory ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingCategory ? '编辑分类' : '创建分类'}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="分类名称，例如：行业快报"
                    className="focus-ring rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-editorial-muted"
                  />
                  <input
                    type="text"
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    placeholder="分类说明，例如：适合早会汇报的短摘要"
                    className="focus-ring rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-editorial-muted"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleSubmitCategory}
                    className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white transition-colors hover:bg-slate-800"
                  >
                    <Save className="h-4 w-4" />
                    {editingCategory ? '保存修改' : '添加分类'}
                  </button>
                  {editingCategory && (
                    <button
                      onClick={handleCancelEdit}
                      className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                      取消
                    </button>
                  )}
                </div>
              </div>

              {isLoadingCategories ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-editorial-muted">
                  正在加载分类...
                </div>
              ) : categories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-editorial-muted">
                  还没有分类，先创建一个最常用的结果分类。
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-blue-500" />
                          <p className="font-medium text-slate-900">{category.name}</p>
                        </div>
                        {category.description && (
                          <p className="mt-1 text-sm leading-6 text-editorial-muted">{category.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="focus-ring rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="focus-ring rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <span className="eyebrow">Preference Summary</span>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">工作流输入概览</h2>
              <p className="mt-2 text-sm leading-6 text-editorial-muted">
                这些偏好会直接影响新闻推送、新闻助手以及后续更多任务型工作流的输入上下文。
              </p>

              <div className="mt-6 grid gap-3">
                {summary.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-editorial-muted">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <span className="eyebrow">Usage Advice</span>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">推荐设置策略</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-editorial-muted">
                <p>行业建议控制在 3 到 6 个以内，避免新闻推送结果过散。</p>
                <p>关键词尽量使用业务术语、产品名和重点赛道词，而不是宽泛名词。</p>
                <p>分类最好按“使用场景”来拆，比如晨报、深度分析、对外发布，而不是仅按主题拆分。</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
