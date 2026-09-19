"use client";

import { EstadoError, type EstadoErrorProps } from "@/components/ui";

export default function ErrorMatriculas(props: Omit<EstadoErrorProps, "contexto">) {
  return <EstadoError {...props} contexto="los documentos de matrícula" />;
}
