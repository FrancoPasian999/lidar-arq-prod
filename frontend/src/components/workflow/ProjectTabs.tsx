"use client";
 
 import React from "react";

import { 
  Info, 
  Upload, 
  Box, 
  Map
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetadataTab } from "./tabs/MetadataTab";
import { IngestionTab } from "./tabs/IngestionTab";
import { PotreeTab } from "./tabs/PotreeTab";
import { CadTab } from "./tabs/CadTab";
import { useProject } from "@/context/ProjectContext";
import { motion, AnimatePresence } from "framer-motion";

export function ProjectTabs() {
  const { activeProjectId } = useProject();
  const [activeTab, setActiveTab] = React.useState("info");

  // Reset tab to "info" when project changes
  React.useEffect(() => {
    setActiveTab("info");
  }, [activeProjectId]);

  const tabs = [
    { id: "info", label: "Información", icon: Info, component: MetadataTab },
    { id: "ingestion", label: "Carga de Datos", icon: Upload, component: IngestionTab },
    { id: "potree", label: "Limpieza Manual", icon: Box, component: PotreeTab },
    { id: "cad", label: "Generación de Planos", icon: Map, component: CadTab },
  ];

  return (
    <div className="flex-1 flex flex-col bg-zinc-900 overflow-hidden">
      <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="bg-zinc-950 px-6 border-b border-zinc-800">
          <TabsList className="h-12 bg-transparent gap-2 p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative h-12 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-500 hover:text-white data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none transition-all"
              >
                <div className="flex items-center gap-2">
                  <tab.icon size={16} />
                  {tab.label}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <TabsContent value={activeTab} className="m-0 h-full overflow-auto">
                {tabs.find(t => t.id === activeTab)?.component ? 
                  React.createElement(tabs.find(t => t.id === activeTab)!.component) : 
                  null
                }
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}
