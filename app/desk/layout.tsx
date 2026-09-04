"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/nav/sidebar"
import { Separator } from "@/components/ui/separator"
import { usePathname } from "next/navigation"

const pageTitles: Record<string, string> = {
  "/desk": "Dashboard",
  "/desk/positions": "Positions",
}

export default function DeskLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const title = pageTitles[pathname] || "Session"

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="w-auto min-w-0">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-heading text-sm font-semibold">{title}</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
