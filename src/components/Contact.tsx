import { useEffect, useRef, useState } from 'react'

export default function Contact() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative min-h-screen bg-dark-900 flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 grid-bg opacity-30" />
      </div>

      <div className="relative z-10 max-w-[1700px] mx-auto px-8 lg:px-16 py-32 w-full">
        <div className="flex flex-col items-center text-center">
          <p className={`text-accent-cyan text-sm tracking-[0.3em] mb-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>GET IN TOUCH</p>
          <h2 className={`font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            让我们
            <br />
            <span className="gradient-text">一起创造</span>
          </h2>

          <div className={`relative w-full max-w-2xl h-40 overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/20 via-transparent to-accent-purple/20 animate-gradient-shift" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
            </div>

            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 perspective-grid animate-perspective-move" />
            </div>

            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent-cyan/60 to-transparent animate-streak-1" />
              <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent-purple/50 to-transparent animate-streak-2" />
              <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent-cyan/40 to-transparent animate-streak-3" />
            </div>

            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 rounded-full bg-accent-cyan/60 animate-particle"
                  style={{
                    left: `${5 + i * 4.5}%`,
                    bottom: '-4px',
                    height: `${2 + Math.random() * 3}px`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${2.5 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>

            <div className="absolute top-6 left-10 w-16 h-16 bg-accent-cyan/20 rounded-full blur-2xl animate-orb-pulse" />
            <div className="absolute bottom-8 right-20 w-20 h-20 bg-accent-purple/20 rounded-full blur-3xl animate-orb-pulse-delay" />
            <div className="absolute top-10 right-40 w-8 h-8 bg-accent-cyan/15 rounded-full blur-xl animate-orb-pulse" />

            <div className="absolute inset-0 dot-pattern opacity-20" />

            <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-accent-cyan/50 to-transparent" />
            <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-accent-purple/50 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-accent-cyan/40 via-transparent to-accent-purple/40" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-accent-purple/40 via-transparent to-accent-cyan/40" />

            <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-accent-cyan/60" />
            <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-accent-cyan/60" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-accent-purple/60" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-accent-purple/60" />

            <div className="absolute inset-0 scanlines opacity-10" />

            {[...Array(8)].map((_, i) => (
              <div
                key={`cd-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-accent-cyan/50 animate-dot-pulse"
                style={{
                  left: `${10 + i * 11}%`,
                  top: `${i % 2 === 0 ? 20 : 75}%`,
                  animationDelay: `${i * 0.3}s`
                }}
              />
            ))}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-6">
              {[...Array(20)].map((_, i) => (
                <div
                  key={`bar-${i}`}
                  className="w-0.5 bg-gradient-to-t from-accent-cyan/30 to-accent-purple/60 rounded-t animate-wave"
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    animationDuration: `${0.8 + Math.random() * 0.5}s`
                  }}
                />
              ))}
            </div>

            <div className="relative z-20 flex flex-col items-center justify-center h-full px-6">
              <h3 className="font-display text-xl md:text-2xl font-bold text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,212,255,0.4)] text-center whitespace-nowrap">
                勇敢接受挑战，追求卓越
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-6 h-px bg-gradient-to-r from-transparent to-accent-cyan/50" />
                <span className="text-white/50 text-[10px] tracking-wide">Embrace challenges with courage and strive for excellence</span>
                <div className="w-6 h-px bg-gradient-to-l from-transparent to-accent-purple/50" />
              </div>
            </div>

            <div className="absolute top-4 right-6 flex items-center gap-2 z-30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/40 text-[10px] tracking-widest">ACTIVE</span>
            </div>
          </div>
        </div>

        <div className={`mt-32 pt-8 border-t border-white/5 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-display text-lg font-bold tracking-wider">
              <span className="gradient-text">DESIGN WEEKLY REPORT</span>
            </div>
            <p className="text-white/30 text-sm">
              © 2024 All rights reserved. Designed with passion.
            </p>
            <div className="flex items-center gap-2 text-white/30 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Available for freelance
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
