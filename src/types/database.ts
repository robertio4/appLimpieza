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
    };
    Enums: {
      estado_factura: EstadoFactura;
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

export type CategoriaGasto = Database['public']['Tables']['categorias_gasto']['Row'];
export type CategoriaGastoInsert = Database['public']['Tables']['categorias_gasto']['Insert'];
export type CategoriaGastoUpdate = Database['public']['Tables']['categorias_gasto']['Update'];

export type Gasto = Database['public']['Tables']['gastos']['Row'];
export type GastoInsert = Database['public']['Tables']['gastos']['Insert'];
export type GastoUpdate = Database['public']['Tables']['gastos']['Update'];

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

export type GastoConCategoria = Gasto & {
  categoria: CategoriaGasto | null;
};
