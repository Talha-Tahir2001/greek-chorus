"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconDashboard, IconBriefcase, IconMessages, IconSpeakerphone } from "@tabler/icons-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", url: "/desk", icon: IconDashboard },
  { title: "Positions", url: "/desk/positions", icon: IconBriefcase },
  { title: "Sessions", url: "/desk/sessions", icon: IconMessages },
]

interface RecentSession {
  id: string
  createdAt: string
  tickersScreened: string[]
  status: string
}

export function AppSidebar({ sessions = [] }: { sessions?: RecentSession[] }) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/desk" />}>
              <div className="flex size-8 items-center justify-center rounded-none bg-primary text-primary-foreground">
                <IconSpeakerphone className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-heading text-sm font-semibold">Options Desk</span>
                <span className="text-xs text-muted-foreground">Greek Chorus</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={pathname === item.url}
                    render={<Link href={item.url} />}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sessions.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Recent Sessions</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sessions.slice(0, 8).map((session) => (
                    <SidebarMenuItem key={session.id}>
                      <SidebarMenuButton
                        isActive={pathname === `/desk/sessions/${session.id}`}
                        render={<Link href={`/desk/sessions/${session.id}`} />}
                      >
                        <IconMessages className="size-4" />
                        <div className="flex flex-col gap-0.5 leading-none">
                          <span className="truncate text-xs">
                            {session.tickersScreened?.join(", ") || "Screening..."}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {session.status}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
