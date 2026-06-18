import React, { ReactNode } from "react"
import { LucideIcon } from "lucide-react"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Empty className="border border-dashed border-border bg-card/10 p-12 text-center rounded-xl animate-in fade-in duration-300">
      <EmptyHeader>
        {Icon && (
          <EmptyMedia variant="icon" className="mx-auto mb-2 bg-secondary text-secondary-foreground p-2 rounded-lg">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </EmptyMedia>
        )}
        <EmptyTitle className="text-base font-semibold text-foreground">
          {title}
        </EmptyTitle>
        <EmptyDescription className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {action && (
        <EmptyContent className="mt-4 mx-auto">
          {action}
        </EmptyContent>
      )}
    </Empty>
  )
}
