import React, { useEffect } from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar.jsx";

function SidebarBridge() {
  const { toggleSidebar } = useSidebar();
  useEffect(() => {
    window.__toggleSidebar = () => toggleSidebar();
    return () => {
      if (window.__toggleSidebar) delete window.__toggleSidebar;
    };
  }, [toggleSidebar]);
  return null;
}

export default function SidebarRoot({ children }) {
  return (
    <SidebarProvider>
      <div className="lg:hidden">
        <AppSidebar />
      </div>
      {children}
      <SidebarBridge />
    </SidebarProvider>
  );
}
