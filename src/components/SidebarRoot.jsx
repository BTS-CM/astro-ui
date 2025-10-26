import React, { useEffect } from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar.jsx";

function SidebarBridge() {
  const { toggleSidebar } = useSidebar();
  useEffect(() => {
    // Expose a global toggle so non-context islands (e.g., PageHeader) can trigger the sidebar
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
      {/* Render sidebar only up to lg breakpoint (mobile + md) */}
      <div className="lg:hidden">
        <AppSidebar />
      </div>
      {/* Content wrapped inside the provider to avoid layout gaps */}
      {children}
      <SidebarBridge />
    </SidebarProvider>
  );
}
