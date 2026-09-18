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
      competencia: {
        Row: {
          actualizado_en: string
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
          creado_en: string
          criterio_promocion: string | null
          descripcion: string | null
          horario: string | null
          id: string
          nombre: string
          orden: number
          rango_edad: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          criterio_promocion?: string | null
          descripcion?: string | null
          horario?: string | null
          id?: string
          nombre: string
          orden: number
          rango_edad?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          criterio_promocion?: string | null
          descripcion?: string | null
          horario?: string | null
          id?: string
          nombre?: string
          orden?: number
          rango_edad?: string | null
        }
        Relationships: []
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
      producto: {
        Row: {
          activo: boolean
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria_producto"]
          creado_en: string
          descripcion: string | null
          id: string
          nombre: string
          orden: number
          slug: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          categoria: Database["public"]["Enums"]["categoria_producto"]
          creado_en?: string
          descripcion?: string | null
          id?: string
          nombre: string
          orden?: number
          slug: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          categoria?: Database["public"]["Enums"]["categoria_producto"]
          creado_en?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          orden?: number
          slug?: string
        }
        Relationships: []
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
      consumir_reserva: {
        Args: { p_cantidad: number; p_variante_id: string }
        Returns: number
      }
      establecer_actor: { Args: { p_actor_id: string }; Returns: undefined }
      generar_referencia_pedido: { Args: never; Returns: string }
      guardar_competencia: {
        Args: {
          p_actor_id: string
          p_cuerpo?: string
          p_destacado?: boolean
          p_estado?: Database["public"]["Enums"]["estado_publicacion"]
          p_fecha?: string
          p_id?: string
          p_imagen_path?: string
          p_slug?: string
          p_titulo?: string
        }
        Returns: {
          actualizado_en: string
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
          p_criterio_promocion?: string
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
          creado_en: string
          criterio_promocion: string | null
          descripcion: string | null
          horario: string | null
          id: string
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
      guardar_producto: {
        Args: {
          p_activo?: boolean
          p_actor_id: string
          p_categoria?: Database["public"]["Enums"]["categoria_producto"]
          p_descripcion?: string
          p_id?: string
          p_nombre?: string
          p_orden?: number
          p_slug?: string
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          categoria: Database["public"]["Enums"]["categoria_producto"]
          creado_en: string
          descripcion: string | null
          id: string
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
      reservar_stock: {
        Args: { p_cantidad: number; p_variante_id: string }
        Returns: number
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
      categoria_producto: "uniformes" | "proteccion" | "merchandising"
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
      categoria_producto: ["uniformes", "proteccion", "merchandising"],
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
