"use client"

import React, { useState, useRef, useEffect } from "react"
import { X, AlertCircle, UploadCloud, Loader2, Sparkles, Image as ImageIcon, Film } from "lucide-react"
import { uploadMedia } from "@/lib/actions/posts"
import { Progress } from "@/components/ui/progress"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export type MediaType = "photo" | "video"

interface MediaUploadFieldProps {
  mediaUrl: string | null
  onChangeMediaUrl: (url: string | null) => void
  mediaType: MediaType
  onChangeMediaType: (type: MediaType) => void
  disabled?: boolean
}

export default function MediaUploadField({
  mediaUrl,
  onChangeMediaUrl,
  mediaType,
  onChangeMediaType,
  disabled = false,
}: MediaUploadFieldProps) {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "uploaded" | "error">(
    mediaUrl ? "uploaded" : "idle"
  )
  const [progress, setProgress] = useState(0)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ name: string; size: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(mediaUrl)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Remove uploaded media
  const handleRemove = () => {
    if (disabled || uploadState === "uploading") return
    onChangeMediaUrl(null)
    setLocalPreview(null)
    setMeta(null)
    setErrorText(null)
    setUploadState("idle")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }



  // Clear local state if parent resets mediaUrl to null
  useEffect(() => {
    if (mediaUrl === null && uploadState === "uploaded") {
      setUploadState("idle")
      setLocalPreview(null)
      setMeta(null)
      setErrorText(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [mediaUrl, uploadState])

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  // Get active constraints based on media type
  const isVideo = mediaType === "video"
  const acceptedFormats = isVideo ? ".mp4,.mov" : ".jpg,.jpeg,.png,.webp"
  const acceptedMimeTypes = isVideo ? ["video/mp4", "video/quicktime"] : ["image/jpeg", "image/png", "image/webp"]
  const sizeLimitBytes = isVideo ? 1024 * 1024 * 1024 : 100 * 1024 * 1024 // 1GB or 100MB
  const sizeLimitLabel = isVideo ? "1 GB" : "100 MB"

  // Handle client-side validation
  const validateFile = (file: File): string | null => {
    if (!acceptedMimeTypes.includes(file.type)) {
      return `Invalid file type. Supported formats for this mode: ${isVideo ? "MP4, MOV" : "JPG, PNG, WEBP"}.`
    }

    if (file.size > sizeLimitBytes) {
      return `File size exceeds the ${sizeLimitLabel} limit for this mode.`
    }

    return null
  }

  // Core upload file logic
  const handleUpload = async (file: File) => {
    const error = validateFile(file)
    if (error) {
      setErrorText(error)
      setUploadState("error")
      return
    }

    // Prepare preview and metadata
    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    setMeta({
      name: file.name,
      size: formatFileSize(file.size),
    })

    setUploadState("uploading")
    setProgress(10)
    setErrorText(null)

    // Simulate upload progress while Server Action runs
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 8
      })
    }, 120)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadMedia(formData, mediaType)

      clearInterval(progressInterval)

      if (result.success && result.url) {
        setProgress(100)
        setTimeout(() => {
          onChangeMediaUrl(result.url || null)
          setUploadState("uploaded")
        }, 150)
      } else {
        throw new Error(result.error || "Failed to upload file.")
      }
    } catch (err) {
      clearInterval(progressInterval)
      console.error("Upload error:", err)
      setErrorText(err instanceof Error ? err.message : "Failed to upload file. Please try again.")
      setUploadState("error")
      onChangeMediaUrl(null)
    }
  }

  // Browse click handler
  const handleBrowseClick = () => {
    if (!disabled && uploadState !== "uploading") {
      fileInputRef.current?.click()
    }
  }

  // File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  // Drag-and-drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && uploadState !== "uploading") {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || uploadState === "uploading") return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }



  return (
    <div className="w-full space-y-3">
      {/* Mode Switcher */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
          Composer Mode
        </label>
        <ToggleGroup
          value={[mediaType]}
          onValueChange={(val: any) => {
            const selectedVal = Array.isArray(val) ? val[0] : val
            if (selectedVal && !disabled && uploadState !== "uploading") {
              onChangeMediaType(selectedVal as MediaType)
            }
          }}
          className="border border-border/80 p-0.5 rounded-lg w-full sm:w-fit bg-muted/20"
        >
          <ToggleGroupItem
            value="photo"
            className="flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold cursor-pointer data-[state=on]:bg-background data-[state=on]:shadow-xs"
            disabled={disabled || uploadState === "uploading"}
          >
            <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
            Photo
          </ToggleGroupItem>
          <ToggleGroupItem
            value="video"
            className="flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold cursor-pointer data-[state=on]:bg-background data-[state=on]:shadow-xs"
            disabled={disabled || uploadState === "uploading"}
          >
            <Film className="h-3.5 w-3.5 text-sky-500" />
            Video
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Main Drag & Drop Zone */}
      <div className="relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={acceptedFormats}
          className="hidden"
          disabled={disabled || uploadState === "uploading"}
        />

        {/* 1. IDLE STATE */}
        {uploadState === "idle" && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className={cn(
              "border-2 border-dashed border-border/80 rounded-xl p-6 text-center cursor-pointer transition-all duration-200 select-none",
              isDragging
                ? "border-primary bg-primary/5 scale-[0.99]"
                : "bg-muted/10 hover:border-border hover:bg-muted/20",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="h-10 w-10 rounded-lg bg-background border border-border/60 flex items-center justify-center text-muted-foreground shadow-xs">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drop {isVideo ? "video" : "image"} here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isVideo ? "MP4, MOV" : "JPG, PNG, WEBP"} · Max {sizeLimitLabel}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. UPLOADING STATE WITH PROGRESS BAR */}
        {uploadState === "uploading" && (
          <div className="border border-border/60 bg-muted/10 rounded-xl p-4.5 space-y-3.5">
            <div className="flex items-center gap-3">
              {localPreview && !isVideo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={localPreview}
                  alt="Uploading thumbnail"
                  className="w-12 h-12 rounded-lg object-cover border border-border/40"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-background border border-border/40 flex items-center justify-center text-primary shrink-0">
                  <Film className="h-5 w-5 animate-pulse" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {meta?.name || "Uploading file..."}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {meta?.size} · Uploading...
                </p>
              </div>
              <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
            </div>
            <div className="space-y-1">
              <Progress value={progress} className="w-full h-1.5" />
              <div className="flex justify-end text-[10px] text-muted-foreground font-semibold">
                {progress}%
              </div>
            </div>
          </div>
        )}

        {/* 3. UPLOADED STATE */}
        {uploadState === "uploaded" && (
          <div className="border border-border/80 bg-background rounded-xl p-3 flex items-center gap-3.5 shadow-xs transition-all duration-300">
            {localPreview && !isVideo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={localPreview}
                alt="Uploaded source"
                className="w-12 h-12 rounded-lg object-cover border border-border/60 shadow-xxs bg-muted"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted border border-border/60 flex items-center justify-center text-sky-500 shrink-0">
                <Film className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {meta?.name || (mediaUrl ? mediaUrl.substring(mediaUrl.lastIndexOf("/") + 1) : `${isVideo ? "video.mp4" : "image.jpg"}`)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {meta?.size ? `${meta.size} · ` : ""}Uploaded to ImageKit ✓
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className={cn(
                "h-8 px-3 inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg transition-colors border-0 bg-transparent",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        )}

        {/* 4. ERROR STATE */}
        {uploadState === "error" && (
          <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">Upload Failed</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {errorText || "An error occurred while uploading the file."}
              </p>
              <div className="flex gap-3 mt-2.5">
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  disabled={disabled}
                  className="text-xs font-bold text-foreground underline hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="text-xs font-bold text-destructive underline hover:text-destructive/80 transition-colors cursor-pointer bg-transparent border-0 p-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
