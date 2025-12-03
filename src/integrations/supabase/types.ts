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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_status: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_status_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          created_at: string | null
          description: string
          id: string
          lead_id: string | null
          metadata: Json | null
          type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          type: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights_cache: {
        Row: {
          created_at: string
          expires_at: string
          generated_at: string
          id: string
          insights_data: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          insights_data: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          insights_data?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_cache_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          executed_at: string | null
          flow_id: string
          id: string
          lead_id: string
          workspace_id: string
        }
        Insert: {
          executed_at?: string | null
          flow_id: string
          id?: string
          lead_id: string
          workspace_id: string
        }
        Update: {
          executed_at?: string | null
          flow_id?: string
          id?: string
          lead_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flows: {
        Row: {
          created_at: string | null
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          name: string
          send_once_per_lead: boolean | null
          steps: Json | null
          success_rate: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          send_once_per_lead?: boolean | null
          steps?: Json | null
          success_rate?: number | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          send_once_per_lead?: boolean | null
          steps?: Json | null
          success_rate?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_flows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          error_message: string | null
          executed_at: string | null
          flow_id: string
          id: string
          lead_id: string
          message_sent: string | null
          status: string
          step_name: string | null
          workspace_id: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          flow_id: string
          id?: string
          lead_id: string
          message_sent?: string | null
          status: string
          step_name?: string | null
          workspace_id: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          flow_id?: string
          id?: string
          lead_id?: string
          message_sent?: string | null
          status?: string
          step_name?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          processed_at: string | null
          status: string | null
          trigger_data: Json | null
          trigger_type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          processed_at?: string | null
          status?: string | null
          trigger_data?: Json | null
          trigger_type: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          processed_at?: string | null
          status?: string | null
          trigger_data?: Json | null
          trigger_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          contact_name: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          lead_id: string | null
          message_id: string | null
          phone_number: string
          read_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_name?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          lead_id?: string | null
          message_id?: string | null
          phone_number: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_name?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          lead_id?: string | null
          message_id?: string | null
          phone_number?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          is_required: boolean | null
          name: string
          options: Json | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          name: string
          options?: Json | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          name?: string
          options?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      debriefing_ads: {
        Row: {
          ad_name: string
          ad_type: string
          campaign_objective: string
          cpc: number | null
          cpm: number | null
          created_at: string | null
          creative_file_url: string | null
          ctr: number | null
          debriefing_id: string
          id: string
          leads_generated: number | null
          observations: string | null
          performance_rating: number | null
          platform: string
          sales_generated: number | null
          total_spent: number | null
          view_link: string | null
        }
        Insert: {
          ad_name: string
          ad_type: string
          campaign_objective: string
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          creative_file_url?: string | null
          ctr?: number | null
          debriefing_id: string
          id?: string
          leads_generated?: number | null
          observations?: string | null
          performance_rating?: number | null
          platform: string
          sales_generated?: number | null
          total_spent?: number | null
          view_link?: string | null
        }
        Update: {
          ad_name?: string
          ad_type?: string
          campaign_objective?: string
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          creative_file_url?: string | null
          ctr?: number | null
          debriefing_id?: string
          id?: string
          leads_generated?: number | null
          observations?: string | null
          performance_rating?: number | null
          platform?: string
          sales_generated?: number | null
          total_spent?: number | null
          view_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debriefing_ads_debriefing_id_fkey"
            columns: ["debriefing_id"]
            isOneToOne: false
            referencedRelation: "debriefings"
            referencedColumns: ["id"]
          },
        ]
      }
      debriefing_checkouts: {
        Row: {
          abandonment_rate: number | null
          checkout_abandonments: number | null
          checkout_starts: number | null
          checkout_url: string | null
          completed_purchases: number | null
          conversion_rate: number | null
          created_at: string
          debriefing_id: string
          id: string
          name: string
          platform: string | null
          product_id: string | null
          total_views: number | null
          updated_at: string
        }
        Insert: {
          abandonment_rate?: number | null
          checkout_abandonments?: number | null
          checkout_starts?: number | null
          checkout_url?: string | null
          completed_purchases?: number | null
          conversion_rate?: number | null
          created_at?: string
          debriefing_id: string
          id?: string
          name: string
          platform?: string | null
          product_id?: string | null
          total_views?: number | null
          updated_at?: string
        }
        Update: {
          abandonment_rate?: number | null
          checkout_abandonments?: number | null
          checkout_starts?: number | null
          checkout_url?: string | null
          completed_purchases?: number | null
          conversion_rate?: number | null
          created_at?: string
          debriefing_id?: string
          id?: string
          name?: string
          platform?: string | null
          product_id?: string | null
          total_views?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debriefing_checkouts_debriefing_id_fkey"
            columns: ["debriefing_id"]
            isOneToOne: false
            referencedRelation: "debriefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debriefing_checkouts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      debriefing_pages: {
        Row: {
          avg_time_on_page: number | null
          conversion_rate: number | null
          conversions: number | null
          created_at: string
          cta_clicks: number | null
          debriefing_id: string
          id: string
          name: string
          page_url: string | null
          predominant_device: string | null
          predominant_traffic_source: string | null
          total_views: number | null
          unique_visitors: number | null
        }
        Insert: {
          avg_time_on_page?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string
          cta_clicks?: number | null
          debriefing_id: string
          id?: string
          name: string
          page_url?: string | null
          predominant_device?: string | null
          predominant_traffic_source?: string | null
          total_views?: number | null
          unique_visitors?: number | null
        }
        Update: {
          avg_time_on_page?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string
          cta_clicks?: number | null
          debriefing_id?: string
          id?: string
          name?: string
          page_url?: string | null
          predominant_device?: string | null
          predominant_traffic_source?: string | null
          total_views?: number | null
          unique_visitors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "debriefing_pages_debriefing_id_fkey"
            columns: ["debriefing_id"]
            isOneToOne: false
            referencedRelation: "debriefings"
            referencedColumns: ["id"]
          },
        ]
      }
      debriefing_products: {
        Row: {
          created_at: string
          debriefing_id: string
          id: string
          product_id: string
          quantity_sold: number
          total_revenue: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          debriefing_id: string
          id?: string
          product_id: string
          quantity_sold?: number
          total_revenue?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string
          debriefing_id?: string
          id?: string
          product_id?: string
          quantity_sold?: number
          total_revenue?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "debriefing_products_debriefing_id_fkey"
            columns: ["debriefing_id"]
            isOneToOne: false
            referencedRelation: "debriefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debriefing_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      debriefing_settings: {
        Row: {
          created_at: string
          fixed_cost: number | null
          id: string
          tax_percentage: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          fixed_cost?: number | null
          id?: string
          tax_percentage?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          fixed_cost?: number | null
          id?: string
          tax_percentage?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debriefing_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      debriefings: {
        Row: {
          abandonment_reasons: string | null
          avg_time_on_page: number | null
          campaign_type: string
          checkout_abandonments: number | null
          checkout_platform: string | null
          checkout_starts: number | null
          checkout_views: number | null
          completed_purchases: number | null
          conversions: number | null
          created_at: string | null
          created_by: string
          cta_clicks: number | null
          end_date: string | null
          gross_revenue: number | null
          id: string
          leads_captured: number | null
          net_revenue: number | null
          net_revenue_calculated: number | null
          net_revenue_with_costs: number | null
          next_steps: string | null
          page_url: string | null
          predominant_device: string | null
          predominant_traffic_source: string | null
          project_name: string
          responsible: string | null
          sales_made: number | null
          start_date: string | null
          total_investment: number | null
          total_views: number | null
          unique_visitors: number | null
          updated_at: string | null
          what_could_improve: string | null
          what_happened: string | null
          what_worked: string | null
          workspace_id: string
        }
        Insert: {
          abandonment_reasons?: string | null
          avg_time_on_page?: number | null
          campaign_type: string
          checkout_abandonments?: number | null
          checkout_platform?: string | null
          checkout_starts?: number | null
          checkout_views?: number | null
          completed_purchases?: number | null
          conversions?: number | null
          created_at?: string | null
          created_by: string
          cta_clicks?: number | null
          end_date?: string | null
          gross_revenue?: number | null
          id?: string
          leads_captured?: number | null
          net_revenue?: number | null
          net_revenue_calculated?: number | null
          net_revenue_with_costs?: number | null
          next_steps?: string | null
          page_url?: string | null
          predominant_device?: string | null
          predominant_traffic_source?: string | null
          project_name: string
          responsible?: string | null
          sales_made?: number | null
          start_date?: string | null
          total_investment?: number | null
          total_views?: number | null
          unique_visitors?: number | null
          updated_at?: string | null
          what_could_improve?: string | null
          what_happened?: string | null
          what_worked?: string | null
          workspace_id: string
        }
        Update: {
          abandonment_reasons?: string | null
          avg_time_on_page?: number | null
          campaign_type?: string
          checkout_abandonments?: number | null
          checkout_platform?: string | null
          checkout_starts?: number | null
          checkout_views?: number | null
          completed_purchases?: number | null
          conversions?: number | null
          created_at?: string | null
          created_by?: string
          cta_clicks?: number | null
          end_date?: string | null
          gross_revenue?: number | null
          id?: string
          leads_captured?: number | null
          net_revenue?: number | null
          net_revenue_calculated?: number | null
          net_revenue_with_costs?: number | null
          next_steps?: string | null
          page_url?: string | null
          predominant_device?: string | null
          predominant_traffic_source?: string | null
          project_name?: string
          responsible?: string | null
          sales_made?: number | null
          start_date?: string | null
          total_investment?: number | null
          total_views?: number | null
          unique_visitors?: number | null
          updated_at?: string | null
          what_could_improve?: string | null
          what_happened?: string | null
          what_worked?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debriefings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debriefings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      job_boards: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      job_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          job_id: string
          mentioned_users: string[] | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          job_id: string
          mentioned_users?: string[] | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          job_id?: string
          mentioned_users?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_comments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_custom_statuses: {
        Row: {
          created_at: string
          id: string
          position: number
          status_color: string
          status_id: string
          status_label: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          status_color?: string
          status_id: string
          status_label: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          status_color?: string
          status_id?: string
          status_label?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_custom_statuses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      job_subtasks: {
        Row: {
          assigned_to: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          job_id: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          job_id: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          job_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_subtasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_subtasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_time_logs: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          hours: number | null
          id: string
          job_id: string
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          hours?: number | null
          id?: string
          job_id: string
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          hours?: number | null
          id?: string
          job_id?: string
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_time_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_time_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          board_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          board_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          board_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "job_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_appointments: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          lead_id: string
          notes: string | null
          reminder_sent: boolean
          reminder_sent_at: string | null
          scheduled_date: string
          scheduled_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_appointments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pipeline_relations: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean
          lead_id: string
          pipeline_id: string
          stage_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          lead_id: string
          pipeline_id: string
          stage_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          lead_id?: string
          pipeline_id?: string
          stage_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_pipeline_relations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_relations_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_relations_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tag_relations: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tag_relations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "lead_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          workspace_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          workspace_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string | null
          currency: string | null
          custom_fields: Json | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          pipeline_id: string
          pipeline_stage_updated_at: string | null
          pipeline_tag: string | null
          position: string | null
          source: string | null
          stage_id: string
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: number | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string | null
          currency?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pipeline_id: string
          pipeline_stage_updated_at?: string | null
          pipeline_tag?: string | null
          position?: string | null
          source?: string | null
          stage_id: string
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string | null
          currency?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pipeline_id?: string
          pipeline_stage_updated_at?: string | null
          pipeline_tag?: string | null
          position?: string | null
          source?: string | null
          stage_id?: string
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          lead_id: string | null
          phone_number: string
          read_at: string | null
          sent_at: string | null
          status: string
          template_used: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          lead_id?: string | null
          phone_number: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_used?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          lead_id?: string | null
          phone_number?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_used?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaign_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          api_type: string
          created_at: string
          custom_numbers: Json | null
          id: string
          leads_count: number | null
          message_interval_minutes: number | null
          message_preview: string | null
          multiple_templates: Json | null
          name: string
          recipient_type: string
          scheduled_at: string | null
          segments: Json | null
          sent_at: string | null
          status: string
          template_id: string | null
          template_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          api_type?: string
          created_at?: string
          custom_numbers?: Json | null
          id?: string
          leads_count?: number | null
          message_interval_minutes?: number | null
          message_preview?: string | null
          multiple_templates?: Json | null
          name: string
          recipient_type?: string
          scheduled_at?: string | null
          segments?: Json | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          api_type?: string
          created_at?: string
          custom_numbers?: Json | null
          id?: string
          leads_count?: number | null
          message_interval_minutes?: number | null
          message_preview?: string | null
          multiple_templates?: Json | null
          name?: string
          recipient_type?: string
          scheduled_at?: string | null
          segments?: Json | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_settings: {
        Row: {
          created_at: string
          default_api_type: string
          evolution_message_interval: number
          id: string
          max_messages_per_minute: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_api_type?: string
          evolution_message_interval?: number
          id?: string
          max_messages_per_minute?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_api_type?: string
          evolution_message_interval?: number
          id?: string
          max_messages_per_minute?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_integrations: {
        Row: {
          access_token: string
          app_secret: string
          created_at: string
          field_mapping: Json
          id: string
          is_active: boolean
          meta_app_id: string
          name: string
          selected_pipeline_id: string
          selected_tag_ids: Json
          updated_at: string
          webhook_verify_token: string
          workspace_id: string
        }
        Insert: {
          access_token: string
          app_secret: string
          created_at?: string
          field_mapping?: Json
          id?: string
          is_active?: boolean
          meta_app_id: string
          name: string
          selected_pipeline_id: string
          selected_tag_ids?: Json
          updated_at?: string
          webhook_verify_token?: string
          workspace_id: string
        }
        Update: {
          access_token?: string
          app_secret?: string
          created_at?: string
          field_mapping?: Json
          id?: string
          is_active?: boolean
          meta_app_id?: string
          name?: string
          selected_pipeline_id?: string
          selected_tag_ids?: Json
          updated_at?: string
          webhook_verify_token?: string
          workspace_id?: string
        }
        Relationships: []
      }
      meta_lead_forms: {
        Row: {
          created_at: string
          fields_schema: Json
          form_name: string
          id: string
          integration_id: string
          is_active: boolean
          last_sync_at: string | null
          meta_form_id: string
          page_id: string
          page_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fields_schema?: Json
          form_name: string
          id?: string
          integration_id: string
          is_active?: boolean
          last_sync_at?: string | null
          meta_form_id: string
          page_id: string
          page_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fields_schema?: Json
          form_name?: string
          id?: string
          integration_id?: string
          is_active?: boolean
          last_sync_at?: string | null
          meta_form_id?: string
          page_id?: string
          page_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      n8n_webhooks: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          pipeline_id: string
          updated_at: string
          webhook_url: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          pipeline_id: string
          updated_at?: string
          webhook_url: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pipeline_id?: string
          updated_at?: string
          webhook_url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_webhooks_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "n8n_webhooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          pipeline_id: string
          position: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          pipeline_id: string
          position: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          default_assignee: string | null
          default_value: number | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          default_assignee?: string | null
          default_value?: number | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          default_assignee?: string | null
          default_value?: number | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_integrations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          platform: string
          selected_pipeline_id: string
          selected_tag_ids: Json
          updated_at: string
          webhook_url: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          platform: string
          selected_pipeline_id: string
          selected_tag_ids?: Json
          updated_at?: string
          webhook_url: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          platform?: string
          selected_pipeline_id?: string
          selected_tag_ids?: Json
          updated_at?: string
          webhook_url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_integrations_pipeline_id_fkey"
            columns: ["selected_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          default_price: number
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_price?: number
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_price?: number
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          super_admin_role:
            | Database["public"]["Enums"]["super_admin_role"]
            | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          super_admin_role?:
            | Database["public"]["Enums"]["super_admin_role"]
            | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          super_admin_role?:
            | Database["public"]["Enums"]["super_admin_role"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduler_logs: {
        Row: {
          campaigns_failed: number | null
          campaigns_found: number | null
          campaigns_processed: number | null
          campaigns_successful: number | null
          created_at: string | null
          details: Json | null
          error_message: string | null
          execution_duration_ms: number | null
          execution_time: string | null
          id: string
        }
        Insert: {
          campaigns_failed?: number | null
          campaigns_found?: number | null
          campaigns_processed?: number | null
          campaigns_successful?: number | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          execution_duration_ms?: number | null
          execution_time?: string | null
          id?: string
        }
        Update: {
          campaigns_failed?: number | null
          campaigns_found?: number | null
          campaigns_processed?: number | null
          campaigns_successful?: number | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          execution_duration_ms?: number | null
          execution_time?: string | null
          id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_dashboard_settings: {
        Row: {
          created_at: string | null
          id: string
          revenue_goal: number | null
          show_funnel: boolean | null
          show_leaderboard: boolean | null
          show_utm_chart: boolean | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          revenue_goal?: number | null
          show_funnel?: boolean | null
          show_leaderboard?: boolean | null
          show_utm_chart?: boolean | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          revenue_goal?: number | null
          show_funnel?: boolean | null
          show_leaderboard?: boolean | null
          show_utm_chart?: boolean | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_dashboard_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          created_at: string | null
          id: string
          lead_sound_enabled: boolean | null
          lead_sound_type: string | null
          updated_at: string | null
          user_id: string
          whatsapp_sound_enabled: boolean | null
          whatsapp_sound_type: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_sound_enabled?: boolean | null
          lead_sound_type?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_sound_enabled?: boolean | null
          whatsapp_sound_type?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_sound_enabled?: boolean | null
          lead_sound_type?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_sound_enabled?: boolean | null
          whatsapp_sound_type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_whatsapp_instances: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_whatsapp_instances_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          pipeline_id: string | null
          secret: string | null
          stage_id: string | null
          updated_at: string | null
          url: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pipeline_id?: string | null
          secret?: string | null
          stage_id?: string | null
          updated_at?: string | null
          url: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pipeline_id?: string | null
          secret?: string | null
          stage_id?: string | null
          updated_at?: string | null
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          contact_name: string | null
          created_at: string
          id: string
          instance_id: string | null
          is_read: boolean | null
          last_message_at: string | null
          lead_id: string | null
          message_count: number | null
          phone_number: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          is_read?: boolean | null
          last_message_at?: string | null
          lead_id?: string | null
          message_count?: number | null
          phone_number: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          is_read?: boolean | null
          last_message_at?: string | null
          lead_id?: string | null
          message_count?: number | null
          phone_number?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_evolution_configs: {
        Row: {
          api_url: string
          created_at: string | null
          global_api_key: string
          id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          api_url?: string
          created_at?: string | null
          global_api_key: string
          id?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          api_url?: string
          created_at?: string | null
          global_api_key?: string
          id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_evolution_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          instance_key: string
          instance_name: string
          last_seen: string | null
          phone_number: string | null
          qr_code: string | null
          status: string
          updated_at: string
          webhook_url: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          instance_key: string
          instance_name: string
          last_seen?: string | null
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          instance_key?: string
          instance_name?: string
          last_seen?: string | null
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          attachment_name: string | null
          conversation_id: string | null
          created_at: string
          encrypted_media_url: string | null
          id: string
          is_from_lead: boolean
          media_type: string | null
          media_url: string | null
          message_id: string | null
          message_text: string
          message_type: string
          permanent_audio_url: string | null
          sent_by: string | null
          status: string | null
          timestamp: string | null
          whatsapp_media_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          conversation_id?: string | null
          created_at?: string
          encrypted_media_url?: string | null
          id?: string
          is_from_lead?: boolean
          media_type?: string | null
          media_url?: string | null
          message_id?: string | null
          message_text: string
          message_type?: string
          permanent_audio_url?: string | null
          sent_by?: string | null
          status?: string | null
          timestamp?: string | null
          whatsapp_media_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          conversation_id?: string | null
          created_at?: string
          encrypted_media_url?: string | null
          id?: string
          is_from_lead?: boolean
          media_type?: string | null
          media_url?: string | null
          message_id?: string | null
          message_text?: string
          message_type?: string
          permanent_audio_url?: string | null
          sent_by?: string | null
          status?: string | null
          timestamp?: string | null
          whatsapp_media_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_official_configs: {
        Row: {
          access_token: string | null
          app_secret: string | null
          business_account_id: string | null
          created_at: string
          id: string
          is_active: boolean
          phone_number_id: string | null
          updated_at: string
          webhook_verify_token: string | null
          workspace_id: string
        }
        Insert: {
          access_token?: string | null
          app_secret?: string | null
          business_account_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number_id?: string | null
          updated_at?: string
          webhook_verify_token?: string | null
          workspace_id: string
        }
        Update: {
          access_token?: string | null
          app_secret?: string | null
          business_account_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number_id?: string | null
          updated_at?: string
          webhook_verify_token?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_official_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sync_status: {
        Row: {
          created_at: string | null
          errors: Json | null
          id: string
          instance_name: string
          last_sync_at: string
          processed_conversations: number | null
          sync_options: Json | null
          total_conversations: number | null
          total_messages: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          errors?: Json | null
          id?: string
          instance_name: string
          last_sync_at?: string
          processed_conversations?: number | null
          sync_options?: Json | null
          total_conversations?: number | null
          total_messages?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          errors?: Json | null
          id?: string
          instance_name?: string
          last_sync_at?: string
          processed_conversations?: number | null
          sync_options?: Json | null
          total_conversations?: number | null
          total_messages?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sync_status_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_messages: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          from_me: boolean
          id: string
          message_type: string
          push_name: string | null
          raw: Json
          text: string | null
          thread_id: string
          timestamp: number
        }
        Insert: {
          created_at?: string | null
          custom_fields?: Json | null
          from_me?: boolean
          id?: string
          message_type: string
          push_name?: string | null
          raw: Json
          text?: string | null
          thread_id: string
          timestamp: number
        }
        Update: {
          created_at?: string | null
          custom_fields?: Json | null
          from_me?: boolean
          id?: string
          message_type?: string
          push_name?: string | null
          raw?: Json
          text?: string | null
          thread_id?: string
          timestamp?: number
        }
        Relationships: []
      }
      workspace_limits: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          max_jobs: number | null
          max_leads: number | null
          max_tasks: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_jobs?: number | null
          max_leads?: number | null
          max_tasks?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_jobs?: number | null
          max_leads?: number | null
          max_tasks?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_limits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          ai_insights_pipeline_ids: string[] | null
          created_at: string
          default_pipeline_id: string | null
          id: string
          n8n_webhook_url: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_insights_pipeline_ids?: string[] | null
          created_at?: string
          default_pipeline_id?: string | null
          id?: string
          n8n_webhook_url?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_insights_pipeline_ids?: string[] | null
          created_at?: string
          default_pipeline_id?: string | null
          id?: string
          n8n_webhook_url?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_default_pipeline_id_fkey"
            columns: ["default_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_member_to_workspace: {
        Args: { p_role?: string; p_user_email: string; p_workspace_id: string }
        Returns: Json
      }
      create_workspace_for_user: {
        Args: { p_user_id: string; p_workspace_name: string }
        Returns: string
      }
      debug_auth_context: { Args: never; Returns: Json }
      get_appointment_stats: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_pending_automation_items: {
        Args: { item_limit?: number }
        Returns: {
          created_at: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          processed_at: string | null
          status: string | null
          trigger_data: Json | null
          trigger_type: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "automation_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_scheduler_stats: { Args: never; Returns: Json }
      get_workspace_stats: { Args: { p_workspace_id: string }; Returns: Json }
      get_workspace_usage: { Args: { p_workspace_id: string }; Returns: Json }
      is_super_admin: { Args: { user_id: string }; Returns: boolean }
      normalize_phone_number: { Args: { phone: string }; Returns: string }
      reset_workspace: { Args: { p_workspace_id: string }; Returns: undefined }
      setup_default_workspace_data: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      sync_lead_pipeline_relations: { Args: never; Returns: undefined }
      sync_workspace_lead_relations: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      user_has_workspace_access: {
        Args: { workspace_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      appointment_status:
        | "aguardando"
        | "compareceu"
        | "nao_qualificado"
        | "reagendado"
        | "falhou"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "closed_won"
        | "closed_lost"
      super_admin_role: "super_admin" | "support"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      user_role: "user" | "admin" | "manager"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "aguardando",
        "compareceu",
        "nao_qualificado",
        "reagendado",
        "falhou",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      super_admin_role: ["super_admin", "support"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      user_role: ["user", "admin", "manager"],
    },
  },
} as const
