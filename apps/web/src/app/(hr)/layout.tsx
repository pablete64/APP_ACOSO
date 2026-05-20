import { AppShell } from "@/components/layout/AppShell";
import {
  Inbox, FolderOpen, Users, BarChart2, Shield,
  FileSignature, ClipboardList,
} from "lucide-react";

const NAV = [
  { href: "/hr/denuncias",    label: "Denuncias",        icon: <Inbox size={18} />         },
  { href: "/hr/expedientes",  label: "Expedientes",      icon: <FolderOpen size={18} />    },
  { href: "/hr/usuarios",     label: "Usuarios",         icon: <Users size={18} />         },
  { href: "/hr/reportes",     label: "Reportes",         icon: <BarChart2 size={18} />     },
  { href: "/hr/plan",         label: "Plan de igualdad", icon: <ClipboardList size={18} /> },
  { href: "/hr/firmas",       label: "Firma digital",    icon: <FileSignature size={18} /> },
  { href: "/hr/auditoria",    label: "Auditoría",        icon: <Shield size={18} />        },
];

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} perfil="rrhh_legal">
      {children}
    </AppShell>
  );
}
