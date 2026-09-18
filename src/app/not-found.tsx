import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl">Página no encontrada</h1>
      <p className="text-texto-sec">La dirección que abriste no existe o cambió.</p>
      <Link href="/" className="inline-flex items-center text-rojo underline">
        Volver al inicio
      </Link>
    </main>
  );
}
