"use client";

import React from "react";
import { 
  Building2, 
  MapPin, 
  User, 
  Database,
  Lock,
  Unlock,
  Edit2,
  Save
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/context/ProjectContext";
import { toast } from "sonner";

export function MetadataTab() {
  const { projects, activeProjectId, updateProject } = useProject();
  const activeProject = projects.find(p => p.id === activeProjectId);
  const [isEditing, setIsEditing] = React.useState(false);
  
  // Local state for the form
  const [formData, setFormData] = React.useState({
    name: activeProject?.name || "",
    client: activeProject?.client || "",
    address: activeProject?.address || "",
    type: activeProject?.type || "General",
    levels: activeProject?.levels || 1
  });

  // Sync local state when active project changes
  React.useEffect(() => {
    if (activeProject) {
      setFormData({
        name: activeProject.name,
        client: activeProject.client,
        address: activeProject.address || "",
        type: activeProject.type,
        levels: activeProject.levels
      });
    }
  }, [activeProject]);

  const handleSave = () => {
    if (activeProjectId) {
      updateProject(activeProjectId, formData);
      setIsEditing(false);
      toast.success("Project updated successfully!");
    }
  };

  if (!activeProject) return null;

  return (
    <div className="flex-1 p-8 bg-zinc-900 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Metadata Form */}
          <Card className="md:col-span-2 border-zinc-800 bg-zinc-950 text-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <InfoIcon className="w-5 h-5 text-blue-500" />
                  Project Details
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  General project information and structural definitions.
                </CardDescription>
              </div>
              <Button 
                variant={isEditing ? "outline" : "default"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className={isEditing 
                  ? "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
                }
              >
                {isEditing ? (
                  <><Lock className="w-4 h-4 mr-2" /> Cancel</>
                ) : (
                  <><Edit2 className="w-4 h-4 mr-2" /> Edit Details</>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Project Name</Label>
                  <div className="relative">
                    <Database className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <Input 
                      id="name" 
                      disabled={!isEditing}
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Casa Martínez" 
                      className="pl-10 border-zinc-800 bg-zinc-900 border-opacity-50 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client" className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Client Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <Input 
                      id="client" 
                      disabled={!isEditing}
                      value={formData.client}
                      onChange={(e) => setFormData({...formData, client: e.target.value})}
                      placeholder="e.g. Martínez Group" 
                      className="pl-10 border-zinc-800 bg-zinc-900 border-opacity-50 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Site Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <Input 
                      id="address" 
                      disabled={!isEditing}
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="e.g. Av. Diagonal 640" 
                      className="pl-10 border-zinc-800 bg-zinc-900 border-opacity-50 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Project Type</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 w-4 h-4 text-zinc-500 z-10" />
                    <Input 
                      id="type" 
                      disabled={!isEditing}
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      placeholder="Residential, Commercial, Heritage..." 
                      className="pl-10 border-zinc-800 bg-zinc-900 border-opacity-50 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                   <Label htmlFor="levels" className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Structural Levels</Label>
                   <Input 
                    id="levels" 
                    type="number" 
                    disabled={!isEditing}
                    value={formData.levels}
                    onChange={(e) => setFormData({...formData, levels: parseInt(e.target.value) || 0})}
                    className="border-zinc-800 bg-zinc-900 border-opacity-50 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                   />
                </div>
              </div>
            </CardContent>
            {isEditing && (
              <CardFooter className="border-t border-zinc-900 pt-4">
                <Button 
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white ml-auto gap-2"
                >
                  <Save className="w-4 h-4" />
                  SAVE CHANGES
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Stats Dashboard */}
          <div className="space-y-6">
            <Card className="border-zinc-800 bg-zinc-950 text-white shadow-xl">
              <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Total Points</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="text-3xl font-bold tracking-tighter text-blue-500">12,458,920</div>
                 <Badge variant="outline" className="mt-2 text-xs border-zinc-800 text-zinc-400 bg-zinc-900">
                    Dense Cloud
                 </Badge>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-950 text-white shadow-xl">
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Storage Size</CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-3xl font-bold tracking-tighter">1.4 GB</div>
                  <div className="mt-2 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-blue-500 h-full w-[65%]" />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-zinc-500 font-bold">
                     <span>USED: 1.4GB</span>
                     <span>FREE: 5GB</span>
                  </div>
               </CardContent>
            </Card>

            <Button variant="outline" className="w-full border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white h-12 gap-2">
               <Database size={16} />
               Optimize Database
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

