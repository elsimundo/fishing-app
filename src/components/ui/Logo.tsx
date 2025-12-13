import { Fish } from 'lucide-react'

interface LogoProps {
  className?: string
  showText?: boolean
  textClassName?: string
}

export function Logo({ className = "w-10 h-10", showText = false, textClassName = "text-xl font-bold" }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center bg-[#1BA9A0] rounded-xl text-white shadow-sm ${className}`}>
        <Fish className="w-3/5 h-3/5" fill="currentColor" strokeWidth={1.5} />
      </div>
      {showText && (
        <span className={`tracking-tight ${textClassName}`}>
          Catchi
        </span>
      )}
    </div>
  )
}
