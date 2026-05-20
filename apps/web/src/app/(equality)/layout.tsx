import { AppShell } from "@/components/layout/AppShell";
import {
  Inbox, FolderOpen, Users, BarChart2, BookOpen,
  MessageSquare, ClipboardList, Shield,
} from "lucide-react";

const NAV = [
  { href: "/equality/denuncias",   label: "Denuncias",           icon: <Inbox size={18} />        },
  { href: "/equality/expedientes", label: "Expedientes",         icon: <FolderOpen size={18} />   },
  { href: "/equality/contacto",    label: "Línea de contacto",   icon: <MessageSquare size={18} /> },
  { href: "/equality/formacion",   label: "Formación",           icon: <BookOpen size={18} />     },
  { href: "/equality/clima",       label: "Clima laboral",       icon: <BarChart2 size={18} />    },
  { href: "/equality/plan",        label: "Plan de igualdad",    icon: <ClipboardList size={18} />},
  { href: "/equality/usuarios",    label: "Usuarios",            icon: <Users size={18} />        },
  { href: "/equality/auditoria",   label: "Auditoría",           icon: <Shield size={18} />       },
];

export default function EqualityLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} perfil="responsable_igualdad">
      {children}
    </AppShell>
  );
}
