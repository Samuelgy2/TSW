import { notFound } from "next/navigation";
import { listarClubes } from "@/features/clubes/queries";
import { clubDeSlug } from "@/features/publico/club-publico";

type Props = { children: React.ReactNode; params: Promise<{ club?: string[] }> };

/**
 * Valida el slug ANTES de que `loading.tsx` empiece a transmitir. El layout de
 * un segmento queda por encima de su `loading.tsx` (que solo envuelve la
 * página), así que un `notFound()` aquí sale con 404 real; desde la página
 * salía con 200 y `noindex`, un soft 404.
 */
export default async function LayoutSemilleros({ children, params }: Props) {
  const { club: segmentos } = await params;
  if (segmentos) {
    const clubes = await listarClubes();
    if (clubes.length > 0 && (segmentos.length > 1 || !clubDeSlug(clubes, segmentos[0] as string))) notFound();
  }
  return children;
}
