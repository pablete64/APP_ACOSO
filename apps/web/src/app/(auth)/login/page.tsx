import {
  Button,
  Input,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  LegalNotice,
  Spinner,
} from "@safework/ui-kit";

export const metadata = {
  title: "Acceder — SafeWork AI",
  description: "Inicia sesión en la plataforma SafeWork AI",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / brand */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-brand-700">
            SafeWork AI
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plataforma de prevención del acoso laboral
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>
              Accede con las credenciales proporcionadas por tu empresa.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* NOTE: form interaction handled client-side via React Hook Form */}
            <form className="space-y-4" action="#" method="post">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@empresa.es"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Acceder
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <a
              href="/auth/forgot-password"
              className="text-sm text-brand-600 underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
            <a
              href="/worker/seguimiento"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Consultar denuncia anónima
            </a>
          </CardFooter>
        </Card>

        <LegalNotice variant="info" expandable />
      </div>
    </main>
  );
}
