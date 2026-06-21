import { useState, useEffect, useRef } from 'react'
import { CalendarClock, ChevronDown, Calendar } from 'lucide-react'

interface WeekOption {
  label: string
  dates: string[]
  startDate: string
  endDate: string
}

export default function Hero() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null)
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 获取并按周分组时间段
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await fetch('/data/projects.json?_=' + Date.now(), { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          // 提取所有唯一时间段
          const uniquePeriods = [...new Set<string>(data.projects.map((p: any) => p.date))]
          
          // 按日期排序
          const sorted = uniquePeriods.sort((a: string, b: string) => {
            const monthA = parseInt(a.replace(/月.*/g, ''))
            const monthB = parseInt(b.replace(/月.*/g, ''))
            const dayA = parseInt(a.replace(/.*月|/g, '').replace('日', ''))
            const dayB = parseInt(b.replace(/.*月|/g, '').replace('日', ''))
            if (monthA !== monthB) return monthB - monthA
            return dayB - dayA
          })

          // 将日期按周分组（以周一为起始）
          const weeks: Map<string, string[]> = new Map()
          
          sorted.forEach((date) => {
            const month = parseInt(date.replace(/月.*/g, ''))
            const day = parseInt(date.replace(/.*月|/g, '').replace('日', ''))
            // 计算该日期属于第几周（以每月1号为第1周）
            const weekNum = Math.ceil(day / 7)
            const weekKey = `${month}月第${weekNum}周`
            
            if (!weeks.has(weekKey)) {
              weeks.set(weekKey, [])
            }
            weeks.get(weekKey)!.push(date)
          })

          // 生成周选项数组
          const weekList: WeekOption[] = []
          let weekIndex = 1
          
          weeks.forEach((dates, label) => {
            // 排序该周内的日期
            dates.sort((a, b) => {
              const dayA = parseInt(a.replace(/.*月|/g, '').replace('日', ''))
              const dayB = parseInt(b.replace(/.*月|/g, '').replace('日', ''))
              return dayB - dayA
            })
            
            weekList.push({
              label: label,
              dates: dates,
              startDate: dates[dates.length - 1],
              endDate: dates[0]
            })
            weekIndex++
          })

          setWeekOptions(weekList)
          if (weekList.length > 0) {
            setSelectedWeek(weekList[0])
          }
        }
      } catch (err) {
        console.warn('加载时间段失败')
      }
    }
    fetchWeeks()
  }, [])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 选择周
  const handleSelectWeek = (week: WeekOption) => {
    setSelectedWeek(week)
    setDropdownOpen(false)
    // 滚动到 Projects 区域
    const projectsSection = document.getElementById('projects')
    if (projectsSection) {
      projectsSection.scrollIntoView({ behavior: 'smooth' })
      // 存储选中的周及其所有日期，用于 Projects 组件筛选
      localStorage.setItem('selected_week_dates', JSON.stringify(week.dates))
      // 触发事件让 Projects 组件知道需要刷新
      window.dispatchEvent(new CustomEvent('periodChange', { detail: week.dates }))
    }
  }

  return (
    <section className="relative min-h-[500px] h-auto w-full overflow-hidden bg-black">
      {/* ============ Background Video ============ */}
      <video
        className="absolute inset-0 z-0 w-full h-full object-cover"
        style={{ height: '100%', minHeight: '500px' }}
        autoPlay
        muted
        loop
        playsInline
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4"
          type="video/mp4"
        />
      </video>

      {/* Subtle dark overlay for readability */}
      <div className="absolute inset-0 z-0 bg-black/30" style={{ minHeight: '500px' }} />

      {/* ============ Center Hero Section ============ */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[500px] px-6 md:px-10">
        {/* Main heading */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-elegant leading-[1.05] tracking-normal animate-fade-in-up-delay-2 gradient-text-shiny">
          Weekly Report
        </h1>
        
        {/* Chinese subtitle */}
        <p className="text-white/70 text-base md:text-lg font-normal tracking-[0.15em] mt-4 md:mt-6 animate-fade-in-up-delay-2" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
          周报
        </p>

        {/* CTA Button with Dropdown */}
        <div className="mt-6 md:mt-8 animate-fade-in-up-delay-3 relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="group inline-flex items-center gap-2 bg-black hover:bg-gray-900 text-white rounded-full px-6 md:px-8 py-2.5 md:py-3 transition-colors duration-300 border border-white/10 hover:border-white/20 min-w-[180px] justify-center"
          >
            <CalendarClock className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />
            <span className="text-sm md:text-base font-medium">{selectedWeek?.label || '选择时间段'}</span>
            <ChevronDown 
              className={`w-4 h-4 md:w-5 md:h-5 transform transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} 
              strokeWidth={2} 
            />
          </button>

          {/* Dropdown Menu - Week Options */}
          {dropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-full min-w-[220px] bg-black/90 backdrop-blur-md border border-gray-700 rounded-2xl overflow-hidden shadow-xl z-50">
              {weekOptions.map((week, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectWeek(week)}
                  className={`w-full text-left px-4 py-3 transition-colors duration-200 hover:bg-white/10 flex items-center gap-3 ${
                    selectedWeek?.label === week.label ? 'text-white bg-white/5' : 'text-white/80'
                  }`}
                >
                  <Calendar className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{week.label}</span>
                    <span className="text-xs text-white/50">{week.dates.length} 个项目</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
