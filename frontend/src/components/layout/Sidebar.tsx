"use client";

import React from "react";
import { 
  LayoutDashboard, 
  Cpu, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  MoreVertical,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useProject } from "@/context/ProjectContext";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const { projects, activeProjectId, setActiveProject, addProject, deleteProject } = useProject();
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const handleNewProject = () => {
    const name = prompt("Project Name:", "New Lidar Project");
    if (name) {
      addProject(name);
    }
  };

  return (
    <div className={cn(
      "flex flex-col border-r bg-zinc-950 text-zinc-400 transition-all duration-300 relative z-50",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <span 
            className="text-lg font-bold tracking-tight text-white flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveProject(null)}
          >
            <Cpu className="w-6 h-6 text-blue-500" />
            LidarArch
          </span>
        )}
        {collapsed && <Cpu className="w-8 h-8 text-blue-500 mx-auto cursor-pointer" onClick={() => setActiveProject(null)} />}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-zinc-400 hover:text-white"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      <Separator className="bg-zinc-800" />

      <div className="p-4">
        <Button 
          onClick={handleNewProject}
          variant="outline" 
          className={cn(
            "w-full justify-start gap-2 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white",
            collapsed && "px-0 justify-center"
          )}
        >
          <Plus size={18} />
          {!collapsed && "New Project"}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4">
          <div className="py-2">
            {!collapsed && (
              <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Projects
              </h2>
            )}
            <div className="space-y-1">
              {projects.map((project) => (
                <div key={project.id} className="relative group">
                  <Button
                    onClick={() => setActiveProject(project.id)}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 px-2 text-zinc-400 hover:bg-zinc-900 hover:text-white",
                      collapsed && "justify-center",
                      activeProjectId === project.id && "bg-zinc-900 text-white"
                    )}
                  >
                    <LayoutDashboard size={18} className={cn(activeProjectId === project.id && "text-blue-500")} />
                    {!collapsed && (
                      <div className="flex flex-col items-start overflow-hidden w-full pr-6">
                        <span className="truncate text-sm font-medium">{project.name}</span>
                        <span className="truncate text-xs text-zinc-500">{project.type}</span>
                      </div>
                    )}
                  </Button>
                  
                  {!collapsed && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-500 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === project.id ? null : project.id);
                        }}
                      >
                        <MoreVertical size={14} />
                      </Button>
                      
                      {openMenuId === project.id && (
                        <div 
                          className="absolute right-8 top-0 w-32 bg-zinc-900 border border-zinc-800 rounded-md shadow-2xl py-1 z-[100] animate-in fade-in zoom-in-95 duration-100"
                          onMouseLeave={() => setOpenMenuId(null)}
                        >
                          <button
                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Eliminar proyecto "${project.name}"?`)) {
                                deleteProject(project.id);
                              }
                              setOpenMenuId(null);
                            }}
                          >
                            <Trash2 size={12} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <Separator className="bg-zinc-800" />

      <div className="p-4">
        <Button variant="ghost" className={cn(
          "w-full justify-start gap-3 px-2 text-zinc-400 hover:bg-zinc-900 hover:text-white",
          collapsed && "justify-center"
        )}>
           <Cpu size={18} />
          {!collapsed && "LidarArch v0.1"}
        </Button>
      </div>
    </div>
  );
}

