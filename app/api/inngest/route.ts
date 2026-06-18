import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { publishPost } from "@/lib/inngest/functions/publishPost"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    publishPost,
  ],
})
