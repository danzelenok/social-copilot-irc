import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { ShieldAlert, CheckCircle2, X } from "lucide-react"
import { InstagramIcon } from "@/components/account/PlatformBadge"
import Link from "next/link"

interface PageProps {
  searchParams: Promise<{
    client_id?: string
    redirect_uri?: string
    state?: string
  }>
}

export default async function MockConsentPage({ searchParams }: PageProps) {
  const params = await searchParams
  const state = params.state || ""
  const branchId = state.split(":")[0] || ""
  const redirectUri = params.redirect_uri || "/branches"

  // URL for approval callback
  const approveUrl = `${redirectUri}?code=mock_authorization_code_instagram_${Date.now()}&state=${encodeURIComponent(state)}`

  // URL for cancellation
  const cancelUrl = branchId
    ? `/branches/${branchId}?error=${encodeURIComponent("Authorization was cancelled by the user.")}`
    : `/branches?error=${encodeURIComponent("Authorization was cancelled by the user.")}`

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-radial-gradient from-purple-900/10 via-slate-950 to-slate-950 pointer-events-none" />

      <Card className="w-full max-w-md bg-slate-900/50 backdrop-blur-md border border-slate-800 shadow-2xl relative overflow-hidden rounded-2xl">
        {/* Instagram style top line */}
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-500" />

        <CardHeader className="pt-8 pb-4 flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/10 mb-4 animate-pulse">
            <InstagramIcon className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">Instagram Sandbox Authorization</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
            You are connecting in <span className="text-pink-400 font-semibold uppercase">Local Simulation Mode</span>.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 py-2">
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-slate-200">instagram_business_basic</p>
                <p className="text-slate-400 mt-0.5">Read basic profile info (username, account type) and media metadata.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 pt-2.5 border-t border-slate-800/60">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-slate-200">instagram_business_content_publish</p>
                <p className="text-slate-400 mt-0.5">Publish photos, videos, and carousel posts to your Instagram Business account.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-purple-500/5 text-purple-400 border border-purple-500/20 px-3 py-2.5 rounded-xl text-[11px] leading-relaxed">
            <ShieldAlert className="h-4 w-4 text-purple-400 shrink-0" />
            <p>
              This sandbox simulates the Meta Consent Screen. Clicking <strong>Approve</strong> will trigger the local callback and populate the database with secure, mock credentials.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center gap-2.5 pt-4 pb-6 px-6 border-t border-slate-800/60 bg-slate-950/20">
          <Link href={cancelUrl} className="w-full sm:w-1/2">
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer h-10 font-medium"
            >
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
          </Link>
          <Link href={approveUrl} className="w-full sm:w-1/2">
            <Button
              type="button"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white cursor-pointer h-10 font-bold shadow-md shadow-pink-600/10 border-0"
            >
              Approve Access
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
