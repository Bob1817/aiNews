import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Plus, X, Edit } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/lib/toast'
import { NewsCategory } from '../types'
import { createCategory, deleteCategory, getCategories, updateCategory } from '@/lib/api/categories'
import { getErrorMessage } from '@/lib/errors'
import { getUserProfile, updateUserProfile } from '@/lib/api/settings'
import { getDefaultCategories, getDefaultInterests } from '@/lib/fallbacks'

export function Settings() {
  const [industries, setIndustries] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [newIndustry, setNewIndustry] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  // 分类管理状态
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    // 从后端 API 获取用户设置
    const fetchUserSettings = async () => {
      try {
        const data = await getUserProfile('1')
        setIndustries(data.industries || [])
        setKeywords(data.keywords || [])
      } catch (error) {
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

    // 从后端 API 获取分类
    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const data = await getCategories()
        setCategories(data)
      } catch (error) {
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

  const handleRemoveIndustry = (industry: string) => {
    setIndustries(industries.filter((item) => item !== industry))
  }

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((item) => item !== keyword))
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
        message: '用户设置已更新。',
        variant: 'success',
      })
    } catch (error) {
      console.error('保存设置失败:', error)
      showToast({
        title: '保存失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 分类管理函数
  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      try {
        const newCategory = await createCategory({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim(),
        })
        setCategories([...categories, newCategory])
        setNewCategoryName('')
        setNewCategoryDescription('')
        showToast({
          title: '分类已创建',
          variant: 'success',
        })
      } catch (error) {
        console.error('创建分类失败:', error)
        showToast({
          title: '创建分类失败',
          message: getErrorMessage(error, '请稍后重试'),
          variant: 'error',
        })
      }
    }
  }

  const handleEditCategory = (category: NewsCategory) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setNewCategoryDescription(category.description || '')
  }

  const handleUpdateCategory = async () => {
    if (editingCategory && newCategoryName.trim()) {
      try {
        const updatedCategory = await updateCategory(editingCategory.id, {
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim(),
        })
        setCategories(categories.map(cat => cat.id === editingCategory.id ? updatedCategory : cat))
        setEditingCategory(null)
        setNewCategoryName('')
        setNewCategoryDescription('')
        showToast({
          title: '分类已更新',
          variant: 'success',
        })
      } catch (error) {
        console.error('更新分类失败:', error)
        showToast({
          title: '更新分类失败',
          message: getErrorMessage(error, '请稍后重试'),
          variant: 'error',
        })
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setNewCategoryName('')
    setNewCategoryDescription('')
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id)
      setCategories(categories.filter(cat => cat.id !== id))
      showToast({
        title: '分类已删除',
        variant: 'success',
      })
    } catch (error) {
      console.error('删除分类失败:', error)
      showToast({
        title: '删除分类失败',
        message: getErrorMessage(error, '请稍后重试'),
        variant: 'error',
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            to="/chat"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">用户设置</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">关注的行业</h2>
            <p className="text-gray-500 mb-4">选择您关注的行业，系统将基于这些行业为您推送相关新闻</p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddIndustry()}
                placeholder="添加行业..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddIndustry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {industries.map((industry) => (
                <div
                  key={industry}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg"
                >
                  <span>{industry}</span>
                  <button
                    onClick={() => handleRemoveIndustry(industry)}
                    className="text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">关键词设置</h2>
            <p className="text-gray-500 mb-4">添加关键词，系统将基于这些关键词为您推送相关新闻</p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                placeholder="添加关键词..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddKeyword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <div
                  key={keyword}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
                >
                  <span>{keyword}</span>
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">通知设置</h2>
            <p className="text-gray-500 mb-4">设置新闻推送通知</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">新闻更新通知</p>
                  <p className="text-sm text-gray-500">新闻更新时接收桌面通知</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">每日新闻摘要</p>
                  <p className="text-sm text-gray-500">每天早上 8 点接收新闻摘要</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">新闻分类管理</h2>
            <p className="text-gray-500 mb-4">管理新闻分类，用于新闻的分类展示</p>

            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">{editingCategory ? '编辑分类' : '添加分类'}</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="分类名称"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="分类描述"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  {editingCategory ? (
                    <>
                      <button
                        onClick={handleUpdateCategory}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        保存修改
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleAddCategory}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      添加分类
                    </button>
                  )}
                </div>
              </div>
            </div>

            <h3 className="text-md font-medium text-gray-700 mb-3">分类列表</h3>
            {isLoadingCategories ? (
              <div className="text-center py-8">加载中...</div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无分类</div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-gray-500">{category.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
