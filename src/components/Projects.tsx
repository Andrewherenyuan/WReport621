import { useState, useEffect, useRef, type ChangeEvent } from 'react'

interface Project {
  id: number
  title: string
  description: string
  images: string[]
  date: string
  status: '进行中' | '已上线' | '已完成' | '未开始'
  initiator: {
    name: string
    avatar: string
  }
  tags: string[]
}

const statusColors: Record<string, string> = {
  '未开始': 'bg-white/10 text-white/60',
  '进行中': 'bg-accent-purple/20 text-accent-purple',
  '已上线': 'bg-accent-cyan/20 text-accent-cyan',
  '已完成': 'bg-green-500/20 text-green-400',
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [editMode, setEditMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const host = window.location.hostname
    return host === 'localhost' || host === '127.0.0.1' || host === ''
  })
  const [isVisible, setIsVisible] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [editingProject, setEditingProject] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadProjectId, setUploadProjectId] = useState<number | null>(null)
  const [showDateModal, setShowDateModal] = useState(false)
  const [dateProjectId, setDateProjectId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarProjectId, setAvatarProjectId] = useState<number | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusProjectId, setStatusProjectId] = useState<number | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [previewImageIndex, setPreviewImageIndex] = useState(0)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [galleryProjectId, setGalleryProjectId] = useState<number | null>(null)
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameProjectId, setNameProjectId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importError, setImportError] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)
  const exportData = () => {
    const data = { projects }
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'projects-backup.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowSaveModal(false)
  }
  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const data = JSON.parse(text)
        if (data.projects && Array.isArray(data.projects)) {
          setProjects(data.projects)
          localStorage.setItem('weekly_projects', JSON.stringify(data.projects))
          setShowImportModal(false)
          setImportError('')
        } else {
          setImportError('文件格式错误，缺少 projects 数组')
        }
      } catch {
        setImportError('文件解析失败，请选择有效的 JSON 文件')
      }
    }
    reader.readAsText(file)
  }
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    date: '',
    status: '未开始' as '进行中' | '已上线' | '已完成' | '未开始',
    initiator: { name: '', avatar: '' },
    tags: [] as string[],
    images: [] as string[]
  })
  const sectionRef = useRef<HTMLElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const multiImageInputRef = useRef<HTMLInputElement>(null)
  // 每个项目卡片的轮播状态
  const [slideIndex, setSlideIndex] = useState<Record<number, number>>({})
  const slideTimers = useRef<Record<number, ReturnType<typeof setInterval>>>({})

  // 加载项目数据：始终以 projects.json 文件为唯一数据源，忽略 localStorage 缓存
  useEffect(() => {
    const loadData = async () => {
      try {
        // 从 projects.json 文件读取（作为唯一真实数据源）
        const res = await fetch('/data/projects.json?_=' + Date.now(), { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const converted = (data.projects || []).map((project: any) => {
            if (project.image && !project.images) {
              return { ...project, images: [project.image] }
            }
            return project
          })

          // 始终使用 projects.json 的数据，不再从 localStorage 读取旧数据
          setProjects(converted)
          localStorage.setItem('weekly_projects', JSON.stringify(converted))
          setDataLoaded(true)
          return
        }

        // 4. JSON 文件读取失败时，回退到 localStorage
        const saved = localStorage.getItem('weekly_projects')
        if (saved) {
          const parsed = JSON.parse(saved)
          const converted = parsed.map((project: any) => {
            if (project.image && !project.images) {
              return { ...project, images: [project.image] }
            }
            return project
          })
          setProjects(converted)
        }
      } catch (err) {
        console.warn('加载项目数据失败，使用默认数据')
      }
      setDataLoaded(true)
    }
    loadData()
  }, [])

  // 监听时间段选择变化
  useEffect(() => {
    const handlePeriodChange = (e: CustomEvent) => {
      const dates = e.detail as string[]
      setSelectedDates(dates)
      
      // 滚动到当前选中的项目组
      setTimeout(() => {
        // 找到第一个匹配的项目
        const firstMatch = projects.find(p => dates.includes(p.date))
        if (firstMatch) {
          const element = document.getElementById(`project-${firstMatch.id}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // 添加高亮效果
            element.classList.add('ring-2', 'ring-accent-cyan', 'ring-offset-2', 'ring-offset-dark-800')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-accent-cyan', 'ring-offset-2', 'ring-offset-dark-800')
            }, 2000)
          }
        }
      }, 500)
    }

    window.addEventListener('periodChange', handlePeriodChange as EventListener)
    
    // 检查localStorage中是否有选中的周日期
    const storedDates = localStorage.getItem('selected_week_dates')
    if (storedDates) {
      try {
        const dates = JSON.parse(storedDates)
        setSelectedDates(dates)
      } catch (e) {
        console.warn('解析存储的日期失败')
      }
    }

    return () => {
      window.removeEventListener('periodChange', handlePeriodChange as EventListener)
    }
  }, [projects])

  // 保存到 localStorage（每次 projects 变化时自动保存）
  useEffect(() => {
    if (dataLoaded && projects.length > 0) {
      setSaveStatus('saving')
      localStorage.setItem('weekly_projects', JSON.stringify(projects))
      setTimeout(() => setSaveStatus('saved'), 300)
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }, [projects, dataLoaded])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleEditClick = (project: Project) => {
    setEditingProject(project.id)
    setEditTitle(project.title)
    setEditDesc(project.description)
  }

  const handleSaveEdit = () => {
    const project = projects.find(p => p.id === editingProject)
    if (project) {
      project.title = editTitle
      project.description = editDesc
    }
    setEditingProject(null)
  }

  // ========== 图片压缩 ==========
  // 如果图片超过 500KB，自动压缩到 500KB 以内；返回 { blob, dataUrl }
  const compressImage = (file: File): Promise<{ blob: Blob; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const dataUrlFromBlob = (b: Blob): Promise<string> =>
        new Promise((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(r.result as string)
          r.onerror = () => rej(r.error)
          r.readAsDataURL(b)
        })

      // 小于 500KB 的图片直接返回
      if (file.size <= 500 * 1024) {
        dataUrlFromBlob(file).then((dataUrl) => resolve({ blob: file, dataUrl })).catch(reject)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const maxSizeBytes = 500 * 1024
          let quality = 0.85
          let width = img.width
          let height = img.height

          const tryCompress = () => {
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              resolve({ blob: file, dataUrl: e.target?.result as string })
              return
            }
            ctx.fillStyle = '#fff'
            ctx.fillRect(0, 0, width, height)
            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve({ blob: file, dataUrl: e.target?.result as string })
                  return
                }
                if (blob.size <= maxSizeBytes || quality <= 0.3) {
                  dataUrlFromBlob(blob).then((dataUrl) => resolve({ blob, dataUrl }))
                  return
                }
                if (quality > 0.4) {
                  quality -= 0.15
                  tryCompress()
                  return
                }
                const newWidth = Math.round(width * 0.85)
                if (newWidth < 400) {
                  dataUrlFromBlob(blob).then((dataUrl) => resolve({ blob, dataUrl }))
                  return
                }
                width = newWidth
                height = Math.round((newWidth / img.width) * img.height)
                quality = 0.7
                tryCompress()
              },
              'image/jpeg',
              quality
            )
          }

          tryCompress()
        }
        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  // 上传图片到后端（保存到 Pic/ 目录），失败时降级为 dataURL
  const uploadToBackend = async (file: File | Blob, filename: string): Promise<string> => {
    try {
      const form = new FormData()
      form.append('file', file, filename)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (res.ok) {
        const body = await res.json()
        if (body && body.ok && body.url) return body.url
      }
    } catch (err) {
      console.warn('[upload] 上传到后端失败，将使用 dataURL 作为降级:', err)
    }
    // 降级：把文件内容编码为 dataURL
    return await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => reject(r.error)
      r.readAsDataURL(file)
    })
  }

  // 同步项目数据到后端 projects.json（仅本地开发环境有效）
  const saveProjectsToFile = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ projects }),
      })
      if (res.ok) return true
    } catch (err) {
      console.warn('[save] 写回 projects.json 失败:', err)
    }
    return false
  }

  const handleUploadClick = (projectId: number) => {
    setGalleryProjectId(projectId)
    setShowGalleryModal(true)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && uploadProjectId) {
      const project = projects.find(p => p.id === uploadProjectId)
      if (project) {
        Array.from(files).forEach(async (file) => {
          try {
            const { blob } = await compressImage(file)
            // 上传到后端，保存到 Pic/ 目录；失败时降级为 dataURL
            const url = await uploadToBackend(blob, file.name || 'upload.jpg')
            if (!project.images.includes(url)) {
              project.images = [...project.images, url]
              setProjects([...projects])
              // 触发一次后端 projects.json 保存（异步，不阻塞 UI）
              setTimeout(() => saveProjectsToFile(), 200)
            }
          } catch (err) {
            console.error('图片处理失败:', err)
          }
        })
      }
      setShowUploadModal(false)
      setUploadProjectId(null)
    }
  }

  const handleMultiImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && galleryProjectId) {
      const project = projects.find(p => p.id === galleryProjectId)
      if (project) {
        Array.from(files).forEach(async (file) => {
          try {
            const { blob } = await compressImage(file)
            const url = await uploadToBackend(blob, file.name || 'upload.jpg')
            if (!project.images.includes(url)) {
              project.images = [...project.images, url]
              setProjects([...projects])
              setTimeout(() => saveProjectsToFile(), 200)
            }
          } catch (err) {
            console.error('图片处理失败:', err)
          }
        })
      }
    }
  }

  // ========== 轮播控制 ==========
  const getSlideIndex = (projectId: number, totalImages: number) => {
    const idx = slideIndex[projectId]
    if (idx === undefined || idx < 0 || idx >= totalImages) return 0
    return idx
  }

  const goToSlide = (projectId: number, imageIndex: number, totalImages: number) => {
    const safeIndex = ((imageIndex % totalImages) + totalImages) % totalImages
    setSlideIndex((prev) => ({ ...prev, [projectId]: safeIndex }))
  }

  const nextSlide = (projectId: number, totalImages: number) => {
    const current = getSlideIndex(projectId, totalImages)
    goToSlide(projectId, current + 1, totalImages)
  }

  const prevSlide = (projectId: number, totalImages: number) => {
    const current = getSlideIndex(projectId, totalImages)
    goToSlide(projectId, current - 1, totalImages)
  }

  const startAutoSlide = (projectId: number, totalImages: number) => {
    // 先停止已有计时器防止叠加
    if (slideTimers.current[projectId]) {
      clearInterval(slideTimers.current[projectId])
    }
    if (totalImages <= 1) return
    slideTimers.current[projectId] = setInterval(() => {
      setSlideIndex((prev) => {
        const current = prev[projectId] ?? 0
        const next = (current + 1) % totalImages
        return { ...prev, [projectId]: next }
      })
    }, 3500)
  }

  const stopAutoSlide = (projectId: number) => {
    if (slideTimers.current[projectId]) {
      clearInterval(slideTimers.current[projectId])
      delete slideTimers.current[projectId]
    }
  }

  // 组件卸载时清理所有计时器
  useEffect(() => {
    return () => {
      Object.values(slideTimers.current).forEach((timer) => clearInterval(timer))
      slideTimers.current = {}
    }
  }, [])

  // 注入进度条 keyframes CSS
  useEffect(() => {
    const styleId = 'projects-carousel-keyframes'
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes carousel-progress {
        0% { transform: scaleX(0); }
        100% { transform: scaleX(1); }
      }
    `
    document.head.appendChild(style)
  }, [])

  const handleDeleteImage = (projectId: number, imageIndex: number) => {
    const project = projects.find(p => p.id === projectId)
    if (project && project.images.length > 1) {
      project.images = project.images.filter((_, idx) => idx !== imageIndex)
      setProjects([...projects])
    }
  }

  const handleGalleryImageClick = (images: string[], index: number) => {
    setPreviewImages(images)
    setPreviewImageIndex(index)
    setPreviewImage(images[index])
    setShowGalleryModal(false)
    setShowImageModal(true)
  }

  const handleDateClick = (projectId: number, currentDate: string) => {
    setDateProjectId(projectId)
    setSelectedDate(currentDate)
    setShowDateModal(true)
  }

  const handleSaveDate = () => {
    const project = projects.find(p => p.id === dateProjectId)
    if (project) {
      project.date = selectedDate
    }
    setShowDateModal(false)
    setDateProjectId(null)
  }

  const generateDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      dates.push({
        label: `${date.getMonth() + 1}月${date.getDate()}日`,
        value: `${date.getMonth() + 1}月${date.getDate()}日`
      })
    }
    return dates
  }

  const handleAvatarClick = (projectId: number) => {
    setAvatarProjectId(projectId)
    setShowAvatarModal(true)
  }

  const handleStatusClick = (projectId: number) => {
    setStatusProjectId(projectId)
    setShowStatusModal(true)
  }

  const handleSelectStatus = (status: '未开始' | '进行中' | '已完成') => {
    const project = projects.find(p => p.id === statusProjectId)
    if (project) {
      project.status = status
    }
    setShowStatusModal(false)
    setStatusProjectId(null)
  }

  const handleImageClick = (image: string, images: string[], index: number) => {
    setPreviewImages(images)
    setPreviewImageIndex(index)
    setPreviewImage(image)
    setShowImageModal(true)
  }

  const handlePrevImage = () => {
    const newIndex = previewImageIndex > 0 ? previewImageIndex - 1 : previewImages.length - 1
    setPreviewImageIndex(newIndex)
    setPreviewImage(previewImages[newIndex])
  }

  const handleNextImage = () => {
    const newIndex = previewImageIndex < previewImages.length - 1 ? previewImageIndex + 1 : 0
    setPreviewImageIndex(newIndex)
    setPreviewImage(previewImages[newIndex])
  }

  const handleNameClick = (projectId: number, currentName: string) => {
    setNameProjectId(projectId)
    setEditName(currentName)
    setShowNameModal(true)
  }

  const handleSaveName = () => {
    const project = projects.find(p => p.id === nameProjectId)
    if (project && editName.trim()) {
      project.initiator.name = editName.trim()
    }
    setShowNameModal(false)
    setNameProjectId(null)
    setEditName('')
  }

  const handleAddProject = () => {
    if (!newProject.title.trim() || !newProject.description.trim()) return
    
    const maxId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) : 0
    const defaultImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="gn" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230ea5e9"/><stop offset="100%" stop-color="%238b5cf6"/></linearGradient></defs><rect fill="url(%23gn)" width="800" height="500"/><text x="400" y="260" text-anchor="middle" fill="white" font-family="sans-serif" font-size="44" font-weight="bold">NEW PROJECT</text><text x="400" y="310" text-anchor="middle" fill="white" font-family="sans-serif" font-size="18" opacity="0.7">新项目 · 可编辑替换</text></svg>'
    const project: Project = {
      id: maxId + 1,
      title: newProject.title,
      description: newProject.description,
      images: newProject.images.length > 0 ? newProject.images : [defaultImage],
      date: newProject.date || '6月16日',
      status: newProject.status,
      initiator: {
        name: newProject.initiator.name || '未知',
        avatar: newProject.initiator.avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="andef" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230ea5e9"/><stop offset="100%" stop-color="%236366f1"/></linearGradient></defs><rect fill="url(%23andef)" width="100" height="100"/><circle cx="50" cy="40" r="18" fill="white" opacity="0.85"/><rect x="25" y="60" width="50" height="30" rx="15" fill="white" opacity="0.85"/></svg>'
      },
      tags: newProject.tags.length > 0 ? newProject.tags : ['项目']
    }
    
    setProjects([...projects, project])
    setShowAddModal(false)
    setNewProject({
      title: '',
      description: '',
      date: '',
      status: '未开始',
      initiator: { name: '', avatar: '' },
      tags: [],
      images: []
    })
  }

  const statusOptions = [
    { key: '未开始', label: '未开始' },
    { key: '进行中', label: '进行中' },
    { key: '已完成', label: '已完成' }
  ] as const

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && avatarProjectId) {
      compressImage(file).then(async (result) => {
        const url = await uploadToBackend(result.blob, file.name || 'avatar.jpg')
        const project = projects.find(p => p.id === avatarProjectId)
        if (project) {
          project.initiator.avatar = url
          setProjects([...projects])
          setTimeout(() => saveProjectsToFile(), 200)
        }
      }).catch((err) => {
        console.error('头像处理失败:', err)
      })
      setShowAvatarModal(false)
      setAvatarProjectId(null)
    }
  }

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative py-20 bg-dark-800"
    >
      {/* Date Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-display font-bold text-white mb-6">设置日期</h3>
            <div className="grid grid-cols-5 gap-2">
              {generateDates().map((date) => (
                <button
                  key={date.value}
                  onClick={() => setSelectedDate(date.value)}
                  className={`py-2 px-1 rounded-lg text-sm transition-colors ${
                    selectedDate === date.value
                      ? 'bg-accent-cyan text-white'
                      : 'bg-dark-600 text-white/60 hover:bg-dark-500'
                  }`}
                >
                  {date.label}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowDateModal(false)
                  setDateProjectId(null)
                }}
                className="flex-1 py-3 bg-white/5 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveDate}
                className="flex-1 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl text-white hover:opacity-90 transition-opacity"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-sm mx-4">
            <h3 className="text-xl font-display font-bold text-white mb-6">选择工作状态</h3>
            <div className="space-y-3">
              {statusOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleSelectStatus(option.key)}
                  className={`w-full py-4 rounded-xl border border-white/10 text-white/80 hover:border-accent-cyan hover:text-accent-cyan hover:bg-accent-cyan/5 transition-all duration-300 flex items-center justify-between px-6`}
                >
                  <span className="text-left">{option.label}</span>
                  <span className={`px-3 py-1 rounded-full text-xs ${statusColors[option.label]}`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowStatusModal(false)
                setStatusProjectId(null)
              }}
              className="w-full mt-6 py-3 border border-white/10 rounded-xl text-white/40 hover:text-white/60 hover:border-white/20 transition-colors text-sm tracking-wider"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-display font-bold text-white mb-6">编辑发起人</h3>
            <div>
              <label className="block text-white/40 text-sm mb-2">名字</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 bg-dark-600 rounded-xl border border-white/10 text-white focus:border-accent-cyan focus:outline-none"
                placeholder="请输入发起人名字"
              />
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowNameModal(false)
                  setNameProjectId(null)
                  setEditName('')
                }}
                className="flex-1 py-3 bg-white/5 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveName}
                className="flex-1 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl text-white hover:opacity-90 transition-opacity"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Projects Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-sm mx-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-cyan/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2">保存项目数据</h3>
            <p className="text-white/40 text-sm mb-6">导出项目数据为 JSON 文件，防止网站更新后数据丢失</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-3 bg-white/5 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={exportData}
                className="flex-1 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl text-white hover:opacity-90 transition-opacity"
              >
                导出保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Projects Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-sm mx-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-purple/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2">导入项目数据</h3>
            <p className="text-white/40 text-sm mb-4">选择之前导出的 JSON 文件恢复项目数据</p>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-white/60 hover:border-accent-purple hover:text-accent-purple transition-colors flex flex-col items-center gap-2 mb-4"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>点击选择 JSON 文件</span>
            </button>
            {importError && (
              <p className="text-red-400 text-sm mb-4">{importError}</p>
            )}
            <button
              onClick={() => { setShowImportModal(false); setImportError(''); }}
              className="w-full py-3 bg-white/5 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-display font-bold text-white mb-6">添加项目</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white/40 text-sm mb-2">标题</label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                  className="w-full px-4 py-3 bg-dark-600 rounded-xl border border-white/10 text-white focus:border-accent-cyan focus:outline-none"
                  placeholder="请输入项目标题"
                />
              </div>
              <div>
                <label className="block text-white/40 text-sm mb-2">描述</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-dark-600 rounded-xl border border-white/10 text-white focus:border-accent-cyan focus:outline-none resize-none"
                  placeholder="请输入项目描述"
                />
              </div>
              <div>
                <label className="block text-white/40 text-sm mb-2">发起人</label>
                <input
                  type="text"
                  value={newProject.initiator.name}
                  onChange={(e) => setNewProject({...newProject, initiator: {...newProject.initiator, name: e.target.value}})}
                  className="w-full px-4 py-3 bg-dark-600 rounded-xl border border-white/10 text-white focus:border-accent-cyan focus:outline-none"
                  placeholder="请输入发起人名字"
                />
              </div>
              <div>
                <label className="block text-white/40 text-sm mb-2">日期</label>
                <input
                  type="text"
                  value={newProject.date}
                  onChange={(e) => setNewProject({...newProject, date: e.target.value})}
                  className="w-full px-4 py-3 bg-dark-600 rounded-xl border border-white/10 text-white focus:border-accent-cyan focus:outline-none"
                  placeholder="如：6月16日"
                />
              </div>
              <div>
                <label className="block text-white/40 text-sm mb-2">状态</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['未开始', '进行中', '已完成'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setNewProject({...newProject, status})}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                        newProject.status === status
                          ? 'bg-accent-cyan text-white'
                          : 'bg-dark-600 text-white/60 hover:bg-dark-500'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-white/40 text-sm mb-2">项目图片（可选，支持多张）</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                    if (files) {
                      Array.from(files).forEach(async (file) => {
                        try {
                          const result = await compressImage(file)
                          setNewProject(prev => ({
                            ...prev,
                            images: [...prev.images, result.dataUrl]
                          }))
                        } catch (err) {
                          console.error('图片处理失败:', err)
                        }
                      })
                    }
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-dark-600 border border-dashed border-white/20 rounded-xl text-white/60 hover:border-accent-cyan hover:text-accent-cyan transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  上传图片
                </button>
                {newProject.images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {newProject.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt={`预览 ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg" />
                        <button
                          onClick={() => {
                            const newImages = [...newProject.images]
                            newImages.splice(idx, 1)
                            setNewProject({...newProject, images: newImages})
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewProject({
                    title: '',
                    description: '',
                    date: '',
                    status: '未开始',
                    initiator: { name: '', avatar: '' },
                    tags: [],
                    images: []
                  })
                }}
                className="flex-1 py-3 bg-white/5 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddProject}
                className="flex-1 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl text-white hover:opacity-90 transition-opacity"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-dark-950/95 flex items-center justify-center z-50 p-8"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Navigation arrows */}
          {previewImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Image counter */}
          {previewImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-dark-900/80 rounded-full text-white/60 text-sm">
              {previewImageIndex + 1} / {previewImages.length}
            </div>
          )}
        </div>
      )}

      {/* Gallery Modal - Multi Image Management */}
      {showGalleryModal && galleryProjectId && (
        <div className="fixed inset-0 bg-dark-900/95 backdrop-blur-sm flex items-center justify-center z-50 p-8">
          <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold text-white">图片管理</h3>
              <button
                onClick={() => { setShowGalleryModal(false); setGalleryProjectId(null); }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Upload button */}
            <input
              ref={multiImageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleMultiImageUpload}
              className="hidden"
            />
            <button
              onClick={() => multiImageInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-white/60 hover:border-accent-cyan hover:text-accent-cyan transition-colors flex flex-col items-center gap-2 mb-6"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>点击选择多张图片</span>
            </button>
            
            {/* Image grid */}
            <div className="grid grid-cols-3 gap-4">
              {projects.find(p => p.id === galleryProjectId)?.images.map((img, idx) => (
                <div key={idx} className="relative group aspect-square">
                  <img
                    src={img}
                    alt={`Image ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => handleGalleryImageClick(projects.find(p => p.id === galleryProjectId)!.images, idx)}
                  />
                  <div className="absolute inset-0 bg-dark-900/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleGalleryImageClick(projects.find(p => p.id === galleryProjectId)!.images, idx)}
                      className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {projects.find(p => p.id === galleryProjectId)!.images.length > 1 && (
                      <button
                        onClick={() => handleDeleteImage(galleryProjectId, idx)}
                        className="w-10 h-10 rounded-full bg-red-500/60 hover:bg-red-500/80 flex items-center justify-center transition-colors"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-dark-900/80 rounded text-white/60 text-xs">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-display font-bold text-white mb-6">更换头像</h3>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-white/60 hover:border-accent-cyan hover:text-accent-cyan transition-colors flex flex-col items-center gap-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>点击选择头像图片</span>
            </button>
            <button
              onClick={() => {
                setShowAvatarModal(false)
                setAvatarProjectId(null)
              }}
              className="w-full mt-4 py-3 bg-white/5 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-display font-bold text-white mb-6">上传图片</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-white/60 hover:border-accent-cyan hover:text-accent-cyan transition-colors flex flex-col items-center gap-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>点击选择图片</span>
            </button>
            <button
              onClick={() => {
                setShowUploadModal(false)
                setUploadProjectId(null)
              }}
              className="w-full mt-4 py-3 bg-white/5 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingProject !== null && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-lg mx-4">
            <h3 className="text-xl font-display font-bold text-white mb-6">编辑项目</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white/40 text-sm mb-2">标题</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-600 rounded-xl border border-white/10 text-white focus:border-accent-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-white/40 text-sm mb-2">描述</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-dark-600 rounded-xl border border-white/10 text-white focus:border-accent-cyan focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setEditingProject(null)}
                className="flex-1 py-3 bg-white/5 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl text-white hover:opacity-90 transition-opacity"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background decoration */}
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-accent-purple/5 to-transparent" />

      <div className="relative max-w-[1700px] mx-auto px-8 lg:px-16">
        {/* Section header */}
        <div className={`mb-16 transition-all duration-1000 flex items-end justify-between flex-wrap gap-4 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div>
            <p
              className="text-accent-cyan text-sm tracking-[0.3em] mb-4 cursor-default select-none"
              onDoubleClick={() => setEditMode(!editMode)}
              title={editMode ? '双击退出编辑模式' : '双击进入编辑模式'}
            >
              FEATURED WORK
              {editMode && <span className="ml-2 text-white/40 text-xs">（编辑模式）</span>}
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
              精选项目
            </h2>
          </div>
          {editMode && (
          <div className="flex items-center gap-3">
            {/* 保存状态提示 */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              saveStatus === 'saving' ? 'bg-white/10 text-white/60' :
              saveStatus === 'saved' ? 'bg-green-500/20 text-green-400' : 'bg-transparent'
            }`}>
              {saveStatus === 'saving' && (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm">保存中...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">已保存</span>
                </>
              )}
            </div>
            
            {/* 导出按钮 */}
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-4 py-2.5 bg-white/10 border border-white/20 text-white/80 text-sm rounded-lg hover:bg-white/20 hover:text-white transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              导出
            </button>
            
            {/* 导入按钮 */}
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2.5 bg-white/10 border border-white/20 text-white/80 text-sm rounded-lg hover:bg-white/20 hover:text-white transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              导入
            </button>
            
            {/* 添加项目按钮 */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl text-white hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加项目
            </button>
          </div>
          )}
        </div>

        {/* Projects grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {!dataLoaded ? (
            <div className="col-span-2 text-center py-20 text-white/40">加载中...</div>
          ) : projects.length === 0 ? (
            <div className="col-span-2 text-center py-20 text-white/40">暂无项目</div>
          ) : (
            projects.map((project, index) => {
              // 如果有选中周，只显示该周的项目
              if (selectedDates.length > 0 && !selectedDates.includes(project.date)) {
                return null
              }
              return (
            <div
              id={`project-${project.id}`}
              key={project.id}
              className={`group relative transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
              onMouseEnter={() => setHoveredId(project.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Card */}
              <div className="relative bg-dark-700/80 rounded-2xl overflow-hidden border border-white/5 hover:border-accent-cyan/30 transition-all duration-500">
                {/* Image area - Carousel */}
                <div
                  className="relative aspect-[16/10] overflow-hidden bg-dark-600 cursor-pointer group/img"
                  onMouseEnter={() => {
                    setHoveredId(project.id)
                    if (project.images.length > 1) startAutoSlide(project.id, project.images.length)
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null)
                    stopAutoSlide(project.id)
                  }}
                >
                  {/* Carousel slides */}
                  <div
                    className="flex w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      transform: `translateX(-${getSlideIndex(project.id, project.images.length) * 100}%)`,
                    }}
                  >
                    {project.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="flex-none w-full h-full relative"
                      >
                        <img
                          src={img}
                          alt={`${project.title} ${idx + 1}`}
                          className="w-full h-full object-contain transition-transform duration-700 hover:scale-[1.02]"
                          onClick={() => handleImageClick(img, project.images, idx)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Hover zoom hint overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-dark-900/70 via-transparent to-transparent pointer-events-none transition-opacity duration-300 ${hoveredId === project.id ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {/* Navigation arrows - show when multi-image */}
                  {project.images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prevSlide(project.id, project.images.length) }}
                        className={`absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-dark-900/70 hover:bg-accent-cyan/70 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${hoveredId === project.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}`}
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextSlide(project.id, project.images.length) }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-dark-900/70 hover:bg-accent-cyan/70 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${hoveredId === project.id ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'}`}
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Dot indicators - center top */}
                  {project.images.length > 1 && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                      {project.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); goToSlide(project.id, idx, project.images.length) }}
                          className={`rounded-full transition-all duration-300 cursor-pointer ${
                            getSlideIndex(project.id, project.images.length) === idx
                              ? 'w-8 h-2 bg-accent-cyan'
                              : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Bottom-left thumbnail preview icons - click to switch carousel */}
                  {project.images.length > 1 && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-20">
                      {project.images.slice(0, 4).map((img, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); goToSlide(project.id, idx, project.images.length) }}
                          className={`relative w-12 h-8 rounded overflow-hidden transition-all duration-200 cursor-pointer group/thumb ${
                            getSlideIndex(project.id, project.images.length) === idx
                              ? 'ring-2 ring-accent-cyan scale-105'
                              : 'border-2 border-white/30 hover:border-accent-cyan hover:scale-110'
                          }`}
                          title={`查看图片 ${idx + 1}`}
                        >
                          <img
                            src={img}
                            alt={`Thumb ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                      {project.images.length > 4 && (
                        <div className="w-12 h-8 rounded border-2 border-white/30 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center text-white/80 text-xs font-bold">
                          +{project.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Image count badge */}
                  {project.images.length > 1 && (
                    <div className="absolute bottom-3 right-3 px-3 py-1 bg-dark-900/80 backdrop-blur-sm rounded-full text-xs text-white/80 flex items-center gap-1 z-20">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="tabular-nums">
                        {getSlideIndex(project.id, project.images.length) + 1} / {project.images.length}
                      </span>
                    </div>
                  )}

                  {/* Date badge */}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-dark-900/80 backdrop-blur-sm rounded-full text-xs text-white/80 z-20">
                    {project.date}
                  </div>

                  {/* Zoom hint icon - bottom right on single image or when hovered */}
                  <div
                    className={`absolute bottom-3 right-16 flex items-center justify-center transition-all duration-300 ${hoveredId === project.id ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-dark-900/70 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>

                  {/* Slide progress bar */}
                  {project.images.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
                      <div
                        key={`${project.id}-${getSlideIndex(project.id, project.images.length)}`}
                        className="h-full bg-gradient-to-r from-accent-cyan to-accent-purple"
                        style={{
                          width: '100%',
                          transformOrigin: 'left',
                          animation: 'carousel-progress 3.5s ease-out',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${statusColors[project.status]}`}>
                      {project.status}
                    </span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-3 group-hover:text-accent-cyan transition-colors duration-300">
                    {project.title}
                  </h3>

                  <p className="text-white/50 text-sm leading-relaxed mb-6">
                    {project.description}
                  </p>

                  {/* Initiator */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      {editMode ? (
                      <button
                        onClick={() => handleAvatarClick(project.id)}
                        className="w-10 h-10 rounded-full overflow-hidden border border-white/10 hover:border-accent-cyan/50 transition-colors cursor-pointer group relative"
                      >
                        <img
                          src={project.initiator.avatar}
                          alt={project.initiator.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-dark-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </button>
                      ) : (
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                        <img
                          src={project.initiator.avatar}
                          alt={project.initiator.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      )}
                      <div>
                        <p className="text-white/40 text-xs">发起人</p>
                        <div className="flex items-center gap-2">
                          <p className="text-white/80 text-sm">{project.initiator.name}</p>
                          {editMode && (
                          <button
                            onClick={() => handleNameClick(project.id, project.initiator.name)}
                            className="w-5 h-5 rounded opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                          >
                            <svg className="w-3 h-3 text-white/40 hover:text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action icons */}
                    {editMode && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditClick(project)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors duration-300 group"
                      >
                        <svg className="w-4 h-4 text-white/40 group-hover:text-accent-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleUploadClick(project.id)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors duration-300 group"
                      >
                        <svg className="w-4 h-4 text-white/40 group-hover:text-accent-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDateClick(project.id, project.date)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors duration-300 group"
                      >
                        <svg className="w-4 h-4 text-white/40 group-hover:text-accent-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleStatusClick(project.id)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors duration-300 group"
                      >
                        <svg className="w-4 h-4 text-white/40 group-hover:text-accent-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </button>
                    </div>
                    )}
                  </div>
                </div>

                {/* Hover glow effect */}
                <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500 ${
                  hoveredId === project.id ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className="absolute inset-0 rounded-2xl border-2 border-accent-cyan/30" />
                </div>
              </div>
            </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
