"use client";

import { EstadoError, type EstadoErrorProps } from "@/components/ui";

export default function ErrorPanel(props: Omit<EstadoErrorProps, "contexto">) {
  return <EstadoError {...props} contexto="esta sección del panel" />;
}
