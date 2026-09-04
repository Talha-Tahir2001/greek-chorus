import { Skeleton } from "@/components/ui/skeleton"

export default function DeskLoading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-none" />
        ))}
      </div>
      <Skeleton className="h-[340px] rounded-none" />
      <Skeleton className="h-[200px] rounded-none" />
    </div>
  )
}
