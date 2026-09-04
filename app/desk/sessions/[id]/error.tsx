"use client"

import { Button } from "@/components/ui/button"
import { IconArrowLeft, IconAlertTriangle } from "@tabler/icons-react"
import Link from "next/link"

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <IconAlertTriangle className="size-10 text-destructive" />
      <h2 className="font-heading text-lg font-bold">Session not found</h2>
      <p className="max-w-md text-center text-xs text-muted-foreground">
        {error.message || "Could not load this session's transcript."}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
        <Link href="/desk">
          <Button variant="ghost" size="sm">
            <IconArrowLeft className="size-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
