"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Project {
  id: string;
  name: string;
  client: string;
  type: string;
  address?: string;
  levels: number;
}

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  selectedFile: string | null;
  addProject: (name: string) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  setSelectedFile: (fileName: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'lidarch_projects_state';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Load from localStorage and Backend on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let initialProjects: Project[] = [];
    if (stored) {
      try {
        const { projects: storedProjects, selectedFile: storedFile } = JSON.parse(stored);
        initialProjects = storedProjects || [];
        setProjects(initialProjects);
        setSelectedFile(storedFile || null);
      } catch (e) {
        console.error("[PROJECT CONTEXT] Failed to parse project state", e);
      }
    }

    // Fetch latest from backend
    const apiurl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    console.log("[PROJECT CONTEXT] Fetching projects from:", apiurl);
    
    fetch(`${apiurl}/projects`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          console.log("[PROJECT CONTEXT] Backend returned projects:", data.length);
          // If backend has data, use it as source of truth
          // If backend is empty but we have local data, we'll keep local for a moment 
          // but eventually backend is truth. 
          if (data.length > 0) {
            setProjects(data);
          } else if (initialProjects.length > 0) {
            console.warn("[PROJECT CONTEXT] Backend is empty but localStorage has data. Keeping local data for now.");
          }
        }
      })
      .catch(err => console.error("[PROJECT CONTEXT] Failed to fetch projects from backend", err));
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      projects, 
      activeProjectId,
      selectedFile 
    }));
  }, [projects, activeProjectId, selectedFile]);

  const addProject = async (name: string) => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      client: "",
      type: "General",
      address: "",
      levels: 1
    };
    
    // Optimistic update
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);

    // Save to backend
    const apiurl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      await fetch(`${apiurl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
    } catch (err) {
      console.error("Failed to save project to backend", err);
    }
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
    
    // Save to backend
    const apiurl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      await fetch(`${apiurl}/projects/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Failed to delete project from backend", err);
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    
    // Save to backend
    const apiurl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      await fetch(`${apiurl}/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error("Failed to update project in backend", err);
    }
  };

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      activeProjectId, 
      selectedFile, 
      addProject, 
      deleteProject, 
      setActiveProject: setActiveProjectId,
      updateProject,
      setSelectedFile 
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

