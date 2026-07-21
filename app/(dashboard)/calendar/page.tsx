import ContentCalendar from "@/components/calendar/ContentCalendar"
import { getPostsForCalendar } from "@/lib/actions/posts"

interface CalendarPageProps {
  searchParams: Promise<{
    year?: string
    month?: string
  }>
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams
  const now = new Date()

  const year = params?.year && !isNaN(Number(params.year))
    ? Number(params.year)
    : now.getFullYear()

  const month = params?.month !== undefined && !isNaN(Number(params.month))
    ? Number(params.month)
    : now.getMonth()

  const posts = await getPostsForCalendar(year, month)

  return (
    <ContentCalendar
      posts={posts.map((p) => ({
        id: p.id,
        title: p.title,
        post_type: p.post_type as "post" | "story",
        event_at: p.event_at,
        status: p.status,
        platforms: p.platforms,
      }))}
      year={year}
      month={month}
    />
  )
}
