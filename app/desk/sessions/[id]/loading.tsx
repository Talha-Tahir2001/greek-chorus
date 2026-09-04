import { Skeleton } from "@/components/ui/skeleton"

export default function SessionLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-[200px] rounded-none" />
      <Skeleton className="h-4 w-[300px] rounded-none" />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Skeleton className="h-[500px] rounded-none" />
        <div className="space-y-4">
          <Skeleton className="h-[100px] rounded-none" />
          <Skeleton className="h-[150px] rounded-none" />
        </div>
      </div>
    </div>
  )
}
