import { z } from "zod";

/** Acceso al panel. Único rol del sistema: administrador. */
export const esquemaAcceso = z.object({
  correo: z.string().email("Correo inválido"),
  contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type EntradaAcceso = z.infer<typeof esquemaAcceso>;
