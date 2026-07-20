import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { publishPost } from "@/lib/inngest/functions/publishPost"
import { scheduleTargetPublish } from "@/lib/inngest/functions/scheduleTarget"
import { refreshInstagramTokens } from "@/lib/inngest/functions/refreshInstagramTokens"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    publishPost,
    scheduleTargetPublish,
    refreshInstagramTokens,
  ],
})
