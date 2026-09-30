"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AreaTexto, Archivo, Aviso, Badge, Boton, Campo, LogoClub } from "@/components/ui";
import { confirmarLogoClub, guardarClub, prepararLogoClub, quitarLogoClub } from "@/features/admin/acciones-sitio";
import type { ClubPanel } from "@/features/admin/queries-contenido";
import { esquemaClub, type EntradaClub } from "@/features/admin/schemas";
import { subirDirecto } from "@/features/admin/subir-directo";
import { MAXIMO_IMAGEN_SITIO_BYTES, MIMES_IMAGEN_SITIO, resolverImagenSitio } from "../imagenes";
import { ListaTextoEditable } from "./ListaEditable";

type Mensaje = { tono: "exito" | "error"; texto: string } | null;

/**
 * Pestaña "Clubes": datos y logo de cada club y de los programas (Habilidades
 * Motrices), porque la portada pinta la tarjeta de los tres desde esta tabla.
 *
 * Datos y logo se guardan por separado, a propósito:
 *  · los datos, con "Guardar club", por `guardar_club` —reemplazo total; el
 *    formulario es el estado completo de lo que se deja editar—;
 *  · el logo, al subirlo, por `establecer_logo_club`, el único camino por el
 *    que cambia. Si la imagen entrara también por el guardado, cada camino
 *    necesitaría su copia de las reglas.
 *
 * El formulario valida con el MISMO esquema Zod que la acción del servidor.
 */
export function ClubesAdmin({ clubes }: { clubes: ClubPanel[] }) {
  if (clubes.length === 0) {
    return <Aviso tono="info">Todavía no hay clubes registrados.</Aviso>;
  }

  return (
    <ul className="flex flex-col gap-6">
      {clubes.map((club) => (
        <li key={club.id}>
          <FichaClub club={club} />
        </li>
      ))}
    </ul>
  );
}

function FichaClub({ club }: { club: ClubPanel }) {
  const router = useRouter();
  const [borrador, setBorrador] = useState<EntradaClub>({
    id: club.id,
    nombre: club.nombre,
    etiqueta: club.etiqueta ?? "",
    descripcion: club.descripcion ?? "",
    subtituloTarjeta: club.subtitulo_tarjeta ?? "",
    vinetas: club.vinetas,
    colorIdentidad: club.color_identidad ?? "",
    instagramUrl: club.instagram_url ?? "",
  });
  const [ruta, setRuta] = useState(club.logo_path);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [mensajeDatos, setMensajeDatos] = useState<Mensaje>(null);
  const [mensajeLogo, setMensajeLogo] = useState<Mensaje>(null);

  const cambiar = (campo: Exclude<keyof EntradaClub, "vinetas">) => (valor: string) =>
    setBorrador((b) => ({ ...b, [campo]: valor }));

  async function guardar() {
    setMensajeDatos(null);
    // Las viñetas en blanco se descartan: añadir una fila y no escribir nada no es un error.
    const validado = esquemaClub.safeParse({
      ...borrador,
      vinetas: borrador.vinetas.map((v) => v.trim()).filter((v) => v !== ""),
    });
    if (!validado.success) {
      setMensajeDatos({ tono: "error", texto: validado.error.issues[0]?.message ?? "Revisa los datos." });
      return;
    }
    setGuardando(true);
    const resultado = await guardarClub(validado.data);
    setGuardando(false);
    if (resultado.ok) {
      setMensajeDatos({ tono: "exito", texto: resultado.mensaje ?? "Club guardado." });
      router.refresh();
    } else {
      setMensajeDatos({ tono: "error", texto: resultado.error });
    }
  }

  async function subirLogo(archivo: File | null) {
    // `Archivo` avisa con null cuando el elegido no pasó su validación.
    if (!archivo) return;
    setSubiendo(true);
    setMensajeLogo(null);
    const resultado = await subirDirecto(
      archivo,
      { mimesPermitidos: MIMES_IMAGEN_SITIO, maximoBytes: MAXIMO_IMAGEN_SITIO_BYTES },
      (mime, tamano) => prepararLogoClub(club.id, mime, tamano),
      (rutaSubida) => confirmarLogoClub(club.id, rutaSubida),
    );
    setSubiendo(false);
    if (resultado.ok) {
      setRuta(resultado.ruta ?? ruta);
      setMensajeLogo({ tono: "exito", texto: resultado.mensaje ?? "Logo cargado." });
      router.refresh();
    } else {
      setMensajeLogo({ tono: "error", texto: resultado.error });
    }
  }

  async function quitarLogo() {
    setSubiendo(true);
    setMensajeLogo(null);
    const resultado = await quitarLogoClub(club.id);
    setSubiendo(false);
    if (resultado.ok) {
      setRuta(null);
      setMensajeLogo({ tono: "exito", texto: resultado.mensaje ?? "Logo quitado." });
      router.refresh();
    } else {
      setMensajeLogo({ tono: "error", texto: resultado.error });
    }
  }

  return (
    <section
      aria-labelledby={`club-${club.id}`}
      className="flex flex-col gap-5 rounded-md border border-gris-borde p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <LogoClub
          nombre={borrador.nombre || club.nombre}
          logoUrl={resolverImagenSitio(ruta)}
          color={/^#[0-9a-fA-F]{6}$/.test(borrador.colorIdentidad) ? borrador.colorIdentidad : club.color_identidad}
          tamano="lg"
        />
        <h3 id={`club-${club.id}`} className="font-display text-xl text-azul-profundo">
          {club.nombre}
        </h3>
        {!club.activo && <Badge>Desactivado</Badge>}
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold text-azul-profundo">Logo</h4>
        {mensajeLogo && <Aviso tono={mensajeLogo.tono}>{mensajeLogo.texto}</Aviso>}
        <Archivo
          etiqueta={subiendo ? "Subiendo…" : ruta ? "Cambiar logo" : "Subir logo"}
          mimesPermitidos={MIMES_IMAGEN_SITIO}
          descripcionTipos="PNG, JPG o WebP"
          maximoBytes={MAXIMO_IMAGEN_SITIO_BYTES}
          ayuda="Mejor PNG con fondo transparente. Sin SVG. Se guarda al subirlo."
          disabled={subiendo}
          alSeleccionar={(archivo) => void subirLogo(archivo as File | null)}
        />
        {ruta && (
          <Boton variante="fantasma" tamano="sm" onClick={quitarLogo} disabled={subiendo} className="self-start">
            Quitar logo
          </Boton>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-gris-borde pt-4">
        <h4 className="text-sm font-semibold text-azul-profundo">Datos del club</h4>
        {mensajeDatos && <Aviso tono={mensajeDatos.tono}>{mensajeDatos.texto}</Aviso>}
        <Campo
          etiqueta="Nombre"
          required
          maxLength={80}
          value={borrador.nombre}
          onChange={(e) => cambiar("nombre")(e.target.value)}
        />
        <Campo
          etiqueta="Etiqueta"
          ayuda="Línea corta sobre el club, por ejemplo cómo se vinculó a la corporación."
          maxLength={80}
          value={borrador.etiqueta}
          onChange={(e) => cambiar("etiqueta")(e.target.value)}
        />
        <AreaTexto
          etiqueta="Descripción"
          maxLength={1200}
          rows={5}
          value={borrador.descripcion}
          onChange={(e) => cambiar("descripcion")(e.target.value)}
        />
        <Campo
          etiqueta="Texto de la tarjeta pequeña"
          ayuda="Va bajo el nombre en la tarjeta de la portada, por ejemplo «El club de la casa»."
          maxLength={60}
          value={borrador.subtituloTarjeta}
          onChange={(e) => cambiar("subtituloTarjeta")(e.target.value)}
        />
        <ListaTextoEditable
          etiqueta="Viñetas de «Nuestros clubes y programa»"
          items={borrador.vinetas}
          maximo={4}
          alCambiar={(vinetas) => setBorrador((b) => ({ ...b, vinetas }))}
        />
        <Campo
          etiqueta="Color de identidad"
          ayuda="Formato #RRGGBB. Tiñe el hueco del logo mientras no haya archivo."
          maxLength={7}
          autoComplete="off"
          spellCheck={false}
          value={borrador.colorIdentidad}
          onChange={(e) => cambiar("colorIdentidad")(e.target.value)}
        />
        <Campo
          etiqueta="Instagram"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://www.instagram.com/usuario"
          value={borrador.instagramUrl}
          onChange={(e) => cambiar("instagramUrl")(e.target.value)}
        />
        <div className="flex justify-end">
          <Boton onClick={guardar} cargando={guardando}>
            Guardar club
          </Boton>
        </div>
      </div>
    </section>
  );
}
