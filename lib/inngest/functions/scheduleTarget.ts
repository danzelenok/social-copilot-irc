import { inngest } from "../client"
import { executePublishTarget } from "./publishPost"

export const scheduleTargetPublish = inngest.createFunction(
  {
    id: "schedule-target-publish",
    cancelOn: [
      {
        event: "post/target-schedule.cancelled",
        if: "async.data.scheduleId == event.data.scheduleId",
      },
    ],
    triggers: [{ event: "post/target-schedule.requested" }],
  },
  async ({ event, step }) => {
    const { targetId, scheduleId, scheduledAt } = event.data

    // Sleep until the target UTC datetime
    await step.sleepUntil("sleep-until-scheduled", scheduledAt)

    // Execute the publishing pipeline for this single target
    await executePublishTarget(targetId, step)
  }
)
