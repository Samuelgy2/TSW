/**
 * Lecturas de pedidos (fase 2).
 *
 * Ojo: `pedido`, `pedido_item` y `transaccion` no tienen lectura anónima en
 * RLS. El comprador consulta su pedido por route handler, que valida
 * referencia + correo y responde con `crearClienteAdmin()`.
 */
export {};
