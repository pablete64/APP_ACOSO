import { AppShell } from "@/components/layout/AppShell";
import { FolderOpen, BarChart2, Shield, FileText } from "lucide-react";

const NAV = [
  { href: "/inspector/expedientes", label: "Expedientes", icon: <FolderOpen size={18} /> },
  { href: "/inspector/denuncias",   label: "Denuncias",   icon: <FileText size={18} />   },
  { href: "/inspector/reportes",    label: "Reportes",    icon: <BarChart2 size={18} />  },
  { href: "/inspector/auditoria",   label: "Auditoría",   icon: <Shield size={18} />     },
];

export default function InspectorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} perfil="inspector">
      {children}
    </AppShell>
  );
}
