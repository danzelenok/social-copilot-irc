"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface CalendarPost {
  id: string
  title: string
  post_type: "post" | "story"
  event_at: Date | string | null
  status: string
  platforms: string[] | null
}

interface ContentCalendarProps {
  posts: CalendarPost[]
  year: number
  month: number
}

const PLATFORM_COLORS: Record<string, string> = {
  telegram: "#0088cc",
  instagram: "#e1306c",
  framer: "#1a1a14",
  subsplash: "#4f46e5",
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function ContentCalendar({ posts, year, month }: ContentCalendarProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month")

  const currentDate = new Date(year, month, 1)

  const handlePrevMonth = () => {
    const prev = subMonths(currentDate, 1)
    router.push(`/calendar?year=${prev.getFullYear()}&month=${prev.getMonth()}`)
  }

  const handleNextMonth = () => {
    const next = addMonths(currentDate, 1)
    router.push(`/calendar?year=${next.getFullYear()}&month=${next.getMonth()}`)
  }

  const handleToday = () => {
    const now = new Date()
    router.push(`/calendar?year=${now.getFullYear()}&month=${now.getMonth()}`)
  }

  // Calculate calendar grid days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden">
      {/* Calendar Top Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-border bg-card">
        {/* Left: Navigation & Current Month */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground min-w-[160px]">
            {format(currentDate, "MMMM yyyy")}
          </h1>
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={handlePrevMonth}
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-medium rounded-md"
              onClick={handleToday}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={handleNextMonth}
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Center: View Switcher (Month / Week / List) */}
        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
          {(["month", "week", "list"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer",
                viewMode === mode
                  ? "bg-background text-foreground shadow-xs border border-border/50 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Right: Legend & New Post Button */}
        <div className="flex items-center gap-4">
          {/* Platform Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full inline-block"
                style={{ backgroundColor: PLATFORM_COLORS.telegram }}
              />
              <span>Telegram</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full inline-block"
                style={{ backgroundColor: PLATFORM_COLORS.instagram }}
              />
              <span>Instagram</span>
            </div>
          </div>

          {/* New Post Button */}
          <Button
            size="sm"
            className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-xs"
            onClick={() => router.push("/composer")}
          >
            <Plus className="h-4 w-4" />
            <span>New Post</span>
          </Button>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === "month" ? (
          <div className="flex flex-col h-full border border-border rounded-xl bg-card overflow-hidden shadow-xs">
            {/* Weekday Labels Header */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Month Grid Cells */}
            <div className="grid grid-cols-7 auto-rows-fr flex-1 divide-x divide-y divide-border min-h-[600px]">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, monthStart)
                const isToday = isSameDay(day, new Date())

                // Filter posts belonging to this day
                const dayPosts = posts.filter((p) =>
                  p.event_at ? isSameDay(new Date(p.event_at), day) : false
                )

                const visiblePosts = dayPosts.slice(0, 3)
                const extraCount = dayPosts.length - visiblePosts.length

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "flex flex-col p-2 min-h-[110px] transition-colors relative group",
                      !isCurrentMonth
                        ? "bg-muted/20 text-muted-foreground/40"
                        : "bg-card hover:bg-muted/10"
                    )}
                  >
                    {/* Day Number Header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={cn(
                          "text-xs font-semibold flex items-center justify-center transition-all",
                          isToday
                            ? "h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-xs font-bold"
                            : !isCurrentMonth
                            ? "text-muted-foreground/40"
                            : "text-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {dayPosts.length > 0 && (
                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                          {dayPosts.length} {dayPosts.length === 1 ? "post" : "posts"}
                        </span>
                      )}
                    </div>

                    {/* Posts Cards Stack */}
                    <div className="flex flex-col gap-1 overflow-hidden flex-1">
                      {visiblePosts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}

                      {/* +N More Popover Trigger */}
                      {extraCount > 0 && (
                        <Popover>
                          <PopoverTrigger className="text-[11px] font-semibold text-primary hover:underline text-left mt-0.5 px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors w-fit cursor-pointer">
                            +{extraCount} more
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 space-y-2">
                            <PopoverHeader>
                              <PopoverTitle className="text-xs font-bold text-foreground">
                                {format(day, "EEEE, MMMM d")} ({dayPosts.length} posts)
                              </PopoverTitle>
                            </PopoverHeader>
                            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                              {dayPosts.map((post) => (
                                <PostCard key={post.id} post={post} />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Week & List Views Coming Soon Stub */
          <div className="flex flex-col items-center justify-center h-[500px] border border-dashed border-border rounded-xl bg-card text-center p-8">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1 capitalize">
              {viewMode} View
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              The {viewMode} view mode is coming soon in a future update! Use the Month view to manage your content schedule.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function PostCard({ post }: { post: CalendarPost }) {
  const router = useRouter()

  const formattedTime = post.event_at
    ? format(new Date(post.event_at), "h:mm a")
    : "Unscheduled"

  const platformList = post.platforms || []

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        router.push(`/composer/${post.id}`)
      }}
      className={cn(
        "group flex items-center justify-between p-1.5 rounded-md border border-border/60 bg-background hover:bg-accent/40 hover:border-accent cursor-pointer transition-all text-left shadow-2xs gap-1.5",
        post.post_type === "story" && "border-amber-500/30 bg-amber-500/5"
      )}
      title={`${post.title} (${formattedTime})`}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-[10px] font-semibold font-mono text-muted-foreground shrink-0">
          {formattedTime}
        </span>
        <span className="text-xs font-medium text-foreground truncate">
          {post.title}
        </span>
        {post.post_type === "story" && (
          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 shrink-0">
            Story
          </span>
        )}
      </div>

      {/* Platform Dots */}
      <div className="flex items-center gap-1 shrink-0">
        {platformList.map((platform) => (
          <span
            key={platform}
            className="h-2 w-2 rounded-full inline-block"
            style={{
              backgroundColor: PLATFORM_COLORS[platform] || "#888888",
            }}
            title={platform}
          />
        ))}
      </div>
    </div>
  )
}
