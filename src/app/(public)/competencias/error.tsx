"use client";

import { EstadoError, type EstadoErrorProps } from "@/components/ui";

export default function ErrorCompetencias(props: Omit<EstadoErrorProps, "contexto">) {
  return <EstadoError {...props} contexto="las competencias" />;
}
