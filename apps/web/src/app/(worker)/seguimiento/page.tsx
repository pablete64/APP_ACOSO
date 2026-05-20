import {
  Button,
  Input,
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge,
  LegalNotice,
  AnonimoBadge,
  TrackingCodeDisplay,
} from "@safework/ui-kit";

export const metadata = {
  title: "Seguimiento de denuncia — SafeWork AI",
  description: "Consulta el estado de tu denuncia de forma anónima",
};

export default function SeguimientoPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Seguimiento de denuncia
          </h1>
          <AnonimoBadge size="sm" />
        </div>
        <p className="text-sm text-muted-foreground">
          Introduce tu código de seguimiento para consultar el estado de tu denuncia.
          No es necesario iniciar sesión.
        </p>
      </div>

      {/* Lookup form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consultar estado</CardTitle>
          <CardDescription>
            El código de 10 caracteres te fue entregado al presentar la denuncia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex gap-3" action="#" method="get">
            <Input
              name="codigo"
              type="text"
              placeholder="XXXX-XXXX-XX"
              autoComplete="off"
              className="font-mono uppercase tracking-widest"
              maxLength={12}
              aria-label="Código de seguimiento"
            />
            <Button type="submit" className="shrink-0">
              Consultar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Example result — will be dynamic in production */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">Estado de tu denuncia</CardTitle>
            <Badge variant="trust">En revisión</Badge>
          </div>
          <CardDescription>
            Última actualización: 19 de mayo de 2026 · 10:34
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Tu denuncia ha sido recibida y está siendo revisada por la persona
            designada. Recibirás una actualización en los próximos 10 días hábiles
            conforme a lo establecido en la Ley 2/2023.
          </p>

          <TrackingCodeDisplay code="ABCD1234EF" />
        </CardContent>
      </Card>

      <LegalNotice variant="compact" />
    </main>
  );
}
