import { AppShell } from "@/components/layout/AppShell";
import {
  AlertTriangle, Bot, BookOpen, Phone, Search, BarChart2,
} from "lucide-react";

const NAV = [
  { href: "/worker/denuncia",   label: "Presentar denuncia", icon: <AlertTriangle size={18} /> },
  { href: "/worker/seguimiento",label: "Seguimiento",         icon: <Search size={18} />        },
  { href: "/worker/asistente",  label: "Asistente IA",        icon: <Bot size={18} />           },
  { href: "/worker/formacion",  label: "Formación",           icon: <BookOpen size={18} />      },
  { href: "/worker/contacto",   label: "Línea de contacto",   icon: <Phone size={18} />         },
  { href: "/worker/clima",      label: "Clima laboral",       icon: <BarChart2 size={18} />     },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} perfil="trabajador">
      {children}
    </AppShell>
  );
}
