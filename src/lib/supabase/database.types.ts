export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      carrusel_slide: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          deporte_id: string | null
          descripcion: string | null
          destino_enlace: string | null
          etiqueta_enlace: string | null
          id: string
          imagen_path: string | null
          orden: number
          titulo: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          deporte_id?: string | null
          descripcion?: string | null
          destino_enlace?: string | null
          etiqueta_enlace?: string | null
          id?: string
          imagen_path?: string | null
          orden?: number
          titulo: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          deporte_id?: string | null
          descripcion?: string | null
          destino_enlace?: string | null
          etiqueta_enlace?: string | null
          id?: string
          imagen_path?: string | null
          orden?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrusel_slide_deporte_fk"
            columns: ["deporte_id"]
            isOneToOne: false
            referencedRelation: "deporte"
            referencedColumns: ["id"]
          },
        ]
      }
      club: {
        Row: {
          activo: boolean
          actualizado_en: string
          color_identidad: string | null
          creado_en: string
          deporte: string
          descripcion: string | null
          etiqueta: string | null
          id: string
          instagram_url: string | null
          logo_path: string | null
          nombre: string
          orden: number
          slug: string
          subtitulo_tarjeta: string | null
          tipo: string
          vinetas: string[]
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          color_identidad?: string | null
          creado_en?: string
          deporte: string
          descripcion?: string | null
          etiqueta?: string | null
          id?: string
          instagram_url?: string | null
          logo_path?: string | null
          nombre: string
          orden?: number
          slug: string
          subtitulo_tarjeta?: string | null
          tipo?: string
          vinetas?: string[]
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          color_identidad?: string | null
          creado_en?: string
          deporte?: string
          descripcion?: string | null
          etiqueta?: string | null
          id?: string
          instagram_url?: string | null
          logo_path?: string | null
          nombre?: string
          orden?: number
          slug?: string
          subtitulo_tarjeta?: string | null
          tipo?: string
          vinetas?: string[]
        }
        Relationships: []
      }
      competencia: {
        Row: {
          actualizado_en: string
          autorizacion_imagen_en: string | null
          creado_en: string
          cuerpo: string | null
          destacado: boolean
          estado: Database["public"]["Enums"]["estado_publicacion"]
          fecha: string
          id: string
          imagen_path: string | null
          slug: string
          titulo: string
        }
        Insert: {
          actualizado_en?: string
          autorizacion_imagen_en?: string | null
          creado_en?: string
          cuerpo?: string | null
          destacado?: boolean
          estado?: Database["public"]["Enums"]["estado_publicacion"]
          fecha: string
          id?: string
          imagen_path?: string | null
          slug: string
          titulo: string
        }
        Update: {
          actualizado_en?: string
          autorizacion_imagen_en?: string | null
          creado_en?: string
          cuerpo?: string | null
          destacado?: boolean
          estado?: Database["public"]["Enums"]["estado_publicacion"]
          fecha?: string
          id?: string
          imagen_path?: string | null
          slug?: string
          titulo?: string
        }
        Relationships: []
      }
      contador_referencia: {
        Row: {
          anio: number
          consecutivo: number
          creado_en: string
        }
        Insert: {
          anio: number
          consecutivo?: number
          creado_en?: string
        }
        Update: {
          anio?: number
          consecutivo?: number
          creado_en?: string
        }
        Relationships: []
      }
      contenido_sitio: {
        Row: {
          actualizado_en: string
          clave: string
          id: string
          valor: Json
        }
        Insert: {
          actualizado_en?: string
          clave: string
          id?: string
          valor: Json
        }
        Update: {
          actualizado_en?: string
          clave?: string
          id?: string
          valor?: Json
        }
        Relationships: []
      }
      deporte: {
        Row: {
          activo: boolean
          actualizado_en: string
          categoria: string
          creado_en: string
          descripcion: string
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          pie: string
          puntos: string[]
          slug: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          categoria?: string
          creado_en?: string
          descripcion?: string
          id?: string
          imagen_path?: string | null
          nombre: string
          orden?: number
          pie?: string
          puntos?: string[]
          slug: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          categoria?: string
          creado_en?: string
          descripcion?: string
          id?: string
          imagen_path?: string | null
          nombre?: string
          orden?: number
          pie?: string
          puntos?: string[]
          slug?: string
        }
        Relationships: []
      }
      documento: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          descripcion: string | null
          id: string
          orden: number
          titulo: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          descripcion?: string | null
          id?: string
          orden?: number
          titulo: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          descripcion?: string | null
          id?: string
          orden?: number
          titulo?: string
        }
        Relationships: []
      }
      documento_version: {
        Row: {
          archivado_en: string | null
          creado_en: string
          documento_id: string
          id: string
          nombre_archivo: string
          publicado_en: string
          storage_path: string
          subido_por: string | null
          tamano_bytes: number
          version: number
        }
        Insert: {
          archivado_en?: string | null
          creado_en?: string
          documento_id: string
          id?: string
          nombre_archivo: string
          publicado_en?: string
          storage_path: string
          subido_por?: string | null
          tamano_bytes: number
          version: number
        }
        Update: {
          archivado_en?: string | null
          creado_en?: string
          documento_id?: string
          id?: string
          nombre_archivo?: string
          publicado_en?: string
          storage_path?: string
          subido_por?: string | null
          tamano_bytes?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_version_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documento"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_auditoria: {
        Row: {
          accion: Database["public"]["Enums"]["accion_auditoria"]
          actor_id: string | null
          antes_json: Json | null
          despues_json: Json | null
          entidad: string
          entidad_id: string
          id: string
          ocurrido_en: string
        }
        Insert: {
          accion: Database["public"]["Enums"]["accion_auditoria"]
          actor_id?: string | null
          antes_json?: Json | null
          despues_json?: Json | null
          entidad: string
          entidad_id: string
          id?: string
          ocurrido_en?: string
        }
        Update: {
          accion?: Database["public"]["Enums"]["accion_auditoria"]
          actor_id?: string | null
          antes_json?: Json | null
          despues_json?: Json | null
          entidad?: string
          entidad_id?: string
          id?: string
          ocurrido_en?: string
        }
        Relationships: []
      }
      nivel: {
        Row: {
          activo: boolean
          actualizado_en: string
          club_id: string
          creado_en: string
          criterio_promocion: string | null
          cupo_maximo: number | null
          descripcion: string | null
          horario: string | null
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          rango_edad: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          club_id: string
          creado_en?: string
          criterio_promocion?: string | null
          cupo_maximo?: number | null
          descripcion?: string | null
          horario?: string | null
          id?: string
          imagen_path?: string | null
          nombre: string
          orden: number
          rango_edad?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          club_id?: string
          creado_en?: string
          criterio_promocion?: string | null
          cupo_maximo?: number | null
          descripcion?: string | null
          horario?: string | null
          id?: string
          imagen_path?: string | null
          nombre?: string
          orden?: number
          rango_edad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nivel_club_fk"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "club"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido: {
        Row: {
          actualizado_en: string
          comprador_email: string
          comprador_nombre: string
          comprador_telefono: string
          creado_en: string
          estado: Database["public"]["Enums"]["estado_pedido"]
          id: string
          notas: string | null
          pagado_en: string | null
          referencia: string
          reserva_expira_en: string
          total_centavos: number
        }
        Insert: {
          actualizado_en?: string
          comprador_email: string
          comprador_nombre: string
          comprador_telefono: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_pedido"]
          id?: string
          notas?: string | null
          pagado_en?: string | null
          referencia?: string
          reserva_expira_en?: string
          total_centavos?: number
        }
        Update: {
          actualizado_en?: string
          comprador_email?: string
          comprador_nombre?: string
          comprador_telefono?: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_pedido"]
          id?: string
          notas?: string | null
          pagado_en?: string | null
          referencia?: string
          reserva_expira_en?: string
          total_centavos?: number
        }
        Relationships: []
      }
      pedido_item: {
        Row: {
          cantidad: number
          creado_en: string
          id: string
          nombre_producto: string
          pedido_id: string
          precio_unitario_centavos: number
          talla: string
          variante_id: string
        }
        Insert: {
          cantidad: number
          creado_en?: string
          id?: string
          nombre_producto: string
          pedido_id: string
          precio_unitario_centavos: number
          talla: string
          variante_id: string
        }
        Update: {
          cantidad?: number
          creado_en?: string
          id?: string
          nombre_producto?: string
          pedido_id?: string
          precio_unitario_centavos?: number
          talla?: string
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_item_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_item_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variante"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_admin: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          id: string
          nombre: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      perfil_usuario: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          id: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      producto: {
        Row: {
          activo: boolean
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria_producto"] | null
          club_id: string | null
          creado_en: string
          descripcion: string | null
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          slug: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          categoria?: Database["public"]["Enums"]["categoria_producto"] | null
          club_id?: string | null
          creado_en?: string
          descripcion?: string | null
          id?: string
          imagen_path?: string | null
          nombre: string
          orden?: number
          slug: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          categoria?: Database["public"]["Enums"]["categoria_producto"] | null
          club_id?: string | null
          creado_en?: string
          descripcion?: string | null
          id?: string
          imagen_path?: string | null
          nombre?: string
          orden?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "club"
            referencedColumns: ["id"]
          },
        ]
      }
      resultado: {
        Row: {
          categoria: string
          competencia_id: string
          creado_en: string
          id: string
          puesto: number
          rider: string
        }
        Insert: {
          categoria: string
          competencia_id: string
          creado_en?: string
          id?: string
          puesto: number
          rider: string
        }
        Update: {
          categoria?: string
          competencia_id?: string
          creado_en?: string
          id?: string
          puesto?: number
          rider?: string
        }
        Relationships: [
          {
            foreignKeyName: "resultado_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencia"
            referencedColumns: ["id"]
          },
        ]
      }
      transaccion: {
        Row: {
          estado: string
          firma_valida: boolean
          id: string
          metodo_pago: string | null
          monto_centavos: number
          payload_json: Json
          pedido_id: string
          recibido_en: string
          wompi_id: string
        }
        Insert: {
          estado: string
          firma_valida?: boolean
          id?: string
          metodo_pago?: string | null
          monto_centavos: number
          payload_json: Json
          pedido_id: string
          recibido_en?: string
          wompi_id: string
        }
        Update: {
          estado?: string
          firma_valida?: boolean
          id?: string
          metodo_pago?: string | null
          monto_centavos?: number
          payload_json?: Json
          pedido_id?: string
          recibido_en?: string
          wompi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaccion_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedido"
            referencedColumns: ["id"]
          },
        ]
      }
      variante: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          precio_centavos: number
          producto_id: string
          sku: string | null
          stock: number
          stock_reservado: number
          talla: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          id?: string
          precio_centavos: number
          producto_id: string
          sku?: string | null
          stock?: number
          stock_reservado?: number
          talla: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          id?: string
          precio_centavos?: number
          producto_id?: string
          sku?: string | null
          stock?: number
          stock_reservado?: number
          talla?: string
        }
        Relationships: [
          {
            foreignKeyName: "variante_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activar_admin: {
        Args: { p_actor_id: string; p_id: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
        }
        SetofOptions: {
          from: "*"
          to: "perfil_admin"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      activar_usuario: {
        Args: { p_actor_id: string; p_id: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
          telefono: string | null
        }
        SetofOptions: {
          from: "*"
          to: "perfil_usuario"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      alternar_club_activo: {
        Args: { p_activo: boolean; p_actor_id: string; p_id: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          color_identidad: string | null
          creado_en: string
          deporte: string
          descripcion: string | null
          etiqueta: string | null
          id: string
          instagram_url: string | null
          logo_path: string | null
          nombre: string
          orden: number
          slug: string
          subtitulo_tarjeta: string | null
          tipo: string
          vinetas: string[]
        }
        SetofOptions: {
          from: "*"
          to: "club"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      alternar_deporte_activo: {
        Args: { p_activo: boolean; p_actor_id: string; p_id: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          categoria: string
          creado_en: string
          descripcion: string
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          pie: string
          puntos: string[]
          slug: string
        }
        SetofOptions: {
          from: "*"
          to: "deporte"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      alternar_documento_activo: {
        Args: { p_activo: boolean; p_actor_id: string; p_id: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          descripcion: string | null
          id: string
          orden: number
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "documento"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      alternar_nivel_activo: {
        Args: { p_activo: boolean; p_actor_id: string; p_id: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          club_id: string
          creado_en: string
          criterio_promocion: string | null
          cupo_maximo: number | null
          descripcion: string | null
          horario: string | null
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          rango_edad: string | null
        }
        SetofOptions: {
          from: "*"
          to: "nivel"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      alternar_producto_activo: {
        Args: { p_activo: boolean; p_actor_id: string; p_id: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria_producto"] | null
          club_id: string | null
          creado_en: string
          descripcion: string | null
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          slug: string
        }
        SetofOptions: {
          from: "*"
          to: "producto"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      alternar_variante_activa: {
        Args: { p_activo: boolean; p_actor_id: string; p_id: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          precio_centavos: number
          producto_id: string
          sku: string | null
          stock: number
          stock_reservado: number
          talla: string
        }
        SetofOptions: {
          from: "*"
          to: "variante"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archivar_competencia: {
        Args: { p_actor_id: string; p_id: string }
        Returns: {
          actualizado_en: string
          autorizacion_imagen_en: string | null
          creado_en: string
          cuerpo: string | null
          destacado: boolean
          estado: Database["public"]["Enums"]["estado_publicacion"]
          fecha: string
          id: string
          imagen_path: string | null
          slug: string
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "competencia"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      conciliar_perfil_de_cuenta: {
        Args: { p_id: string; p_nombre: string; p_tipo: string }
        Returns: undefined
      }
      consumir_reserva: {
        Args: { p_cantidad: number; p_variante_id: string }
        Returns: number
      }
      crear_perfil_admin: {
        Args: { p_actor_id: string; p_id: string; p_nombre: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
        }
        SetofOptions: {
          from: "*"
          to: "perfil_admin"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      desactivar_admin: {
        Args: { p_actor_id: string; p_id: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
        }
        SetofOptions: {
          from: "*"
          to: "perfil_admin"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      desactivar_usuario: {
        Args: { p_actor_id: string; p_id: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
          telefono: string | null
        }
        SetofOptions: {
          from: "*"
          to: "perfil_usuario"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      destacar_competencia: {
        Args: { p_actor_id: string; p_destacado: boolean; p_id: string }
        Returns: {
          actualizado_en: string
          autorizacion_imagen_en: string | null
          creado_en: string
          cuerpo: string | null
          destacado: boolean
          estado: Database["public"]["Enums"]["estado_publicacion"]
          fecha: string
          id: string
          imagen_path: string | null
          slug: string
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "competencia"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      eliminar_producto: {
        Args: { p_actor_id: string; p_id: string }
        Returns: string
      }
      eliminar_resultado: {
        Args: { p_actor_id: string; p_id: string }
        Returns: undefined
      }
      eliminar_slide_carrusel: {
        Args: { p_actor_id: string; p_id: string }
        Returns: undefined
      }
      es_admin: { Args: never; Returns: boolean }
      es_usuario: { Args: never; Returns: boolean }
      establecer_actor: { Args: { p_actor_id: string }; Returns: undefined }
      establecer_imagen_competencia: {
        Args: { p_actor_id: string; p_id: string; p_imagen_path: string }
        Returns: {
          actualizado_en: string
          autorizacion_imagen_en: string | null
          creado_en: string
          cuerpo: string | null
          destacado: boolean
          estado: Database["public"]["Enums"]["estado_publicacion"]
          fecha: string
          id: string
          imagen_path: string | null
          slug: string
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "competencia"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      establecer_imagen_deporte: {
        Args: { p_actor_id: string; p_id: string; p_imagen_path: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          categoria: string
          creado_en: string
          descripcion: string
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          pie: string
          puntos: string[]
          slug: string
        }
        SetofOptions: {
          from: "*"
          to: "deporte"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      establecer_imagen_nivel: {
        Args: { p_actor_id: string; p_id: string; p_imagen_path: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          club_id: string
          creado_en: string
          criterio_promocion: string | null
          cupo_maximo: number | null
          descripcion: string | null
          horario: string | null
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          rango_edad: string | null
        }
        SetofOptions: {
          from: "*"
          to: "nivel"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      establecer_imagen_producto: {
        Args: { p_actor_id: string; p_id: string; p_imagen_path: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria_producto"] | null
          club_id: string | null
          creado_en: string
          descripcion: string | null
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          slug: string
        }
        SetofOptions: {
          from: "*"
          to: "producto"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      establecer_imagen_slide_carrusel: {
        Args: { p_actor_id: string; p_id: string; p_imagen_path: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          deporte_id: string | null
          descripcion: string | null
          destino_enlace: string | null
          etiqueta_enlace: string | null
          id: string
          imagen_path: string | null
          orden: number
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "carrusel_slide"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      establecer_logo_club: {
        Args: { p_actor_id: string; p_id: string; p_logo_path: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          color_identidad: string | null
          creado_en: string
          deporte: string
          descripcion: string | null
          etiqueta: string | null
          id: string
          instagram_url: string | null
          logo_path: string | null
          nombre: string
          orden: number
          slug: string
          subtitulo_tarjeta: string | null
          tipo: string
          vinetas: string[]
        }
        SetofOptions: {
          from: "*"
          to: "club"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generar_referencia_pedido: { Args: never; Returns: string }
      guardar_club: {
        Args: {
          p_actor_id: string
          p_color_identidad?: string
          p_deporte?: string
          p_descripcion?: string
          p_etiqueta?: string
          p_id?: string
          p_instagram_url?: string
          p_nombre?: string
          p_orden?: number
          p_slug?: string
          p_subtitulo_tarjeta?: string
          p_tipo?: string
          p_vinetas?: string[]
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          color_identidad: string | null
          creado_en: string
          deporte: string
          descripcion: string | null
          etiqueta: string | null
          id: string
          instagram_url: string | null
          logo_path: string | null
          nombre: string
          orden: number
          slug: string
          subtitulo_tarjeta: string | null
          tipo: string
          vinetas: string[]
        }
        SetofOptions: {
          from: "*"
          to: "club"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_competencia: {
        Args: {
          p_actor_id: string
          p_autorizacion_imagen?: boolean
          p_cuerpo?: string
          p_fecha?: string
          p_id?: string
          p_slug?: string
          p_titulo?: string
        }
        Returns: {
          actualizado_en: string
          autorizacion_imagen_en: string | null
          creado_en: string
          cuerpo: string | null
          destacado: boolean
          estado: Database["public"]["Enums"]["estado_publicacion"]
          fecha: string
          id: string
          imagen_path: string | null
          slug: string
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "competencia"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_contenido: {
        Args: { p_actor_id: string; p_clave: string; p_valor: Json }
        Returns: {
          actualizado_en: string
          clave: string
          id: string
          valor: Json
        }
        SetofOptions: {
          from: "*"
          to: "contenido_sitio"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_deporte: {
        Args: {
          p_actor_id: string
          p_categoria?: string
          p_descripcion?: string
          p_id?: string
          p_nombre?: string
          p_orden?: number
          p_pie?: string
          p_puntos?: string[]
          p_slug?: string
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          categoria: string
          creado_en: string
          descripcion: string
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          pie: string
          puntos: string[]
          slug: string
        }
        SetofOptions: {
          from: "*"
          to: "deporte"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_documento: {
        Args: {
          p_activo?: boolean
          p_actor_id: string
          p_descripcion?: string
          p_id?: string
          p_orden?: number
          p_titulo?: string
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          descripcion: string | null
          id: string
          orden: number
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "documento"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_nivel: {
        Args: {
          p_activo?: boolean
          p_actor_id: string
          p_club_id?: string
          p_criterio_promocion?: string
          p_cupo_maximo?: number
          p_descripcion?: string
          p_horario?: string
          p_id?: string
          p_nombre?: string
          p_orden?: number
          p_rango_edad?: string
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          club_id: string
          creado_en: string
          criterio_promocion: string | null
          cupo_maximo: number | null
          descripcion: string | null
          horario: string | null
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          rango_edad: string | null
        }
        SetofOptions: {
          from: "*"
          to: "nivel"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_perfil_admin: {
        Args: { p_actor_id: string; p_id: string; p_nombre: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
        }
        SetofOptions: {
          from: "*"
          to: "perfil_admin"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_perfil_usuario: {
        Args: {
          p_actor_id: string
          p_id: string
          p_nombre: string
          p_telefono: string
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
          telefono: string | null
        }
        SetofOptions: {
          from: "*"
          to: "perfil_usuario"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_producto: {
        Args: {
          p_activo?: boolean
          p_actor_id: string
          p_categoria?: Database["public"]["Enums"]["categoria_producto"]
          p_club_id?: string
          p_descripcion?: string
          p_id?: string
          p_nombre?: string
          p_orden?: number
          p_slug?: string
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria_producto"] | null
          club_id: string | null
          creado_en: string
          descripcion: string | null
          id: string
          imagen_path: string | null
          nombre: string
          orden: number
          slug: string
        }
        SetofOptions: {
          from: "*"
          to: "producto"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_resultado: {
        Args: {
          p_actor_id: string
          p_categoria?: string
          p_competencia_id?: string
          p_id?: string
          p_puesto?: number
          p_rider?: string
        }
        Returns: {
          categoria: string
          competencia_id: string
          creado_en: string
          id: string
          puesto: number
          rider: string
        }
        SetofOptions: {
          from: "*"
          to: "resultado"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_slide_carrusel: {
        Args: {
          p_activo?: boolean
          p_actor_id: string
          p_deporte_id?: string
          p_descripcion?: string
          p_destino_enlace?: string
          p_etiqueta_enlace?: string
          p_id?: string
          p_orden?: number
          p_titulo?: string
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          deporte_id: string | null
          descripcion: string | null
          destino_enlace: string | null
          etiqueta_enlace: string | null
          id: string
          imagen_path: string | null
          orden: number
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "carrusel_slide"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_variante: {
        Args: {
          p_activo?: boolean
          p_actor_id: string
          p_id?: string
          p_precio_centavos?: number
          p_producto_id?: string
          p_sku?: string
          p_stock?: number
          p_talla?: string
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          precio_centavos: number
          producto_id: string
          sku: string | null
          stock: number
          stock_reservado: number
          talla: string
        }
        SetofOptions: {
          from: "*"
          to: "variante"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      liberar_reserva: {
        Args: { p_cantidad: number; p_variante_id: string }
        Returns: number
      }
      publicar_competencia: {
        Args: { p_actor_id: string; p_id: string }
        Returns: {
          actualizado_en: string
          autorizacion_imagen_en: string | null
          creado_en: string
          cuerpo: string | null
          destacado: boolean
          estado: Database["public"]["Enums"]["estado_publicacion"]
          fecha: string
          id: string
          imagen_path: string | null
          slug: string
          titulo: string
        }
        SetofOptions: {
          from: "*"
          to: "competencia"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publicar_documento_version: {
        Args: {
          p_actor_id: string
          p_documento_id: string
          p_nombre_archivo: string
          p_storage_path: string
          p_tamano_bytes: number
          p_version: number
        }
        Returns: {
          archivado_en: string | null
          creado_en: string
          documento_id: string
          id: string
          nombre_archivo: string
          publicado_en: string
          storage_path: string
          subido_por: string | null
          tamano_bytes: number
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "documento_version"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reordenar_niveles: {
        Args: { p_actor_id: string; p_club_id: string; p_ids: string[] }
        Returns: undefined
      }
      reordenar_slides_carrusel: {
        Args: { p_actor_id: string; p_ids: string[] }
        Returns: undefined
      }
      reservar_stock: {
        Args: { p_cantidad: number; p_variante_id: string }
        Returns: number
      }
      restablecer_contenido: {
        Args: { p_actor_id: string; p_clave: string }
        Returns: undefined
      }
      siguiente_version_documento: {
        Args: { p_documento_id: string }
        Returns: number
      }
      transicionar_pedido: {
        Args: {
          p_actor?: string
          p_nuevo_estado: Database["public"]["Enums"]["estado_pedido"]
          p_pedido_id: string
        }
        Returns: {
          actualizado_en: string
          comprador_email: string
          comprador_nombre: string
          comprador_telefono: string
          creado_en: string
          estado: Database["public"]["Enums"]["estado_pedido"]
          id: string
          notas: string | null
          pagado_en: string | null
          referencia: string
          reserva_expira_en: string
          total_centavos: number
        }
        SetofOptions: {
          from: "*"
          to: "pedido"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      accion_auditoria:
        | "crear"
        | "actualizar"
        | "eliminar"
        | "publicar"
        | "archivar"
        | "cambiar_estado"
      categoria_producto: "buso" | "guantes" | "camiseta" | "gorra"
      estado_pedido:
        | "pendiente"
        | "pagado"
        | "rechazado"
        | "expirado"
        | "preparando"
        | "entregado"
        | "cancelado"
      estado_publicacion: "borrador" | "publicado" | "archivado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      accion_auditoria: [
        "crear",
        "actualizar",
        "eliminar",
        "publicar",
        "archivar",
        "cambiar_estado",
      ],
      categoria_producto: ["buso", "guantes", "camiseta", "gorra"],
      estado_pedido: [
        "pendiente",
        "pagado",
        "rechazado",
        "expirado",
        "preparando",
        "entregado",
        "cancelado",
      ],
      estado_publicacion: ["borrador", "publicado", "archivado"],
    },
  },
} as const
