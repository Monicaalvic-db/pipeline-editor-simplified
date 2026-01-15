"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NotebookIcon, ClockIcon, Database, Workflow, CloudIcon, SearchIcon, Store, Code, Code2, LayoutDashboard, Sparkles, History, Warehouse, ListTodo, Merge, Sparkle, UserCog, Brain, TestTube, Layers, CloudCog, Upload, FileText, Search, Grid3X3, Settings, Bell, FlaskConical, Network, FolderGit, CircleDot, Cloud, Zap } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: {
    text: string;
  };
}




interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

const workspaceNavItems: NavItem[] = [
  {
    title: "Workspace",
    href: "#",
    icon: <NotebookIcon className="size-4" />,
  },
  {
    title: "Recents",
    href: "#",
    icon: <ClockIcon className="size-4" />,   
  },
  {
    title: "Catalog",
    href: "",
    icon: <Database className="size-4" />,
  },
  {
    title: "Jobs & Pipelines",
    href: "#",
    icon: <Workflow className="size-4" />,
  },
  {
    title: "Compute",
    href: "#",
    icon: <CloudIcon className="size-4" />,
  },
  {
    title: "Discover",
    href: "#",
    icon: <SearchIcon className="size-4" />,  
  },
  {
    title: "Marketplace",
    href: "#",
    icon: <Store className="size-4" />,  
  },
];

const sqlNavItems: NavItem[] = [
  {
    title: "SQL Editor",
    href: "#",
    icon: <Code className="size-4" />,
  },
  {
    title: "Queries",
    href: "#",
    icon: <Code2 className="size-4" />,
  },
  {
    title: "Dashboards",
    href: "#",
    icon: <LayoutDashboard className="size-4" />,
  },
  {
    title: "Genie",
    href: "#",
    icon: <Sparkles className="size-4" />,
  },
  {
    title: "Alerts",
    href: "#",
    icon: <Bell className="size-4" />,
  },
  {
    title: "Query history",
    href: "#",
    icon: <History className="size-4" />,
  },
  {
    title: "SQL Warehouses",
    href: "#",
    icon: <Warehouse className="size-4" />,
  },
];

const dataEngineeringNavItems: NavItem[] = [
  {
    title: "Runs",
    href: "#",
    icon: <ListTodo className="size-4" />,
  },
  {
    title: "Data ingestion",
    href: "#",
    icon: <Merge className="size-4" />,
  },
];

const aiNavItems: NavItem[] = [
  {
    title: "Playground",
    href: "#",
    icon: <Sparkle className="size-4" />,
  },
  {
    title: "Agents",
    href: "#",
    icon: <UserCog className="size-4" />,
    badge: {
      text: "Beta",
    },
  },
  {
    title: "Experiments",
    href: "#",
    icon: <TestTube className="size-4" />,
  },
  {
    title: "Feature store",
    href: "#",
    icon: <Layers className="size-4" />,
  },
  {
    title: "Models",
    href: "#",
    icon: <Brain className="size-4" />,
  },
  {
    title: "Serving",
    href: "#",
    icon: <CloudCog className="size-4" />,
  },
];  

const newMenuItems = [
  { title: "Add or upload data", icon: <Upload className="h-4 w-4" />, href: "/data" },
  { title: "Notebook", icon: <FileText className="h-4 w-4" />, href: "/notebook" },
  { title: "Query", icon: <Search className="h-4 w-4" />, href: "/query" },
  { title: "Dashboard", icon: <Grid3X3 className="h-4 w-4" />, href: "/dashboard" },
  { title: "Genie space", icon: <Sparkles className="h-4 w-4" />, href: "/genie" },
  { title: "Job", icon: <Settings className="h-4 w-4" />, href: "/job" },
  { title: "ETL pipeline", icon: <Network className="h-4 w-4" />, href: "/pipelines/new" },
  { title: "Legacy Alert", icon: <Bell className="h-4 w-4" />, href: "/legacy-alert" },
  { title: "Alert", icon: <Bell className="h-4 w-4" />, href: "/alert" },
  { title: "Experiment", icon: <FlaskConical className="h-4 w-4" />, href: "/experiment" },
  { title: "Model", icon: <Network className="h-4 w-4" />, href: "/model" },
  { title: "App", icon: <Layers className="h-4 w-4" />, href: "/app" },
];

const moreMenuItems = [
  { title: "Git folder", icon: <FolderGit className="h-4 w-4" />, href: "/git" },
  { title: "Cluster", icon: <CircleDot className="h-4 w-4" />, href: "/cluster" },
  { title: "SQL warehouse", icon: <Cloud className="h-4 w-4" />, href: "/warehouse" },
  { title: "Serving endpoint", icon: <Zap className="h-4 w-4" />, href: "/endpoint" },
];

export function BrandSidebar({
  collapsed = false,
  onToggle,
  className,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas" className="fixed top-[3rem] border-none">
      <SidebarHeader>
        <div className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full flex items-center justify-start gap-3 px-2 py-2 mb-2 bg-red-600/10 hover:bg-red-600/40 rounded-lg text-left transition-colors border border-red-600/20">
                <Plus className="h-5 w-5 text-red-500" />
                <span className="text-sm font-semibold text-foreground">New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-56">
              {newMenuItems.map((item) => (
                <DropdownMenuItem key={item.title} asChild>
                  <Link href={item.href} className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {moreMenuItems.map((item) => (
                <DropdownMenuItem key={item.title} asChild>
                  <Link href={item.href} className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      <SidebarContent className="hide-scrollbar">
        {/* Main Nav Items */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href ||
                      (pathname === "" && item.href === "/")
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge.text}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* SQL Nav Items */}
        <SidebarGroup>
        <SidebarGroupLabel>SQL</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sqlNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href ||
                      (pathname === "" && item.href === "/")
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge.text}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Data Engineering Nav Items */}
        <SidebarGroup>
        <SidebarGroupLabel>Data Engineering</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataEngineeringNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href ||
                      (pathname === "" && item.href === "/")
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge.text}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI Nav Items */}
        <SidebarGroup>
        <SidebarGroupLabel>AI/ML</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href ||
                      (pathname === "" && item.href === "/")
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge.text}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
