"use client";

import React from "react";
import { Plus, Cpu, ChevronRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/ProjectContext";
import { motion } from "framer-motion";

export function HomeScreen() {
  const { addProject } = useProject();

  const handleNewProject = () => {
    const name = prompt("Project Name:", "New Lidar Project");
    if (name) {
      addProject(name);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-white relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 flex flex-col items-center text-center px-6"
      >
        <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8 shadow-2xl group transition-transform hover:scale-105">
          <Cpu className="w-12 h-12 text-blue-500 group-hover:text-blue-400 transition-colors" />
        </div>
        
        <h1 className="text-6xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
          LidarArch
        </h1>
        
        <p className="text-zinc-400 text-lg max-w-md mb-12 font-medium">
          Professional LiDAR data processing and architectural visualization suite.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={handleNewProject}
            size="lg" 
            className="h-16 px-8 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-105 group"
          >
            <Plus className="mr-2 w-6 h-6" />
            CREATE NEW PROJECT
            <ChevronRight className="ml-2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
          </Button>
          
          <Button 
            variant="outline"
            size="lg"
            className="h-16 px-8 border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-white text-lg font-bold rounded-2xl transition-all"
          >
            <LayoutDashboard className="mr-2 w-6 h-6" />
            DOCUMENTATION
          </Button>
        </div>

        <div className="mt-24 grid grid-cols-3 gap-12 border-t border-zinc-900 pt-12">
          <div className="flex flex-col items-center">
             <span className="text-2xl font-bold text-white">0.1.4</span>
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Version</span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-2xl font-bold text-white">PRO</span>
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">License</span>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-2xl font-bold text-white">FAST</span>
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Engine</span>
          </div>
        </div>
      </motion.div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px] pointer-events-none" />
    </div>
  );
}
