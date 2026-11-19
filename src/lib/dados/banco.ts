// Arquivo gerado: tipos do banco (MCP supabase-amo, generate_typescript_types).
// Nao editar a mao; regenerar com a mesma chamada depois de toda migration.

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          nome: string
          ordem: number
          slug: string
        }
        Insert: {
          nome: string
          ordem: number
          slug: string
        }
        Update: {
          nome?: string
          ordem?: number
          slug?: string
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          criado_em: string
          id: string
          moderado_em: string | null
          nome_exibido: string
          nota: number
          produto: string
          status: string
          texto: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          moderado_em?: string | null
          nome_exibido: string
          nota: number
          produto: string
          status?: string
          texto: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          moderado_em?: string | null
          nome_exibido?: string
          nota?: number
          produto?: string
          status?: string
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_produto_fkey"
            columns: ["produto"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["slug"]
          },
        ]
      }
      enderecos: {
        Row: {
          apelido: string | null
          atualizado_em: string
          bairro: string
          cep: string
          cidade: string
          complemento: string
          criado_em: string
          id: string
          logradouro: string
          numero: string
          principal: boolean
          uf: string
          user_id: string
        }
        Insert: {
          apelido?: string | null
          atualizado_em?: string
          bairro: string
          cep: string
          cidade: string
          complemento?: string
          criado_em?: string
          id?: string
          logradouro: string
          numero: string
          principal?: boolean
          uf: string
          user_id?: string
        }
        Update: {
          apelido?: string | null
          atualizado_em?: string
          bairro?: string
          cep?: string
          cidade?: string
          complemento?: string
          criado_em?: string
          id?: string
          logradouro?: string
          numero?: string
          principal?: boolean
          uf?: string
          user_id?: string
        }
        Relationships: []
      }
      horarios: {
        Row: {
          abre: string
          dia_da_semana: number
          fecha: string
        }
        Insert: {
          abre: string
          dia_da_semana: number
          fecha: string
        }
        Update: {
          abre?: string
          dia_da_semana?: number
          fecha?: string
        }
        Relationships: []
      }
      itens_do_pedido: {
        Row: {
          id: string
          nome: string
          pedido_id: string
          preco_centavos: number
          produto: string
          quantos: number
          tipo: string
          total_centavos: number
        }
        Insert: {
          id?: string
          nome: string
          pedido_id: string
          preco_centavos: number
          produto: string
          quantos: number
          tipo: string
          total_centavos: number
        }
        Update: {
          id?: string
          nome?: string
          pedido_id?: string
          preco_centavos?: number
          produto?: string
          quantos?: number
          tipo?: string
          total_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_do_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_do_pedido_produto_fkey"
            columns: ["produto"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["slug"]
          },
        ]
      }
      linhas: {
        Row: {
          categoria: string
          cor_do_rotulo: string
          frase: string | null
          modo_de_aproveitar: Json | null
          nome: string
          ordem: number
          regra: string
          selos: string[]
          slug: string
          tipo: string
        }
        Insert: {
          categoria: string
          cor_do_rotulo: string
          frase?: string | null
          modo_de_aproveitar?: Json | null
          nome: string
          ordem: number
          regra: string
          selos?: string[]
          slug: string
          tipo: string
        }
        Update: {
          categoria?: string
          cor_do_rotulo?: string
          frase?: string | null
          modo_de_aproveitar?: Json | null
          nome?: string
          ordem?: number
          regra?: string
          selos?: string[]
          slug?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "linhas_categoria_fkey"
            columns: ["categoria"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["slug"]
          },
        ]
      }
      loja: {
        Row: {
          id: boolean
          vendas_pausadas: boolean
        }
        Insert: {
          id?: boolean
          vendas_pausadas?: boolean
        }
        Update: {
          id?: boolean
          vendas_pausadas?: boolean
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          aprovado_em: string | null
          atualizado_em: string
          cartao_bandeira: string | null
          cartao_final: string | null
          criado_em: string
          forma: string
          id: string
          parcelas: number | null
          pedido_id: string
          pix_copia_e_cola: string | null
          pix_expira_em: string | null
          pix_qr_base64: string | null
          recusa: string | null
          status: string
          valor_centavos: number
        }
        Insert: {
          aprovado_em?: string | null
          atualizado_em?: string
          cartao_bandeira?: string | null
          cartao_final?: string | null
          criado_em?: string
          forma: string
          id?: string
          parcelas?: number | null
          pedido_id: string
          pix_copia_e_cola?: string | null
          pix_expira_em?: string | null
          pix_qr_base64?: string | null
          recusa?: string | null
          status?: string
          valor_centavos: number
        }
        Update: {
          aprovado_em?: string | null
          atualizado_em?: string
          cartao_bandeira?: string | null
          cartao_final?: string | null
          criado_em?: string
          forma?: string
          id?: string
          parcelas?: number | null
          pedido_id?: string
          pix_copia_e_cola?: string | null
          pix_expira_em?: string | null
          pix_qr_base64?: string | null
          recusa?: string | null
          status?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          a_caminho_em: string | null
          anonimizado_em: string | null
          cancelado_em: string | null
          cliente_celular: string | null
          cliente_email: string | null
          cliente_nome: string | null
          criado_em: string
          em_preparo_em: string | null
          entrega_bairro: string
          entrega_cep: string
          entrega_cidade: string
          entrega_complemento: string | null
          entrega_logradouro: string | null
          entrega_minutos: number
          entrega_numero: string | null
          entrega_uf: string
          entregue_em: string | null
          frete_centavos: number
          id: string
          motivo_cancelamento: string | null
          numero: string
          pago_em: string | null
          rastreio_url: string | null
          status: string
          subtotal_centavos: number
          total_centavos: number
          user_id: string | null
        }
        Insert: {
          a_caminho_em?: string | null
          anonimizado_em?: string | null
          cancelado_em?: string | null
          cliente_celular?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          criado_em?: string
          em_preparo_em?: string | null
          entrega_bairro: string
          entrega_cep: string
          entrega_cidade: string
          entrega_complemento?: string | null
          entrega_logradouro?: string | null
          entrega_minutos: number
          entrega_numero?: string | null
          entrega_uf: string
          entregue_em?: string | null
          frete_centavos: number
          id?: string
          motivo_cancelamento?: string | null
          numero: string
          pago_em?: string | null
          rastreio_url?: string | null
          status?: string
          subtotal_centavos: number
          total_centavos: number
          user_id?: string | null
        }
        Update: {
          a_caminho_em?: string | null
          anonimizado_em?: string | null
          cancelado_em?: string | null
          cliente_celular?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          criado_em?: string
          em_preparo_em?: string | null
          entrega_bairro?: string
          entrega_cep?: string
          entrega_cidade?: string
          entrega_complemento?: string | null
          entrega_logradouro?: string | null
          entrega_minutos?: number
          entrega_numero?: string | null
          entrega_uf?: string
          entregue_em?: string | null
          frete_centavos?: number
          id?: string
          motivo_cancelamento?: string | null
          numero?: string
          pago_em?: string | null
          rastreio_url?: string | null
          status?: string
          subtotal_centavos?: number
          total_centavos?: number
          user_id?: string | null
        }
        Relationships: []
      }
      perfis: {
        Row: {
          atualizado_em: string
          celular: string
          criado_em: string
          id: string
          marketing_aceito_em: string | null
          nome: string
          termos_aceitos_em: string
          versao_termos: string
        }
        Insert: {
          atualizado_em?: string
          celular: string
          criado_em?: string
          id: string
          marketing_aceito_em?: string | null
          nome: string
          termos_aceitos_em: string
          versao_termos: string
        }
        Update: {
          atualizado_em?: string
          celular?: string
          criado_em?: string
          id?: string
          marketing_aceito_em?: string | null
          nome?: string
          termos_aceitos_em?: string
          versao_termos?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          a_venda: boolean
          descricao: string | null
          destaque: boolean
          formato: string
          frase: string | null
          imagem_alt: string
          imagem_altura: number
          imagem_largura: number
          imagem_src: string
          linha: string
          nome: string
          ordem: number
          preco_centavos: number | null
          selos: string[]
          slug: string
          vontades: string[]
        }
        Insert: {
          a_venda?: boolean
          descricao?: string | null
          destaque?: boolean
          formato: string
          frase?: string | null
          imagem_alt: string
          imagem_altura: number
          imagem_largura: number
          imagem_src: string
          linha: string
          nome: string
          ordem: number
          preco_centavos?: number | null
          selos?: string[]
          slug: string
          vontades?: string[]
        }
        Update: {
          a_venda?: boolean
          descricao?: string | null
          destaque?: boolean
          formato?: string
          frase?: string | null
          imagem_alt?: string
          imagem_altura?: number
          imagem_largura?: number
          imagem_src?: string
          linha?: string
          nome?: string
          ordem?: number
          preco_centavos?: number | null
          selos?: string[]
          slug?: string
          vontades?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "produtos_linha_fkey"
            columns: ["linha"]
            isOneToOne: false
            referencedRelation: "linhas"
            referencedColumns: ["slug"]
          },
        ]
      }
      selos: {
        Row: {
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          id: string
          nome: string
          ordem: number
        }
        Update: {
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      vontades: {
        Row: {
          ordem: number
          palavra: string
          slug: string
        }
        Insert: {
          ordem: number
          palavra: string
          slug: string
        }
        Update: {
          ordem?: number
          palavra?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancelar_pedido: { Args: { p_pedido: string }; Returns: undefined }
      conferir_porta: { Args: never; Returns: undefined }
      criar_pedido: {
        Args: {
          p_cotacao: string
          p_guardar_endereco?: boolean
          p_itens: Json
          p_total_visto: number
        }
        Returns: {
          id: string
          numero: string
          total_centavos: number
        }[]
      }
      definir_marketing: { Args: { p_aceita: boolean }; Returns: undefined }
      enviar_comentario: {
        Args: { p_nota: number; p_produto: string; p_texto: string }
        Returns: string
      }
      iniciar_pagamento: {
        Args: { p_forma: string; p_pedido: string }
        Returns: string
      }
      pode_excluir_conta: {
        Args: never
        Returns: {
          motivo: string
          pode: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
