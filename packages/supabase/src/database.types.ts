// Tipos gerados manualmente a partir de supabase/migrations/0001_init.sql,
// seguindo o formato oficial de `supabase gen types typescript`.
// Após rodar `pnpm db:gen-types` com um projeto Supabase real, substitua
// este arquivo pelo output oficial.

export type UserRole = "buyer_seller" | "admin" | "courier";
export type OrderStatus =
  | "pending"
  | "accepted"
  | "picked_up"
  | "delivering"
  | "delivered"
  | "cancelled";
export type CourierStatus = "offline" | "online" | "busy";

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: string;
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      couriers: {
        Row: {
          id: string;
          vehicle_type: string | null;
          vehicle_plate: string | null;
          document_url: string | null;
          status: CourierStatus;
          approved: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          vehicle_type?: string | null;
          vehicle_plate?: string | null;
          document_url?: string | null;
          status?: CourierStatus;
          approved?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["couriers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "couriers_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          description: string | null;
          price_cents: number;
          photos: string[];
          stock: number;
          status: "active" | "paused" | "removed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          title: string;
          description?: string | null;
          price_cents: number;
          photos?: string[];
          stock?: number;
          status?: "active" | "paused" | "removed";
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          courier_id: string | null;
          status: OrderStatus;
          delivery_address: string;
          delivery_lat: number | null;
          delivery_lng: number | null;
          total_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          courier_id?: string | null;
          status?: OrderStatus;
          delivery_address: string;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          total_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_courier_id_fkey";
            columns: ["courier_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price_cents: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      courier_locations: {
        Row: {
          courier_id: string;
          lat: number;
          lng: number;
          updated_at: string;
        };
        Insert: {
          courier_id: string;
          lat: number;
          lng: number;
        };
        Update: Partial<Database["public"]["Tables"]["courier_locations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "courier_locations_courier_id_fkey";
            columns: ["courier_id"];
            isOneToOne: true;
            referencedRelation: "couriers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      courier_status: CourierStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
