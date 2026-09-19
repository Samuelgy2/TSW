"use client";

import { EstadoError, type EstadoErrorProps } from "@/components/ui";

export default function ErrorSemilleros(props: Omit<EstadoErrorProps, "contexto">) {
  return <EstadoError {...props} contexto="los niveles de formación" />;
}
