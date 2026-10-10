import { POLITICA_COOKIES } from "@/config/legales";
import { PaginaLegal, metadataLegal } from "../plantilla";

export const metadata = metadataLegal(POLITICA_COOKIES);

export default function PaginaPoliticaCookies() {
  return <PaginaLegal documento={POLITICA_COOKIES} />;
}
