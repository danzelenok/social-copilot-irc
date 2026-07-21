"use client"

import React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import {
  Send,
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Calendar,
  Image as ImageIcon,
} from "lucide-react"
import { InstagramIcon } from "@/components/account/PlatformBadge"
import { cn } from "@/lib/utils"

interface PostPreviewProps {
  title: string
  body: string
  eventAt: Date | null
  mediaUrl?: string | null
  mediaType?: string | null
  postType?: "post" | "story"
}

export default function PostPreview({
  title,
  body,
  eventAt,
  mediaUrl,
  mediaType,
  postType = "post",
}: PostPreviewProps) {
  const formattedEventDate = eventAt
    ? format(eventAt, "EEE, MMM d, yyyy 'at' h:mm a")
    : null

  const currentTime = format(new Date(), "h:mm a")

  return (
    <Card className="h-full border border-border/80 bg-card/50 backdrop-blur-md rounded-xl overflow-hidden shadow-xs">
      <CardHeader className="border-b border-border/60 pb-3 bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <CardTitle className="text-sm font-semibold text-foreground">
              {postType === "story" ? "Instagram Story Preview" : "Live Preview"}
            </CardTitle>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {postType === "story" ? "Stories (9:16)" : "Reactive derived render"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {postType === "story" ? (
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-xl max-w-sm mx-auto min-h-[460px] flex flex-col justify-between relative text-white">
            {/* Story Top Bar */}
            <div className="p-3 bg-gradient-to-b from-black/80 to-transparent z-10 space-y-2">
              {/* Progress bar line */}
              <div className="w-full h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full w-full bg-white rounded-full" />
              </div>

              {/* User info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 p-[1.5px]">
                    <div className="h-full w-full rounded-full bg-pink-500 flex items-center justify-center text-white text-[9px] font-bold">
                      SC
                    </div>
                  </div>
                  <span className="text-xs font-semibold drop-shadow-xs">social_copilot</span>
                  <span className="text-[10px] text-white/70">Just now</span>
                </div>
                <MoreHorizontal className="h-4 w-4 text-white/80" />
              </div>
            </div>

            {/* Story Media Center */}
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              {mediaUrl ? (
                mediaType === "video" ? (
                  <video src={mediaUrl} controls className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl}
                    alt="Instagram story preview"
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-500 p-6 text-center">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Story Media Placeholder</span>
                  <span className="text-[10px] text-zinc-400 mt-1">
                    Upload an image (1080×1920) or video (up to 60s)
                  </span>
                </div>
              )}
            </div>

            {/* Optional Title Overlay */}
            {title && (
              <div className="z-10 px-4 py-2 my-auto self-center bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-center max-w-[85%] shadow-lg">
                <p className="text-xs font-bold text-white tracking-tight">{title}</p>
              </div>
            )}

            {/* Story Bottom Reply Mock */}
            <div className="p-3 bg-gradient-to-t from-black/80 to-transparent z-10 flex items-center gap-3">
              <div className="flex-1 h-9 rounded-full border border-white/30 bg-black/20 px-4 flex items-center text-xs text-white/60">
                Send message...
              </div>
              <Heart className="h-6 w-6 text-white/90 shrink-0" />
              <Send className="h-5 w-5 text-white/90 shrink-0 -rotate-45" />
            </div>
          </div>
        ) : (
          <Tabs defaultValue="telegram" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/80 p-0.5 rounded-lg">
            <TabsTrigger value="telegram" className="flex items-center gap-1.5 cursor-pointer py-1.5 text-xs font-semibold">
              <Send className="h-3.5 w-3.5 text-sky-500 fill-sky-500/10" />
              Telegram
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex items-center gap-1.5 cursor-pointer py-1.5 text-xs font-semibold">
              <InstagramIcon className="h-3.5 w-3.5 text-pink-500" />
              Instagram
            </TabsTrigger>
          </TabsList>

          {/* Telegram Preview Tab */}
          <TabsContent value="telegram" className="animate-in fade-in-50 duration-200">
            <div className="rounded-lg bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100/50 dark:border-sky-900/30 p-4 min-h-[350px] flex flex-col justify-between">
              {/* Telegram App Header Bar */}
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-sky-100 dark:border-sky-900/40">
                <div className="h-7 w-7 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  SC
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                    Social Co-Pilot Channel
                    <span className="inline-block h-3.5 w-3.5 bg-sky-500 rounded-full flex items-center justify-center text-[8px] text-white">✓</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-none">
                    broadcast channel
                  </div>
                </div>
              </div>

              {/* Telegram Message Bubble */}
              <div className="flex-1 flex flex-col justify-start">
                <div className="max-w-[90%] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-xs relative flex flex-col">
                  {/* Mock Image / Video / Canva Placeholder */}
                  <div className={cn(
                    "relative w-full rounded-none flex flex-col items-center justify-center text-muted-foreground select-none overflow-hidden group",
                    (mediaUrl && mediaType !== "video") ? "" : "h-44 bg-muted/80 border-b border-border/40"
                  )}>
                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={mediaUrl} controls className="w-full h-44 object-cover animate-in fade-in duration-300" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaUrl}
                          alt="Post media preview"
                          className="w-full h-auto animate-in fade-in duration-300"
                        />
                      )
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <ImageIcon className="h-8 w-8 mb-2 text-muted-foreground/60" />
                        <span className="text-[10px] font-semibold tracking-wider uppercase">Media Asset Container</span>
                        <span className="text-[9px] opacity-75 mt-0.5">Placeholder for post media</span>
                      </>
                    )}
                  </div>

                  {/* Message Content Container with Padding */}
                  <div className="p-3.5 space-y-3 flex flex-col justify-start">
                    {/* Title & Body */}
                    <div className="space-y-1.5">
                      {title ? (
                        <h4 className="text-sm font-bold text-foreground leading-tight">
                          {title}
                        </h4>
                      ) : (
                        <h4 className="text-sm font-bold text-muted-foreground/50 leading-tight italic">
                          Event Title Placeholder
                        </h4>
                      )}

                      {body ? (
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {body}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/50 whitespace-pre-wrap leading-relaxed italic">
                          Write post content in the composer form to preview it here...
                        </p>
                      )}
                    </div>

                    {/* Event Schedule Time Box */}
                    {formattedEventDate && (
                      <div className="mt-2.5 flex items-center gap-1.5 p-2 rounded-lg bg-sky-500/5 border border-sky-500/10 text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Event: {formattedEventDate}</span>
                      </div>
                    )}

                    {/* Timestamp & Views Footer */}
                    <div className="flex items-center justify-end gap-1.5 text-[9px] text-muted-foreground/75 pt-1">
                      <span>1,241 views</span>
                      <span>•</span>
                      <span>{currentTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] text-muted-foreground/60 italic mt-3">
                Telegram channel view mock
              </div>
            </div>
          </TabsContent>

          {/* Instagram Preview Tab */}
          <TabsContent value="instagram" className="animate-in fade-in-50 duration-200">
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-border/80 overflow-hidden min-h-[350px] flex flex-col justify-between">
              {/* Instagram Card Header */}
              <div className="flex items-center justify-between p-3 border-b border-border/40 bg-background/50">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full p-[2px] bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600">
                    <div className="h-full w-full rounded-full bg-background flex items-center justify-center p-[1px]">
                      <div className="h-full w-full rounded-full bg-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
                        SC
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground leading-none">
                      social_copilot
                    </div>
                    {formattedEventDate && (
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        Scheduled: {formattedEventDate}
                      </div>
                    )}
                  </div>
                </div>
                <button type="button" className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <MoreHorizontal className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Instagram Card Media */}
              <div className="relative w-full aspect-[4/5] bg-muted flex flex-col items-center justify-center text-muted-foreground border-b border-border/40 select-none overflow-hidden group">
                {mediaUrl ? (
                  mediaType === "video" ? (
                    <video src={mediaUrl} controls className="w-full h-full object-cover animate-in fade-in duration-300" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl}
                      alt="Instagram post media preview"
                      className="w-full h-full object-cover object-center animate-in fade-in duration-300"
                    />
                  )
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 mb-2 text-muted-foreground/60" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase">Portrait Media Asset</span>
                    <span className="text-[9px] opacity-75 mt-0.5">4:5 Aspect Ratio Preview</span>
                  </>
                )}
              </div>

              {/* Action Bar & Caption */}
              <div className="p-3.5 space-y-2.5 bg-background">
                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-foreground">
                    <Heart className="h-5.5 w-5.5 hover:text-red-500 transition-colors cursor-pointer" />
                    <MessageCircle className="h-5.5 w-5.5 hover:text-primary transition-colors cursor-pointer" />
                    <Send className="h-5.5 w-5.5 hover:text-sky-500 transition-colors cursor-pointer -rotate-45" />
                  </div>
                  <Bookmark className="h-5.5 w-5.5 hover:text-primary transition-colors cursor-pointer text-foreground" />
                </div>

                {/* Likes count */}
                <div className="text-xs font-semibold text-foreground">
                  Liked by you and 124 others
                </div>

                {/* Caption / Body */}
                <div className="text-xs leading-relaxed space-y-1">
                  <p className="text-foreground">
                    <span className="font-semibold mr-1.5">social_copilot</span>
                    {title && <span className="font-bold block mb-1">{title}</span>}
                    {body ? (
                      <span className="whitespace-pre-wrap">{body}</span>
                    ) : (
                      <span className="text-muted-foreground/50 italic">
                        Post caption preview will render here...
                      </span>
                    )}
                  </p>

                  {/* Mock hashtags based on title */}
                  <p className="text-sky-600 dark:text-sky-400 font-medium">
                    #socialcopilot #copilot {title ? `#${title.toLowerCase().replace(/[^a-z0-9]/g, "")}` : ""}
                  </p>
                </div>

                {/* Mock comments */}
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider pt-1.5">
                  1 minute ago
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
