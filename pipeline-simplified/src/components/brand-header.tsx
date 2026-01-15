"use client";

import { ChevronDown, LayoutGrid, Menu, Moon, Search, Sparkles, Sun, User, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/components/ui/sidebar";

import { Logo } from "./logo";

export function BrandHeader() {
  const [selectedWorkspace, setSelectedWorkspace] = useState("My Workspace");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  useEffect(() => {
    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const workspaces = [
    "DBJS Dogfood",
    "Enterprise Workspace", 
    "My Workspace 2"
  ];

  return (
    <header 
      className="fixed z-50 w-full py-2"
    >
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 md:flex"
            onClick={toggleSidebar}
          >
            <Menu className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="size-4" />
          </Button>

          <Link href="/" className="flex items-center">
            <Logo size="sm"/>
          </Link>
        </div>

        {/* Desktop middle search bar */}
        <div className="hidden items-center space-x-1 md:flex">
          <div className="relative">
            <Input type="text" placeholder="Search..." className="h-8 w-64 bg-background pl-8 dark:bg-background" />
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Desktop right side header */}
        <div className="hidden items-center space-x-1 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-foreground"
              >
                <span>{selectedWorkspace}</span>
                <ChevronDown className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace}
                  onClick={() => setSelectedWorkspace(workspace)}
                  className={selectedWorkspace === workspace ? "bg-accent" : ""}
                >
                  {workspace}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="text-foreground">
            <Sparkles className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-foreground">
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 rounded-full p-0">
                <Avatar className="size-6 cursor-pointer">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <span className="text-xs">M</span>
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                {theme === "light" ? (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark Mode
                  </>
                ) : (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    Light Mode
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile right side header */}
        <div className="flex gap-2 md:hidden">
          <Button variant="ghost" size="sm" className="text-foreground">
            <Search className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 rounded-full p-0">
                <Avatar className="size-8 cursor-pointer">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <span className="text-xs">ME</span>
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                {theme === "light" ? (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark Mode
                  </>
                ) : (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    Light Mode
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
