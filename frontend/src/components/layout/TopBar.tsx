"use client";

import React from "react";
import { 
  Bell, 
  Search, 
  User, 
  HelpCircle,
  Share2,
  Calendar,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface TopBarProps {
  projectName: string;
  projectType: string;
}

export function TopBar({ projectName, projectType }: TopBarProps) {
  return (
    <div className="flex h-16 items-center justify-between border-b bg-zinc-950 px-6 text-zinc-300">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest leading-none mb-1">Project</span>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h1 className="text-base font-bold text-white line-clamp-1">{projectName}</h1>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
              {projectType}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            className="pl-9 h-9 border-zinc-800 bg-zinc-900 text-sm text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-blue-500"
            placeholder="Search projects or files..."
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
            <Bell size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
            <HelpCircle size={18} />
          </Button>
          <Separator orientation="vertical" className="h-6 bg-zinc-800 mx-2" />
          <Button variant="outline" className="h-8 gap-2 border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white">
            <Share2 size={14} />
            Share
          </Button>
          <div className="flex items-center gap-3 ml-4 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-white">Arch. Jane Doe</span>
              <span className="text-[10px] text-zinc-500">Premium Plan</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              JD
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
