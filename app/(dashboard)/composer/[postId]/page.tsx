import React from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { posts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getPostTargetsWithDetails } from "@/lib/actions/posts"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { AutoRefresh } from "@/components/shared/AutoRefresh"
import { TargetActionCell } from "@/components/composer/TargetActions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ArrowLeft, Calendar, FileText, Globe, Info, Clock, Edit2 } from "lucide-react"
import { TelegramIcon, InstagramIcon } from "@/components/account/PlatformBadge"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    postId: string
  }>
}

export default async function PostStatusPage({ params }: PageProps) {
  const { postId } = await params

  // 1. Fetch post detail
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  })

  if (!post) {
    notFound()
  }

  // 2. Fetch target statuses
  const targets = await getPostTargetsWithDetails(postId)

  // 3. Determine if we should refresh (poll)
  const isTransitional =
    post.status === "draft" ||
    post.status === "publishing" ||
    targets.some((t) => t.status === "pending" || t.status === "processing")

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Auto Refresh utility */}
        <AutoRefresh enabled={isTransitional} interval={5000} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div className="flex items-start sm:items-center gap-3">
            <Link
              href="/composer"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "cursor-pointer"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Campaign Status
                </h1>
                <StatusBadge status={post.status as any} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                ID: {post.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(post.status === "scheduled" || post.status === "draft") && (
              <Link
                href={`/composer/${post.id}/edit`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "cursor-pointer font-semibold flex items-center gap-1.5"
                )}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Campaign
              </Link>
            )}
            <Link
              href="/composer"
              className={cn(buttonVariants({ size: "sm" }), "cursor-pointer font-semibold")}
            >
              Create Another Post
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Side: Campaign Details (5 columns) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border border-border/80 bg-card/40 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  Content Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Event Title
                  </h4>
                  <p className="text-sm font-bold text-foreground mt-1">{post.title}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Body Text
                  </h4>
                  <p className="text-xs text-foreground mt-1.5 whitespace-pre-wrap leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/40 min-h-20">
                    {post.body}
                  </p>
                </div>

                {post.media_url && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Media Attachment ({post.media_type})
                    </h4>
                    <div className="relative rounded-lg border border-border/40 overflow-hidden bg-muted/80 max-h-60 flex items-center justify-center">
                      {post.media_type === "video" ? (
                        <video src={post.media_url} controls className="w-full max-h-60 object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.media_url} alt="Post media" className="w-full h-auto max-h-60 object-contain" />
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Publishing Targets Table (7 columns) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border border-border/80 bg-card/40 backdrop-blur-md">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-primary" />
                  Publishing Targets ({targets.length})
                </CardTitle>
                <CardDescription>
                  Live distribution updates across selected branches and platform channels.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {targets.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No publishing targets selected for this campaign.
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="pl-4">Branch</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                        <TableHead className="pr-4 text-right">Published At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {targets.map((target) => (
                        <TableRow key={target.id} className="hover:bg-muted/10 border-b border-border/40 last:border-0">
                          <TableCell className="pl-4 py-3.5">
                            <div className="font-semibold text-foreground">
                              {target.branch.name}
                            </div>
                            {target.event_at && target.branch.timezone && (
                              <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5 select-none">
                                <Clock className="h-3 w-3 shrink-0" />
                                Scheduled: {format(new Date(target.event_at), "MMM d, yyyy 'at' h:mm a")} ({target.branch.timezone})
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-2">
                              {target.account.platform_type === "telegram" ? (
                                <TelegramIcon className="h-4 w-4 text-sky-500 fill-sky-500/10" />
                              ) : target.account.platform_type === "instagram" ? (
                                <InstagramIcon className="h-4 w-4 text-pink-500" />
                              ) : (
                                <Info className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {target.account.handle}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-1.5">
                              <StatusBadge status={target.status as any} />
                              
                              {target.status === "failed" && target.error_message && (
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <button type="button" className="text-muted-foreground hover:text-destructive cursor-help p-0.5 rounded-sm hover:bg-destructive/10 border-0 flex items-center justify-center">
                                        <Info className="h-3.5 w-3.5" />
                                      </button>
                                    }
                                  />
                                  <TooltipContent side="top" className="bg-zinc-950 text-white border-zinc-800 shadow-md">
                                    {target.error_message}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-3.5">
                            <TargetActionCell target={target} post={post} />
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground pr-4 py-3.5">
                            {target.status === "published" && target.published_at
                              ? format(new Date(target.published_at), "MMM d, h:mm a")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
