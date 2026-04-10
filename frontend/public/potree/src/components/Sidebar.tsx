import { useState } from "react";
import { Layers, ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  currentPage: "3d" | "2d";
  setCurrentPage: (page: "3d" | "2d") => void;
}

export function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  const items = [
    { id: "2d", label: "2D View", icon: Layers },
  ] as const;

  const [isMinimized, setIsMinimized] = useState(false);

  const toggleSidebar = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <aside
      className={`bg-gray-900 border-gray-800 shadow-lg transition-all duration-300 flex flex-col 
        ${isMinimized ? "w-16" : "w-60"}`}
    >
      <nav className="p-4 space-y-2 flex-grow">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center px-2 py-3 rounded-lg transition-colors 
                ${isActive ? "bg-indigo-100 text-indigo-600" : "text-gray-200 hover:bg-gray-700"}
                ${isMinimized ? "justify-center" : "space-x-3"}`}
              title={isMinimized ? item.label : undefined} // Tooltip cuando está minimizado
            >
              <Icon className="w-5 h-5" />
              <span
                className={`font-medium transition-all duration-300 overflow-hidden ${isMinimized ? "opacity-0 w-0 delay-100" : "opacity-100 w-auto delay-100"
                  }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Botón para minimizar en la parte inferior izquierda */}
      <button
        onClick={toggleSidebar}
        className="p-3 text-gray-200 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center"
      >
        {isMinimized ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  );
}
