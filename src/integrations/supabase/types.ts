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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asset_metadata: {
        Row: {
          asset_id: string
          decimals: number | null
          name: string | null
          symbol: string
          updated_at: string
          venue: string
        }
        Insert: {
          asset_id: string
          decimals?: number | null
          name?: string | null
          symbol: string
          updated_at?: string
          venue?: string
        }
        Update: {
          asset_id?: string
          decimals?: number | null
          name?: string | null
          symbol?: string
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      behavior_flags: {
        Row: {
          confidence: number
          created_at: string
          details: Json | null
          flag_type: string
          id: string
          position_id: string
          ts: string
          wallet_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          details?: Json | null
          flag_type: string
          id?: string
          position_id: string
          ts: string
          wallet_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          details?: Json | null
          flag_type?: string
          id?: string
          position_id?: string
          ts?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_flags_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "materialized_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_flags_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      clearinghouse_snapshots: {
        Row: {
          account_value: number
          created_at: string
          cross_margin_summary: Json | null
          day: string
          id: string
          total_margin_used: number
          total_notional_position: number
          ts: string
          wallet_id: string
          withdrawable: number
        }
        Insert: {
          account_value?: number
          created_at?: string
          cross_margin_summary?: Json | null
          day: string
          id?: string
          total_margin_used?: number
          total_notional_position?: number
          ts?: string
          wallet_id: string
          withdrawable?: number
        }
        Update: {
          account_value?: number
          created_at?: string
          cross_margin_summary?: Json | null
          day?: string
          id?: string
          total_margin_used?: number
          total_notional_position?: number
          ts?: string
          wallet_id?: string
          withdrawable?: number
        }
        Relationships: [
          {
            foreignKeyName: "clearinghouse_snapshots_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      closed_trades: {
        Row: {
          avg_entry_price: number
          avg_exit_price: number
          created_at: string
          effective_leverage: number | null
          entry_time: string
          exit_time: string
          fees: number
          funding: number
          id: string
          is_win: boolean
          margin_used: number | null
          market: string
          net_pnl: number
          notional_value: number
          realized_pnl: number
          side: string
          size: number
          trade_duration_hours: number | null
          updated_at: string
          wallet_id: string
        }
        Insert: {
          avg_entry_price: number
          avg_exit_price: number
          created_at?: string
          effective_leverage?: number | null
          entry_time: string
          exit_time: string
          fees?: number
          funding?: number
          id?: string
          is_win?: boolean
          margin_used?: number | null
          market: string
          net_pnl?: number
          notional_value: number
          realized_pnl?: number
          side: string
          size: number
          trade_duration_hours?: number | null
          updated_at?: string
          wallet_id: string
        }
        Update: {
          avg_entry_price?: number
          avg_exit_price?: number
          created_at?: string
          effective_leverage?: number | null
          entry_time?: string
          exit_time?: string
          fees?: number
          funding?: number
          id?: string
          is_win?: boolean
          margin_used?: number | null
          market?: string
          net_pnl?: number
          notional_value?: number
          realized_pnl?: number
          side?: string
          size?: number
          trade_duration_hours?: number | null
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closed_trades_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_pnl: {
        Row: {
          closed_pnl: number
          cumulative_pnl: number
          day: string
          drawdown: number
          fees: number
          funding: number
          perps_pnl: number
          running_peak: number
          spot_pnl: number
          total_pnl: number
          trades_count: number
          unrealized_change: number
          updated_at: string
          volume: number
          wallet_id: string
        }
        Insert: {
          closed_pnl?: number
          cumulative_pnl?: number
          day: string
          drawdown?: number
          fees?: number
          funding?: number
          perps_pnl?: number
          running_peak?: number
          spot_pnl?: number
          total_pnl?: number
          trades_count?: number
          unrealized_change?: number
          updated_at?: string
          volume?: number
          wallet_id: string
        }
        Update: {
          closed_pnl?: number
          cumulative_pnl?: number
          day?: string
          drawdown?: number
          fees?: number
          funding?: number
          perps_pnl?: number
          running_peak?: number
          spot_pnl?: number
          total_pnl?: number
          trades_count?: number
          unrealized_change?: number
          updated_at?: string
          volume?: number
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_pnl_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_rollups: {
        Row: {
          avg_leverage: number
          behavior_flags_count: number
          day: string
          fees: number
          funding_pnl: number
          max_leverage: number
          min_liq_distance_pct: number | null
          net_pnl: number
          positions_closed: number
          positions_opened: number
          realized_pnl: number
          risk_events_count: number
          total_mae_usd: number
          total_mfe_usd: number
          underwater_minutes: number
          unrealized_change: number
          updated_at: string
          volume: number
          wallet_id: string
        }
        Insert: {
          avg_leverage?: number
          behavior_flags_count?: number
          day: string
          fees?: number
          funding_pnl?: number
          max_leverage?: number
          min_liq_distance_pct?: number | null
          net_pnl?: number
          positions_closed?: number
          positions_opened?: number
          realized_pnl?: number
          risk_events_count?: number
          total_mae_usd?: number
          total_mfe_usd?: number
          underwater_minutes?: number
          unrealized_change?: number
          updated_at?: string
          volume?: number
          wallet_id: string
        }
        Update: {
          avg_leverage?: number
          behavior_flags_count?: number
          day?: string
          fees?: number
          funding_pnl?: number
          max_leverage?: number
          min_liq_distance_pct?: number | null
          net_pnl?: number
          positions_closed?: number
          positions_opened?: number
          realized_pnl?: number
          risk_events_count?: number
          total_mae_usd?: number
          total_mfe_usd?: number
          underwater_minutes?: number
          unrealized_change?: number
          updated_at?: string
          volume?: number
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_rollups_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      drawdown_events: {
        Row: {
          created_at: string
          drawdown_depth: number
          drawdown_pct: number
          id: string
          is_recovered: boolean
          peak_date: string
          peak_equity: number
          recovery_date: string | null
          recovery_days: number | null
          trough_date: string
          trough_equity: number
          updated_at: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          drawdown_depth: number
          drawdown_pct: number
          id?: string
          is_recovered?: boolean
          peak_date: string
          peak_equity: number
          recovery_date?: string | null
          recovery_days?: number | null
          trough_date: string
          trough_equity: number
          updated_at?: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          drawdown_depth?: number
          drawdown_pct?: number
          id?: string
          is_recovered?: boolean
          peak_date?: string
          peak_equity?: number
          recovery_date?: string | null
          recovery_days?: number | null
          trough_date?: string
          trough_equity?: number
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawdown_events_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_events: {
        Row: {
          asset: string | null
          chain: string | null
          created_at: string
          day: string
          dedupe_key: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          exec_price: number | null
          fee_usd: number | null
          funding_usd: number | null
          id: string
          market: string | null
          meta: Json | null
          price_usd: number | null
          qty: number | null
          realized_pnl_usd: number | null
          side: Database["public"]["Enums"]["side_type"] | null
          size: number | null
          ts: string
          tx_hash: string | null
          usd_value: number | null
          venue: Database["public"]["Enums"]["venue_type"]
          volume_usd: number | null
          wallet_id: string
        }
        Insert: {
          asset?: string | null
          chain?: string | null
          created_at?: string
          day: string
          dedupe_key?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          exec_price?: number | null
          fee_usd?: number | null
          funding_usd?: number | null
          id?: string
          market?: string | null
          meta?: Json | null
          price_usd?: number | null
          qty?: number | null
          realized_pnl_usd?: number | null
          side?: Database["public"]["Enums"]["side_type"] | null
          size?: number | null
          ts: string
          tx_hash?: string | null
          usd_value?: number | null
          venue: Database["public"]["Enums"]["venue_type"]
          volume_usd?: number | null
          wallet_id: string
        }
        Update: {
          asset?: string | null
          chain?: string | null
          created_at?: string
          day?: string
          dedupe_key?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          exec_price?: number | null
          fee_usd?: number | null
          funding_usd?: number | null
          id?: string
          market?: string | null
          meta?: Json | null
          price_usd?: number | null
          qty?: number | null
          realized_pnl_usd?: number | null
          side?: Database["public"]["Enums"]["side_type"] | null
          size?: number | null
          ts?: string
          tx_hash?: string | null
          usd_value?: number | null
          venue?: Database["public"]["Enums"]["venue_type"]
          volume_usd?: number | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "economic_events_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_curve: {
        Row: {
          cumulative_fees: number
          cumulative_funding_pnl: number
          cumulative_net_pnl: number
          cumulative_trading_pnl: number
          day: string
          drawdown: number
          drawdown_pct: number
          ending_equity: number
          fees: number
          funding_pnl: number
          net_change: number
          peak_equity: number
          starting_equity: number
          trading_pnl: number
          updated_at: string
          wallet_id: string
        }
        Insert: {
          cumulative_fees?: number
          cumulative_funding_pnl?: number
          cumulative_net_pnl?: number
          cumulative_trading_pnl?: number
          day: string
          drawdown?: number
          drawdown_pct?: number
          ending_equity?: number
          fees?: number
          funding_pnl?: number
          net_change?: number
          peak_equity?: number
          starting_equity?: number
          trading_pnl?: number
          updated_at?: string
          wallet_id: string
        }
        Update: {
          cumulative_fees?: number
          cumulative_funding_pnl?: number
          cumulative_net_pnl?: number
          cumulative_trading_pnl?: number
          day?: string
          drawdown?: number
          drawdown_pct?: number
          ending_equity?: number
          fees?: number
          funding_pnl?: number
          net_change?: number
          peak_equity?: number
          starting_equity?: number
          trading_pnl?: number
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_curve_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_cycles: {
        Row: {
          created_at: string
          funding_pnl: number
          funding_rate: number
          funding_time: string
          id: string
          mark_price: number | null
          market: string
          position_direction: string | null
          position_size: number
          wallet_id: string
        }
        Insert: {
          created_at?: string
          funding_pnl: number
          funding_rate: number
          funding_time: string
          id?: string
          mark_price?: number | null
          market: string
          position_direction?: string | null
          position_size: number
          wallet_id: string
        }
        Update: {
          created_at?: string
          funding_pnl?: number
          funding_rate?: number
          funding_time?: string
          id?: string
          mark_price?: number | null
          market?: string
          position_direction?: string | null
          position_size?: number
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_cycles_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      mark_snapshots: {
        Row: {
          day: string
          mark_price: number
          market: string
          ts: string
        }
        Insert: {
          day: string
          mark_price: number
          market: string
          ts: string
        }
        Update: {
          day?: string
          mark_price?: number
          market?: string
          ts?: string
        }
        Relationships: []
      }
      market_rollups: {
        Row: {
          avg_leverage: number
          avg_mae_pct: number
          avg_mfe_pct: number
          avg_pnl: number
          best_trade: number
          losses: number
          market: string
          period: string
          period_start: string
          positions_count: number
          total_pnl: number
          total_volume: number
          updated_at: string
          wallet_id: string
          win_rate: number
          wins: number
          worst_trade: number
        }
        Insert: {
          avg_leverage?: number
          avg_mae_pct?: number
          avg_mfe_pct?: number
          avg_pnl?: number
          best_trade?: number
          losses?: number
          market: string
          period: string
          period_start: string
          positions_count?: number
          total_pnl?: number
          total_volume?: number
          updated_at?: string
          wallet_id: string
          win_rate?: number
          wins?: number
          worst_trade?: number
        }
        Update: {
          avg_leverage?: number
          avg_mae_pct?: number
          avg_mfe_pct?: number
          avg_pnl?: number
          best_trade?: number
          losses?: number
          market?: string
          period?: string
          period_start?: string
          positions_count?: number
          total_pnl?: number
          total_volume?: number
          updated_at?: string
          wallet_id?: string
          win_rate?: number
          wins?: number
          worst_trade?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_rollups_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      market_stats: {
        Row: {
          avg_leverage: number
          avg_loss: number
          avg_trade_size: number
          avg_win: number
          losses: number
          market: string
          profit_factor: number | null
          total_fees: number
          total_funding: number
          total_pnl: number
          total_trades: number
          total_volume: number
          updated_at: string
          wallet_id: string
          win_rate: number
          wins: number
        }
        Insert: {
          avg_leverage?: number
          avg_loss?: number
          avg_trade_size?: number
          avg_win?: number
          losses?: number
          market: string
          profit_factor?: number | null
          total_fees?: number
          total_funding?: number
          total_pnl?: number
          total_trades?: number
          total_volume?: number
          updated_at?: string
          wallet_id: string
          win_rate?: number
          wins?: number
        }
        Update: {
          avg_leverage?: number
          avg_loss?: number
          avg_trade_size?: number
          avg_win?: number
          losses?: number
          market?: string
          profit_factor?: number | null
          total_fees?: number
          total_funding?: number
          total_pnl?: number
          total_trades?: number
          total_volume?: number
          updated_at?: string
          wallet_id?: string
          win_rate?: number
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_stats_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      materialized_positions: {
        Row: {
          avg_entry: number
          avg_exit: number | null
          avg_leverage: number
          close_time: string | null
          created_at: string
          current_size: number
          direction: string
          duration_hours: number | null
          fees: number
          fills_count: number
          funding_pnl: number
          id: string
          is_open: boolean
          liquidation_price_at_entry: number | null
          mae_pct: number
          mae_usd: number
          margin_used: number
          market: string
          max_leverage: number
          max_size: number
          mfe_pct: number
          mfe_usd: number
          min_liquidation_distance_pct: number | null
          net_pnl: number
          open_time: string
          realized_pnl: number
          unrealized_pnl: number
          updated_at: string
          wallet_id: string
        }
        Insert: {
          avg_entry?: number
          avg_exit?: number | null
          avg_leverage?: number
          close_time?: string | null
          created_at?: string
          current_size?: number
          direction: string
          duration_hours?: number | null
          fees?: number
          fills_count?: number
          funding_pnl?: number
          id?: string
          is_open?: boolean
          liquidation_price_at_entry?: number | null
          mae_pct?: number
          mae_usd?: number
          margin_used?: number
          market: string
          max_leverage?: number
          max_size?: number
          mfe_pct?: number
          mfe_usd?: number
          min_liquidation_distance_pct?: number | null
          net_pnl?: number
          open_time: string
          realized_pnl?: number
          unrealized_pnl?: number
          updated_at?: string
          wallet_id: string
        }
        Update: {
          avg_entry?: number
          avg_exit?: number | null
          avg_leverage?: number
          close_time?: string | null
          created_at?: string
          current_size?: number
          direction?: string
          duration_hours?: number | null
          fees?: number
          fills_count?: number
          funding_pnl?: number
          id?: string
          is_open?: boolean
          liquidation_price_at_entry?: number | null
          mae_pct?: number
          mae_usd?: number
          margin_used?: number
          market?: string
          max_leverage?: number
          max_size?: number
          mfe_pct?: number
          mfe_usd?: number
          min_liquidation_distance_pct?: number | null
          net_pnl?: number
          open_time?: string
          realized_pnl?: number
          unrealized_pnl?: number
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materialized_positions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_pnl: {
        Row: {
          closed_pnl: number
          funding: number
          month: string
          profitable_days: number
          total_pnl: number
          trading_days: number
          updated_at: string
          volume: number
          wallet_id: string
        }
        Insert: {
          closed_pnl?: number
          funding?: number
          month: string
          profitable_days?: number
          total_pnl?: number
          trading_days?: number
          updated_at?: string
          volume?: number
          wallet_id: string
        }
        Update: {
          closed_pnl?: number
          funding?: number
          month?: string
          profitable_days?: number
          total_pnl?: number
          trading_days?: number
          updated_at?: string
          volume?: number
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_pnl_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          amount: number
          asset: string
          chain: string
          created_at: string
          id: string
          purpose: string
          tx_hash: string
          used_at: string
          wallet: string
        }
        Insert: {
          amount: number
          asset?: string
          chain?: string
          created_at?: string
          id?: string
          purpose: string
          tx_hash: string
          used_at?: string
          wallet: string
        }
        Update: {
          amount?: number
          asset?: string
          chain?: string
          created_at?: string
          id?: string
          purpose?: string
          tx_hash?: string
          used_at?: string
          wallet?: string
        }
        Relationships: []
      }
      position_snapshots: {
        Row: {
          account_value: number | null
          created_at: string
          distance_to_liq_pct: number | null
          entry_price: number
          id: string
          leverage: number
          liquidation_price: number | null
          margin_used: number
          mark_price: number
          position_id: string
          size: number
          snapshot_type: string
          ts: string
          unrealized_pnl: number
          wallet_id: string
        }
        Insert: {
          account_value?: number | null
          created_at?: string
          distance_to_liq_pct?: number | null
          entry_price: number
          id?: string
          leverage: number
          liquidation_price?: number | null
          margin_used: number
          mark_price: number
          position_id: string
          size: number
          snapshot_type: string
          ts?: string
          unrealized_pnl?: number
          wallet_id: string
        }
        Update: {
          account_value?: number | null
          created_at?: string
          distance_to_liq_pct?: number | null
          entry_price?: number
          id?: string
          leverage?: number
          liquidation_price?: number | null
          margin_used?: number
          mark_price?: number
          position_id?: string
          size?: number
          snapshot_type?: string
          ts?: string
          unrealized_pnl?: number
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_snapshots_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "materialized_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_snapshots_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      positions_perps: {
        Row: {
          avg_entry: number
          effective_leverage: number | null
          liquidation_px: number | null
          margin_used: number | null
          market: string
          max_leverage: number | null
          position_size: number
          position_value: number | null
          return_on_equity: number | null
          unrealized_pnl: number | null
          updated_at: string
          wallet_id: string
        }
        Insert: {
          avg_entry?: number
          effective_leverage?: number | null
          liquidation_px?: number | null
          margin_used?: number | null
          market: string
          max_leverage?: number | null
          position_size?: number
          position_value?: number | null
          return_on_equity?: number | null
          unrealized_pnl?: number | null
          updated_at?: string
          wallet_id: string
        }
        Update: {
          avg_entry?: number
          effective_leverage?: number | null
          liquidation_px?: number | null
          margin_used?: number | null
          market?: string
          max_leverage?: number | null
          position_size?: number
          position_value?: number | null
          return_on_equity?: number | null
          unrealized_pnl?: number | null
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_perps_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      positions_spot: {
        Row: {
          asset: string
          avg_cost: number
          balance: number
          updated_at: string
          wallet_id: string
        }
        Insert: {
          asset: string
          avg_cost?: number
          balance?: number
          updated_at?: string
          wallet_id: string
        }
        Update: {
          asset?: string
          avg_cost?: number
          balance?: number
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_spot_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      price_snapshots: {
        Row: {
          asset: string
          day: string
          price_usd: number
          ts: string
        }
        Insert: {
          asset: string
          day: string
          price_usd: number
          ts: string
        }
        Update: {
          asset?: string
          day?: string
          price_usd?: number
          ts?: string
        }
        Relationships: []
      }
      raw_events: {
        Row: {
          chain: string | null
          created_at: string
          id: string
          payload: Json
          source_type: Database["public"]["Enums"]["source_type"]
          ts: string
          unique_key: string
          wallet_id: string
        }
        Insert: {
          chain?: string | null
          created_at?: string
          id?: string
          payload: Json
          source_type: Database["public"]["Enums"]["source_type"]
          ts: string
          unique_key: string
          wallet_id: string
        }
        Update: {
          chain?: string | null
          created_at?: string
          id?: string
          payload?: Json
          source_type?: Database["public"]["Enums"]["source_type"]
          ts?: string
          unique_key?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_events_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      recompute_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          days_processed: number | null
          error_message: string | null
          id: string
          payment_tx_hash: string | null
          started_at: string
          status: string
          wallet_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          days_processed?: number | null
          error_message?: string | null
          id?: string
          payment_tx_hash?: string | null
          started_at?: string
          status?: string
          wallet_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          days_processed?: number | null
          error_message?: string | null
          id?: string
          payment_tx_hash?: string | null
          started_at?: string
          status?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recompute_runs_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      resolution_cache: {
        Row: {
          domain: string
          expires_at: string | null
          hit_count: number | null
          id: string
          input_type: string
          metadata: Json | null
          resolved_at: string
          resolved_entity_type: string | null
        }
        Insert: {
          domain: string
          expires_at?: string | null
          hit_count?: number | null
          id: string
          input_type: string
          metadata?: Json | null
          resolved_at?: string
          resolved_entity_type?: string | null
        }
        Update: {
          domain?: string
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          input_type?: string
          metadata?: Json | null
          resolved_at?: string
          resolved_entity_type?: string | null
        }
        Relationships: []
      }
      risk_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          market: string | null
          position_id: string | null
          severity: string
          threshold_triggered: number | null
          ts: string
          value_after: number | null
          value_before: number | null
          wallet_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          market?: string | null
          position_id?: string | null
          severity: string
          threshold_triggered?: number | null
          ts: string
          value_after?: number | null
          value_before?: number | null
          wallet_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          market?: string | null
          position_id?: string | null
          severity?: string
          threshold_triggered?: number | null
          ts?: string
          value_after?: number | null
          value_before?: number | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_events_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "materialized_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_events_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          chain: string | null
          created_at: string
          cursor: string | null
          id: string
          last_synced_at: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          wallet_id: string
        }
        Insert: {
          chain?: string | null
          created_at?: string
          cursor?: string | null
          id?: string
          last_synced_at?: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          wallet_id: string
        }
        Update: {
          chain?: string | null
          created_at?: string
          cursor?: string | null
          id?: string
          last_synced_at?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          days_recomputed: number | null
          end_time: number | null
          error_message: string | null
          events_ingested: number | null
          fills_ingested: number | null
          funding_ingested: number | null
          id: string
          payment_tx_hash: string | null
          start_time: number | null
          started_at: string
          status: string
          wallet_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          days_recomputed?: number | null
          end_time?: number | null
          error_message?: string | null
          events_ingested?: number | null
          fills_ingested?: number | null
          funding_ingested?: number | null
          id?: string
          payment_tx_hash?: string | null
          start_time?: number | null
          started_at?: string
          status?: string
          wallet_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          days_recomputed?: number | null
          end_time?: number | null
          error_message?: string | null
          events_ingested?: number | null
          fills_ingested?: number | null
          funding_ingested?: number | null
          id?: string
          payment_tx_hash?: string | null
          start_time?: number | null
          started_at?: string
          status?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      underwater_periods: {
        Row: {
          created_at: string
          duration_minutes: number | null
          end_time: string | null
          id: string
          is_active: boolean
          max_drawdown_pct: number
          max_drawdown_usd: number
          position_id: string | null
          start_time: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          max_drawdown_pct?: number
          max_drawdown_usd?: number
          position_id?: string | null
          start_time: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          max_drawdown_pct?: number
          max_drawdown_usd?: number
          position_id?: string | null
          start_time?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "underwater_periods_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "materialized_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "underwater_periods_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          address: string
          created_at: string
          id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_resolution_cache: { Args: never; Returns: number }
    }
    Enums: {
      event_type:
        | "SPOT_BUY"
        | "SPOT_SELL"
        | "SPOT_TRANSFER_IN"
        | "SPOT_TRANSFER_OUT"
        | "SPOT_FEE"
        | "PERP_FILL"
        | "PERP_FUNDING"
        | "PERP_FEE"
        | "PRICE_SNAPSHOT"
        | "MARK_SNAPSHOT"
      side_type: "long" | "short"
      source_type: "goldrush" | "hypercore"
      venue_type: "hypercore" | "onchain" | "external"
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
      event_type: [
        "SPOT_BUY",
        "SPOT_SELL",
        "SPOT_TRANSFER_IN",
        "SPOT_TRANSFER_OUT",
        "SPOT_FEE",
        "PERP_FILL",
        "PERP_FUNDING",
        "PERP_FEE",
        "PRICE_SNAPSHOT",
        "MARK_SNAPSHOT",
      ],
      side_type: ["long", "short"],
      source_type: ["goldrush", "hypercore"],
      venue_type: ["hypercore", "onchain", "external"],
    },
  },
} as const
