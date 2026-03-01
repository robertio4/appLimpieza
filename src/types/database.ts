/**
 * Supabase Database Types for Limpieza App
 * Auto-generated types matching the database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EstadoFactura = 'borrador' | 'enviada' | 'pagada';
export type EstadoPresupuesto = 'pendiente' | 'aceptado' | 'rechazado' | 'expirado';
export type TipoServicio = 'limpieza_general' | 'limpieza_profunda' | 'limpieza_oficina' | 'limpieza_cristales' | 'otros';
export type EstadoTrabajo = 'pendiente' | 'en_progreso' | 'completado' | 'cancelado';
export type SyncStatus = 'synced' | 'pending' | 'error';

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string;
          user_id: string;
          nombre: string;
          email: string | null;
          telefono: string | null;
          direccion: string | null;
          nif: string | null;
          notas: string | null;
          facturacion_recurrente: boolean;
          dia_facturacion: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nombre: string;
          email?: string | null;
          telefono?: string | null;
          direccion?: string | null;
          nif?: string | null;
          notas?: string | null;
          facturacion_recurrente?: boolean;
          dia_facturacion?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nombre?: string;
          email?: string | null;
          telefono?: string | null;
          direccion?: string | null;
          nif?: string | null;
          notas?: string | null;
          facturacion_recurrente?: boolean;
          dia_facturacion?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'clientes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      facturas: {
        Row: {
          id: string;
          user_id: string;
          numero: string;
          cliente_id: string;
          fecha: string;
          fecha_vencimiento: string | null;
          subtotal: number;
          iva: number;
          total: number;
          estado: EstadoFactura;
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          numero: string;
          cliente_id: string;
          fecha?: string;
          fecha_vencimiento?: string | null;
          subtotal?: number;
          iva?: number;
          total?: number;
          estado?: EstadoFactura;
          notas?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          numero?: string;
          cliente_id?: string;
          fecha?: string;
          fecha_vencimiento?: string | null;
          subtotal?: number;
          iva?: number;
          total?: number;
          estado?: EstadoFactura;
          notas?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'facturas_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'facturas_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'clientes';
            referencedColumns: ['id'];
          }
        ];
      };
      lineas_factura: {
        Row: {
          id: string;
          factura_id: string;
          concepto: string;
          cantidad: number;
          precio_unitario: number;
          total: number;
        };
        Insert: {
          id?: string;
          factura_id: string;
          concepto: string;
          cantidad?: number;
          precio_unitario?: number;
          total?: number;
        };
        Update: {
          id?: string;
          factura_id?: string;
          concepto?: string;
          cantidad?: number;
          precio_unitario?: number;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'lineas_factura_factura_id_fkey';
            columns: ['factura_id'];
            isOneToOne: false;
            referencedRelation: 'facturas';
            referencedColumns: ['id'];
          }
        ];
      };
      presupuestos: {
        Row: {
          id: string;
          user_id: string;
          numero: string;
          cliente_id: string;
          fecha: string;
          fecha_validez: string;
          subtotal: number;
          iva: number;
          total: number;
          estado: EstadoPresupuesto;
          notas: string | null;
          factura_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          numero: string;
          cliente_id: string;
          fecha?: string;
          fecha_validez: string;
          subtotal?: number;
          iva?: number;
          total?: number;
          estado?: EstadoPresupuesto;
          notas?: string | null;
          factura_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          numero?: string;
          cliente_id?: string;
          fecha?: string;
          fecha_validez?: string;
          subtotal?: number;
          iva?: number;
          total?: number;
          estado?: EstadoPresupuesto;
          notas?: string | null;
          factura_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'presupuestos_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'presupuestos_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'clientes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'presupuestos_factura_id_fkey';
            columns: ['factura_id'];
            isOneToOne: false;
            referencedRelation: 'facturas';
            referencedColumns: ['id'];
          }
        ];
      };
      lineas_presupuesto: {
        Row: {
          id: string;
          presupuesto_id: string;
          concepto: string;
          cantidad: number;
          precio_unitario: number;
          total: number;
        };
        Insert: {
          id?: string;
          presupuesto_id: string;
          concepto: string;
          cantidad?: number;
          precio_unitario?: number;
          total?: number;
        };
        Update: {
          id?: string;
          presupuesto_id?: string;
          concepto?: string;
          cantidad?: number;
          precio_unitario?: number;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'lineas_presupuesto_presupuesto_id_fkey';
            columns: ['presupuesto_id'];
            isOneToOne: false;
            referencedRelation: 'presupuestos';
            referencedColumns: ['id'];
          }
        ];
      };
      categorias_gasto: {
        Row: {
          id: string;
          user_id: string;
          nombre: string;
          color: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          nombre: string;
          color?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          nombre?: string;
          color?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'categorias_gasto_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      gastos: {
        Row: {
          id: string;
          user_id: string;
          fecha: string;
          concepto: string;
          categoria_id: string | null;
          importe: number;
          proveedor: string | null;
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          fecha?: string;
          concepto: string;
          categoria_id?: string | null;
          importe?: number;
          proveedor?: string | null;
          notas?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          fecha?: string;
          concepto?: string;
          categoria_id?: string | null;
          importe?: number;
          proveedor?: string | null;
          notas?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gastos_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gastos_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias_gasto';
            referencedColumns: ['id'];
          }
        ];
      };
      trabajos: {
        Row: {
          id: string;
          user_id: string;
          cliente_id: string;
          titulo: string;
          descripcion: string | null;
          tipo_servicio: TipoServicio;
          estado: EstadoTrabajo;
          fecha_inicio: string;
          fecha_fin: string;
          direccion: string | null;
          precio_acordado: number | null;
          es_recurrente: boolean;
          recurrencia_patron: string | null;
          recurrencia_padre_id: string | null;
          factura_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cliente_id: string;
          titulo: string;
          descripcion?: string | null;
          tipo_servicio?: TipoServicio;
          estado?: EstadoTrabajo;
          fecha_inicio: string;
          fecha_fin: string;
          direccion?: string | null;
          precio_acordado?: number | null;
          es_recurrente?: boolean;
          recurrencia_patron?: string | null;
          recurrencia_padre_id?: string | null;
          factura_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cliente_id?: string;
          titulo?: string;
          descripcion?: string | null;
          tipo_servicio?: TipoServicio;
          estado?: EstadoTrabajo;
          fecha_inicio?: string;
          fecha_fin?: string;
          direccion?: string | null;
          precio_acordado?: number | null;
          es_recurrente?: boolean;
          recurrencia_patron?: string | null;
          recurrencia_padre_id?: string | null;
          factura_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trabajos_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trabajos_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'clientes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trabajos_factura_id_fkey';
            columns: ['factura_id'];
            isOneToOne: false;
            referencedRelation: 'facturas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trabajos_recurrencia_padre_id_fkey';
            columns: ['recurrencia_padre_id'];
            isOneToOne: false;
            referencedRelation: 'trabajos';
            referencedColumns: ['id'];
          }
        ];
      };
      google_oauth_tokens: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_expiry: string;
          scope: string[];
          calendar_id: string | null;
          is_active: boolean;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_expiry: string;
          scope: string[];
          calendar_id?: string | null;
          is_active?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          refresh_token?: string;
          token_expiry?: string;
          scope?: string[];
          calendar_id?: string | null;
          is_active?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'google_oauth_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      calendario_sync: {
        Row: {
          id: string;
          user_id: string;
          trabajo_id: string;
          google_event_id: string;
          sync_status: SyncStatus;
          last_synced_at: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trabajo_id: string;
          google_event_id: string;
          sync_status?: SyncStatus;
          last_synced_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trabajo_id?: string;
          google_event_id?: string;
          sync_status?: SyncStatus;
          last_synced_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'calendario_sync_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calendario_sync_trabajo_id_fkey';
            columns: ['trabajo_id'];
            isOneToOne: true;
            referencedRelation: 'trabajos';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_invoice_number: {
        Args: {
          p_user_id: string;
        };
        Returns: string;
      };
      generate_presupuesto_number: {
        Args: {
          p_user_id: string;
        };
        Returns: string;
      };
      get_months_with_invoices: {
        Args: Record<PropertyKey, never>;
        Returns: {
          year: number;
          month: number;
          count: number;
        }[];
      };
    };
    Enums: {
      estado_factura: EstadoFactura;
      estado_presupuesto: EstadoPresupuesto;
      tipo_servicio: TipoServicio;
      estado_trabajo: EstadoTrabajo;
      sync_status: SyncStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenience types for direct table access
export type Cliente = Database['public']['Tables']['clientes']['Row'];
export type ClienteInsert = Database['public']['Tables']['clientes']['Insert'];
export type ClienteUpdate = Database['public']['Tables']['clientes']['Update'];

export type Factura = Database['public']['Tables']['facturas']['Row'];
export type FacturaInsert = Database['public']['Tables']['facturas']['Insert'];
export type FacturaUpdate = Database['public']['Tables']['facturas']['Update'];

export type LineaFactura = Database['public']['Tables']['lineas_factura']['Row'];
export type LineaFacturaInsert = Database['public']['Tables']['lineas_factura']['Insert'];
export type LineaFacturaUpdate = Database['public']['Tables']['lineas_factura']['Update'];

export type Presupuesto = Database['public']['Tables']['presupuestos']['Row'];
export type PresupuestoInsert = Database['public']['Tables']['presupuestos']['Insert'];
export type PresupuestoUpdate = Database['public']['Tables']['presupuestos']['Update'];

export type LineaPresupuesto = Database['public']['Tables']['lineas_presupuesto']['Row'];
export type LineaPresupuestoInsert = Database['public']['Tables']['lineas_presupuesto']['Insert'];
export type LineaPresupuestoUpdate = Database['public']['Tables']['lineas_presupuesto']['Update'];

export type CategoriaGasto = Database['public']['Tables']['categorias_gasto']['Row'];
export type CategoriaGastoInsert = Database['public']['Tables']['categorias_gasto']['Insert'];
export type CategoriaGastoUpdate = Database['public']['Tables']['categorias_gasto']['Update'];

export type Gasto = Database['public']['Tables']['gastos']['Row'];
export type GastoInsert = Database['public']['Tables']['gastos']['Insert'];
export type GastoUpdate = Database['public']['Tables']['gastos']['Update'];

export type Trabajo = Database['public']['Tables']['trabajos']['Row'];
export type TrabajoInsert = Database['public']['Tables']['trabajos']['Insert'];
export type TrabajoUpdate = Database['public']['Tables']['trabajos']['Update'];

export type GoogleOAuthToken = Database['public']['Tables']['google_oauth_tokens']['Row'];
export type GoogleOAuthTokenInsert = Database['public']['Tables']['google_oauth_tokens']['Insert'];
export type GoogleOAuthTokenUpdate = Database['public']['Tables']['google_oauth_tokens']['Update'];

export type CalendarioSync = Database['public']['Tables']['calendario_sync']['Row'];
export type CalendarioSyncInsert = Database['public']['Tables']['calendario_sync']['Insert'];
export type CalendarioSyncUpdate = Database['public']['Tables']['calendario_sync']['Update'];

// Extended types with relationships
export type FacturaConCliente = Factura & {
  cliente: Cliente;
};

export type FacturaConLineas = Factura & {
  lineas_factura: LineaFactura[];
};

export type FacturaCompleta = Factura & {
  cliente: Cliente;
  lineas_factura: LineaFactura[];
};

export type PresupuestoConCliente = Presupuesto & {
  cliente: Cliente;
};

export type PresupuestoConLineas = Presupuesto & {
  lineas_presupuesto: LineaPresupuesto[];
};

export type PresupuestoCompleto = Presupuesto & {
  cliente: Cliente;
  lineas_presupuesto: LineaPresupuesto[];
  factura?: Factura | null;
};

export type GastoConCategoria = Gasto & {
  categoria: CategoriaGasto | null;
};

export type TrabajoConCliente = Trabajo & {
  cliente: Cliente;
};

export type TrabajoConTodo = Trabajo & {
  cliente: Cliente;
  sync: CalendarioSync | null;
  factura: Factura | null;
};
