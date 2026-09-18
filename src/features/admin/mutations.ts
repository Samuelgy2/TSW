/**
 * Escrituras del panel.
 *
 * REGLA DEL PROYECTO: el panel nunca escribe directo a las tablas. Cada
 * operación administrativa pasa por una RPC de la base —`guardar_documento`,
 * `publicar_documento_version`, `guardar_producto`, `guardar_variante`,
 * `guardar_competencia`, `guardar_resultado`, `guardar_nivel`— que recibe
 * `p_actor_id` como primer parámetro y lo propaga a la bitácora.
 *
 * Si se escribe con un UPDATE directo, el trigger de auditoría registra el
 * cambio con `actor_id` en NULL y la bitácora deja de servir para lo único que
 * sirve: saber quién rompió qué.
 *
 * Las RPC solo están concedidas a `service_role`, así que se invocan desde
 * route handlers con `crearClienteAdmin()`, nunca desde el navegador.
 *
 * No hay función para escribir en `evento_auditoria`: la escriben los triggers
 * y un trigger de solo inserción rechaza cualquier UPDATE o DELETE, incluso con
 * la service role key.
 *
 * La implementación de los envoltorios tipados llega en la fase 2, junto con
 * los formularios del panel.
 */
export {};
