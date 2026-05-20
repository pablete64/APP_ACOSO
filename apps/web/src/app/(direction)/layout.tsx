import { AppShell } from "@/components/layout/AppShell";
import { BarChart2, TrendingUp, BookOpen, ClipboardList } from "lucide-react";

const NAV = [
  { href: "/direction/dashboard", label: "Dashboard",        icon: <BarChart2 size={18} />     },
  { href: "/direction/clima",     label: "Clima laboral",    icon: <TrendingUp size={18} />    },
  { href: "/direction/formacion", label: "Formación",        icon: <BookOpen size={18} />      },
  { href: "/direction/plan",      label: "Plan de igualdad", icon: <ClipboardList size={18} /> },
];

export default function DirectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} perfil="direccion">
      {children}
    </AppShell>
  );
}
