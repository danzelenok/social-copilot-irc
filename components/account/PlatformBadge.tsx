import React from "react"
import { Globe } from "lucide-react"

// Custom SVG Icons for Platforms
export const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
)

export const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

export const FramerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5 16h14L5 2h14v7H5l14 7v6H5v-6z" />
  </svg>
)

export const SubsplashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2C12 2 6 8 6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12C18 8 12 2 12 2Z" />
    <path d="M12 8V14L15 11L12 8Z" fill="currentColor" stroke="none" />
  </svg>
)

export const PLATFORM_CONFIG = {
  telegram: {
    label: "Telegram",
    bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    icon: TelegramIcon,
  },
  instagram: {
    label: "Instagram",
    bg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    icon: InstagramIcon,
  },
  framer: {
    label: "Framer",
    bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: FramerIcon,
  },
  subsplash: {
    label: "Subsplash",
    bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: SubsplashIcon,
  },
}

export type PlatformType = keyof typeof PLATFORM_CONFIG

interface PlatformBadgeProps {
  platform: PlatformType | string
  className?: string
  size?: "sm" | "md"
}

export function PlatformBadge({ platform, className = "", size = "md" }: PlatformBadgeProps) {
  const normalizedPlatform = platform?.toLowerCase() as PlatformType
  const config = PLATFORM_CONFIG[normalizedPlatform] || {
    label: platform,
    bg: "bg-muted text-muted-foreground border-border",
    icon: Globe,
  }
  const PlatformIcon = config.icon

  const sizeClasses = size === "sm" 
    ? "text-[11px] px-2 py-0.5" 
    : "text-xs px-2.5 py-0.5"

  const iconClasses = size === "sm"
    ? "h-3 w-3"
    : "h-3.5 w-3.5"

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border transition-colors ${config.bg} ${sizeClasses} ${className}`}
    >
      <PlatformIcon className={iconClasses} />
      {config.label}
    </span>
  )
}
