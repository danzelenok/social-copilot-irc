import React, { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  action?: ReactNode
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl animate-in fade-in slide-in-from-top-1 duration-300">
          {title}
        </h1>
      </div>
      {action && (
        <div className="flex items-center gap-3 shrink-0 animate-in fade-in slide-in-from-right-2 duration-300">
          {action}
        </div>
      )}
    </div>
  )
}
