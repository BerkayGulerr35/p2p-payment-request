export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      payment_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          request_id: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          request_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_events_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'payment_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_requests: {
        Row: {
          amount_cents: number;
          created_at: string;
          expires_at: string;
          id: string;
          memo: string | null;
          public_id: string;
          recipient_id: string;
          sender_id: string;
          status: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          expires_at?: string;
          id?: string;
          memo?: string | null;
          public_id?: string;
          recipient_id: string;
          sender_id: string;
          status?: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          expires_at?: string;
          id?: string;
          memo?: string | null;
          public_id?: string;
          recipient_id?: string;
          sender_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_requests_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_requests_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          email: string;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      payment_requests_public: {
        Row: {
          amount_cents: number | null;
          created_at: string | null;
          expires_at: string | null;
          memo: string | null;
          public_id: string | null;
          sender_display_name: string | null;
          status: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      record_cancel: { Args: { p_request_id: string }; Returns: undefined };
      record_decline: { Args: { p_request_id: string }; Returns: undefined };
      record_pay: { Args: { p_request_id: string }; Returns: undefined };
      run_expiry_sweep: { Args: never; Returns: number };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
