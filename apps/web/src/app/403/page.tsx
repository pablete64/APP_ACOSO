import { Button } from "@safework/ui-kit";
import Link from "next/link";

export const metadata = { title: "Acceso no autorizado — SafeWork AI" };

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <p className="text-5xl font-bold text-brand-600">403</p>
        <h1 className="text-xl font-semibold">No tienes acceso a esta sección</h1>
        {/* Mensaje neutro: no filtrar info sobre permisos */}
        <p className="text-sm text-muted-foreground">
          Si crees que esto es un error, contacta con tu administrador.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
