import type { Metadata } from "next";

import { FormularioRecuperacion } from "@/features/admin/components/FormularioRecuperacion";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function PaginaRecuperar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const aviso =
    error === "enlace" ? "El enlace no es válido o ya venció. Pide uno nuevo." : undefined;

  return (
    <>
      <h1 className="text-2xl">Recuperar contraseña</h1>
      <p className="mt-2 mb-6 text-sm text-texto-sec">
        Te enviaremos un enlace para crear una contraseña nueva.
      </p>
      <FormularioRecuperacion avisoInicial={aviso} />
    </>
  );
}
