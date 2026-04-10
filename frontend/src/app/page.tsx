"use client";

import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectTabs } from "@/components/workflow/ProjectTabs";
import { HomeScreen } from "@/components/layout/HomeScreen";
import { useProject } from "@/context/ProjectContext";

export default function Home() {
  const { activeProjectId, projects } = useProject();
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeProject ? (
          <>
            <TopBar 
              projectName={activeProject.name}
              projectType={activeProject.type}
            />
            <div className="flex-1 flex overflow-hidden">
              <ProjectTabs />
            </div>
          </>
        ) : (
          <HomeScreen />
        )}

        <footer className="h-6 border-t border-zinc-900 bg-black flex items-center justify-between px-6 px-1.5 select-none">
          <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Server High Performance</span>
            <span>Version: 0.1.4-BETA</span>
          </div>
          <div className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
            LidarArch Studio © 2024
          </div>
        </footer>
      </div>
    </>
  );
}


