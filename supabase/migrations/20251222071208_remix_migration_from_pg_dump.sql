CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type AS ENUM (
    'SPOT_BUY',
    'SPOT_SELL',
    'SPOT_TRANSFER_IN',
    'SPOT_TRANSFER_OUT',
    'SPOT_FEE',
    'PERP_FILL',
    'PERP_FUNDING',
    'PERP_FEE',
    'PRICE_SNAPSHOT',
    'MARK_SNAPSHOT'
);


--
-- Name: side_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.side_type AS ENUM (
    'long',
    'short'
);


--
-- Name: source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.source_type AS ENUM (
    'goldrush',
    'hypercore'
);


--
-- Name: venue_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.venue_type AS ENUM (
    'hypercore',
    'onchain',
    'external'
);


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: asset_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_metadata (
    asset_id text NOT NULL,
    symbol text NOT NULL,
    name text,
    decimals integer DEFAULT 8,
    venue text DEFAULT 'hypercore'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: behavior_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.behavior_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    position_id uuid NOT NULL,
    flag_type text NOT NULL,
    ts timestamp with time zone NOT NULL,
    confidence numeric DEFAULT 1 NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT behavior_flags_flag_type_check CHECK ((flag_type = ANY (ARRAY['leverage_increase_after_loss'::text, 'flip_within_time_window'::text, 'exit_near_liquidation'::text, 'repeated_entry_range'::text, 'revenge_trade'::text, 'winner_exit_early'::text, 'loser_hold_long'::text, 'size_increase_underwater'::text, 'stop_loss_respected'::text, 'profit_target_hit'::text])))
);


--
-- Name: clearinghouse_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clearinghouse_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    day date NOT NULL,
    account_value numeric DEFAULT 0 NOT NULL,
    total_margin_used numeric DEFAULT 0 NOT NULL,
    total_notional_position numeric DEFAULT 0 NOT NULL,
    withdrawable numeric DEFAULT 0 NOT NULL,
    cross_margin_summary jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: closed_trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.closed_trades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    market text NOT NULL,
    side text NOT NULL,
    entry_time timestamp with time zone NOT NULL,
    exit_time timestamp with time zone NOT NULL,
    avg_entry_price numeric NOT NULL,
    avg_exit_price numeric NOT NULL,
    size numeric NOT NULL,
    notional_value numeric NOT NULL,
    margin_used numeric,
    effective_leverage numeric,
    realized_pnl numeric DEFAULT 0 NOT NULL,
    fees numeric DEFAULT 0 NOT NULL,
    funding numeric DEFAULT 0 NOT NULL,
    net_pnl numeric DEFAULT 0 NOT NULL,
    is_win boolean DEFAULT false NOT NULL,
    trade_duration_hours numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT closed_trades_side_check CHECK ((side = ANY (ARRAY['long'::text, 'short'::text])))
);


--
-- Name: daily_pnl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_pnl (
    wallet_id uuid NOT NULL,
    day date NOT NULL,
    total_pnl numeric DEFAULT 0 NOT NULL,
    closed_pnl numeric DEFAULT 0 NOT NULL,
    unrealized_change numeric DEFAULT 0 NOT NULL,
    funding numeric DEFAULT 0 NOT NULL,
    fees numeric DEFAULT 0 NOT NULL,
    perps_pnl numeric DEFAULT 0 NOT NULL,
    spot_pnl numeric DEFAULT 0 NOT NULL,
    trades_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    volume numeric DEFAULT 0 NOT NULL,
    cumulative_pnl numeric DEFAULT 0 NOT NULL,
    running_peak numeric DEFAULT 0 NOT NULL,
    drawdown numeric DEFAULT 0 NOT NULL
);


--
-- Name: daily_rollups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_rollups (
    wallet_id uuid NOT NULL,
    day date NOT NULL,
    positions_opened integer DEFAULT 0 NOT NULL,
    positions_closed integer DEFAULT 0 NOT NULL,
    realized_pnl numeric DEFAULT 0 NOT NULL,
    unrealized_change numeric DEFAULT 0 NOT NULL,
    funding_pnl numeric DEFAULT 0 NOT NULL,
    fees numeric DEFAULT 0 NOT NULL,
    net_pnl numeric DEFAULT 0 NOT NULL,
    volume numeric DEFAULT 0 NOT NULL,
    max_leverage numeric DEFAULT 0 NOT NULL,
    avg_leverage numeric DEFAULT 0 NOT NULL,
    min_liq_distance_pct numeric,
    risk_events_count integer DEFAULT 0 NOT NULL,
    behavior_flags_count integer DEFAULT 0 NOT NULL,
    underwater_minutes integer DEFAULT 0 NOT NULL,
    total_mae_usd numeric DEFAULT 0 NOT NULL,
    total_mfe_usd numeric DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: drawdown_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drawdown_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    peak_date date NOT NULL,
    trough_date date NOT NULL,
    recovery_date date,
    peak_equity numeric NOT NULL,
    trough_equity numeric NOT NULL,
    drawdown_depth numeric NOT NULL,
    drawdown_pct numeric NOT NULL,
    recovery_days integer,
    is_recovered boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: economic_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.economic_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    ts timestamp with time zone NOT NULL,
    day date NOT NULL,
    event_type public.event_type NOT NULL,
    venue public.venue_type NOT NULL,
    chain text,
    asset text,
    qty numeric,
    usd_value numeric,
    price_usd numeric,
    market text,
    side public.side_type,
    size numeric,
    exec_price numeric,
    realized_pnl_usd numeric,
    funding_usd numeric,
    fee_usd numeric DEFAULT 0,
    tx_hash text,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dedupe_key text GENERATED ALWAYS AS ((meta ->> 'dedupe'::text)) STORED,
    volume_usd numeric GENERATED ALWAYS AS (
CASE
    WHEN (event_type = 'PERP_FILL'::public.event_type) THEN (abs(COALESCE(size, (0)::numeric)) * COALESCE(exec_price, (0)::numeric))
    ELSE (0)::numeric
END) STORED
);


--
-- Name: equity_curve; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equity_curve (
    wallet_id uuid NOT NULL,
    day date NOT NULL,
    starting_equity numeric DEFAULT 0 NOT NULL,
    ending_equity numeric DEFAULT 0 NOT NULL,
    trading_pnl numeric DEFAULT 0 NOT NULL,
    funding_pnl numeric DEFAULT 0 NOT NULL,
    fees numeric DEFAULT 0 NOT NULL,
    net_change numeric DEFAULT 0 NOT NULL,
    cumulative_trading_pnl numeric DEFAULT 0 NOT NULL,
    cumulative_funding_pnl numeric DEFAULT 0 NOT NULL,
    cumulative_fees numeric DEFAULT 0 NOT NULL,
    cumulative_net_pnl numeric DEFAULT 0 NOT NULL,
    peak_equity numeric DEFAULT 0 NOT NULL,
    drawdown numeric DEFAULT 0 NOT NULL,
    drawdown_pct numeric DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: funding_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funding_cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    market text NOT NULL,
    funding_time timestamp with time zone NOT NULL,
    position_size numeric NOT NULL,
    funding_rate numeric NOT NULL,
    funding_pnl numeric NOT NULL,
    mark_price numeric,
    position_direction text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT funding_cycles_position_direction_check CHECK ((position_direction = ANY (ARRAY['long'::text, 'short'::text])))
);


--
-- Name: mark_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mark_snapshots (
    market text NOT NULL,
    ts timestamp with time zone NOT NULL,
    day date NOT NULL,
    mark_price numeric NOT NULL
);


--
-- Name: market_rollups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_rollups (
    wallet_id uuid NOT NULL,
    market text NOT NULL,
    period text NOT NULL,
    period_start date NOT NULL,
    positions_count integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    win_rate numeric DEFAULT 0 NOT NULL,
    total_pnl numeric DEFAULT 0 NOT NULL,
    avg_pnl numeric DEFAULT 0 NOT NULL,
    best_trade numeric DEFAULT 0 NOT NULL,
    worst_trade numeric DEFAULT 0 NOT NULL,
    total_volume numeric DEFAULT 0 NOT NULL,
    avg_leverage numeric DEFAULT 0 NOT NULL,
    avg_mae_pct numeric DEFAULT 0 NOT NULL,
    avg_mfe_pct numeric DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT market_rollups_period_check CHECK ((period = ANY (ARRAY['day'::text, 'week'::text, 'month'::text, 'all'::text])))
);


--
-- Name: market_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_stats (
    wallet_id uuid NOT NULL,
    market text NOT NULL,
    total_trades integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    win_rate numeric DEFAULT 0 NOT NULL,
    total_pnl numeric DEFAULT 0 NOT NULL,
    total_volume numeric DEFAULT 0 NOT NULL,
    total_fees numeric DEFAULT 0 NOT NULL,
    total_funding numeric DEFAULT 0 NOT NULL,
    avg_trade_size numeric DEFAULT 0 NOT NULL,
    avg_leverage numeric DEFAULT 0 NOT NULL,
    avg_win numeric DEFAULT 0 NOT NULL,
    avg_loss numeric DEFAULT 0 NOT NULL,
    profit_factor numeric,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: materialized_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materialized_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    market text NOT NULL,
    direction text NOT NULL,
    open_time timestamp with time zone NOT NULL,
    close_time timestamp with time zone,
    is_open boolean DEFAULT true NOT NULL,
    avg_entry numeric DEFAULT 0 NOT NULL,
    avg_exit numeric,
    max_size numeric DEFAULT 0 NOT NULL,
    current_size numeric DEFAULT 0 NOT NULL,
    avg_leverage numeric DEFAULT 1 NOT NULL,
    max_leverage numeric DEFAULT 1 NOT NULL,
    margin_used numeric DEFAULT 0 NOT NULL,
    liquidation_price_at_entry numeric,
    min_liquidation_distance_pct numeric,
    realized_pnl numeric DEFAULT 0 NOT NULL,
    unrealized_pnl numeric DEFAULT 0 NOT NULL,
    funding_pnl numeric DEFAULT 0 NOT NULL,
    fees numeric DEFAULT 0 NOT NULL,
    net_pnl numeric DEFAULT 0 NOT NULL,
    mae_usd numeric DEFAULT 0 NOT NULL,
    mfe_usd numeric DEFAULT 0 NOT NULL,
    mae_pct numeric DEFAULT 0 NOT NULL,
    mfe_pct numeric DEFAULT 0 NOT NULL,
    fills_count integer DEFAULT 0 NOT NULL,
    duration_hours numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT materialized_positions_direction_check CHECK ((direction = ANY (ARRAY['long'::text, 'short'::text])))
);


--
-- Name: monthly_pnl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_pnl (
    wallet_id uuid NOT NULL,
    month date NOT NULL,
    total_pnl numeric DEFAULT 0 NOT NULL,
    closed_pnl numeric DEFAULT 0 NOT NULL,
    funding numeric DEFAULT 0 NOT NULL,
    profitable_days integer DEFAULT 0 NOT NULL,
    trading_days integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    volume numeric DEFAULT 0 NOT NULL
);


--
-- Name: payment_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tx_hash text NOT NULL,
    wallet text NOT NULL,
    amount numeric NOT NULL,
    asset text DEFAULT 'USDC'::text NOT NULL,
    chain text DEFAULT 'hyperevm'::text NOT NULL,
    purpose text NOT NULL,
    used_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_receipts_purpose_check CHECK ((purpose = ANY (ARRAY['wallet_sync'::text, 'pnl_recompute'::text])))
);


--
-- Name: position_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.position_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    position_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    snapshot_type text NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    size numeric NOT NULL,
    entry_price numeric NOT NULL,
    mark_price numeric NOT NULL,
    liquidation_price numeric,
    leverage numeric NOT NULL,
    margin_used numeric NOT NULL,
    unrealized_pnl numeric DEFAULT 0 NOT NULL,
    distance_to_liq_pct numeric,
    account_value numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT position_snapshots_snapshot_type_check CHECK ((snapshot_type = ANY (ARRAY['open'::text, 'size_increase'::text, 'margin_change'::text, 'close'::text, 'periodic'::text])))
);


--
-- Name: positions_perps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions_perps (
    wallet_id uuid NOT NULL,
    market text NOT NULL,
    position_size numeric DEFAULT 0 NOT NULL,
    avg_entry numeric DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    margin_used numeric DEFAULT 0,
    effective_leverage numeric DEFAULT 0,
    position_value numeric DEFAULT 0,
    unrealized_pnl numeric DEFAULT 0,
    liquidation_px numeric DEFAULT 0,
    max_leverage integer DEFAULT 0,
    return_on_equity numeric DEFAULT 0
);


--
-- Name: positions_spot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions_spot (
    wallet_id uuid NOT NULL,
    asset text NOT NULL,
    balance numeric DEFAULT 0 NOT NULL,
    avg_cost numeric DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: price_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_snapshots (
    asset text NOT NULL,
    ts timestamp with time zone NOT NULL,
    day date NOT NULL,
    price_usd numeric NOT NULL
);


--
-- Name: raw_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    source_type public.source_type NOT NULL,
    chain text,
    ts timestamp with time zone NOT NULL,
    unique_key text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recompute_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recompute_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    payment_tx_hash text,
    status text DEFAULT 'running'::text NOT NULL,
    days_processed integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recompute_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: risk_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    position_id uuid,
    event_type text NOT NULL,
    ts timestamp with time zone NOT NULL,
    severity text NOT NULL,
    market text,
    value_before numeric,
    value_after numeric,
    threshold_triggered numeric,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_events_event_type_check CHECK ((event_type = ANY (ARRAY['liquidation_proximity'::text, 'leverage_change'::text, 'underwater_start'::text, 'underwater_end'::text, 'margin_call_risk'::text, 'max_drawdown'::text]))),
    CONSTRAINT risk_events_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])))
);


--
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    source_type public.source_type NOT NULL,
    chain text,
    cursor text,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sync_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL,
    start_time bigint,
    end_time bigint,
    fills_ingested integer DEFAULT 0,
    funding_ingested integer DEFAULT 0,
    events_ingested integer DEFAULT 0,
    days_recomputed integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_tx_hash text,
    CONSTRAINT sync_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: underwater_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.underwater_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    position_id uuid,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    max_drawdown_usd numeric DEFAULT 0 NOT NULL,
    max_drawdown_pct numeric DEFAULT 0 NOT NULL,
    duration_minutes integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    address text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: asset_metadata asset_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_metadata
    ADD CONSTRAINT asset_metadata_pkey PRIMARY KEY (asset_id);


--
-- Name: behavior_flags behavior_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavior_flags
    ADD CONSTRAINT behavior_flags_pkey PRIMARY KEY (id);


--
-- Name: clearinghouse_snapshots clearinghouse_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clearinghouse_snapshots
    ADD CONSTRAINT clearinghouse_snapshots_pkey PRIMARY KEY (id);


--
-- Name: closed_trades closed_trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.closed_trades
    ADD CONSTRAINT closed_trades_pkey PRIMARY KEY (id);


--
-- Name: closed_trades closed_trades_wallet_id_market_exit_time_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.closed_trades
    ADD CONSTRAINT closed_trades_wallet_id_market_exit_time_key UNIQUE (wallet_id, market, exit_time);


--
-- Name: daily_pnl daily_pnl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pnl
    ADD CONSTRAINT daily_pnl_pkey PRIMARY KEY (wallet_id, day);


--
-- Name: daily_rollups daily_rollups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_rollups
    ADD CONSTRAINT daily_rollups_pkey PRIMARY KEY (wallet_id, day);


--
-- Name: drawdown_events drawdown_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drawdown_events
    ADD CONSTRAINT drawdown_events_pkey PRIMARY KEY (id);


--
-- Name: drawdown_events drawdown_events_wallet_id_peak_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drawdown_events
    ADD CONSTRAINT drawdown_events_wallet_id_peak_date_key UNIQUE (wallet_id, peak_date);


--
-- Name: economic_events economic_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.economic_events
    ADD CONSTRAINT economic_events_pkey PRIMARY KEY (id);


--
-- Name: equity_curve equity_curve_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equity_curve
    ADD CONSTRAINT equity_curve_pkey PRIMARY KEY (wallet_id, day);


--
-- Name: funding_cycles funding_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funding_cycles
    ADD CONSTRAINT funding_cycles_pkey PRIMARY KEY (id);


--
-- Name: mark_snapshots mark_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mark_snapshots
    ADD CONSTRAINT mark_snapshots_pkey PRIMARY KEY (market, ts);


--
-- Name: market_rollups market_rollups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_rollups
    ADD CONSTRAINT market_rollups_pkey PRIMARY KEY (wallet_id, market, period, period_start);


--
-- Name: market_stats market_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_stats
    ADD CONSTRAINT market_stats_pkey PRIMARY KEY (wallet_id, market);


--
-- Name: materialized_positions materialized_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materialized_positions
    ADD CONSTRAINT materialized_positions_pkey PRIMARY KEY (id);


--
-- Name: monthly_pnl monthly_pnl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_pnl
    ADD CONSTRAINT monthly_pnl_pkey PRIMARY KEY (wallet_id, month);


--
-- Name: payment_receipts payment_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_pkey PRIMARY KEY (id);


--
-- Name: payment_receipts payment_receipts_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_tx_hash_key UNIQUE (tx_hash);


--
-- Name: position_snapshots position_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_snapshots
    ADD CONSTRAINT position_snapshots_pkey PRIMARY KEY (id);


--
-- Name: positions_perps positions_perps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions_perps
    ADD CONSTRAINT positions_perps_pkey PRIMARY KEY (wallet_id, market);


--
-- Name: positions_spot positions_spot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions_spot
    ADD CONSTRAINT positions_spot_pkey PRIMARY KEY (wallet_id, asset);


--
-- Name: price_snapshots price_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_snapshots
    ADD CONSTRAINT price_snapshots_pkey PRIMARY KEY (asset, ts);


--
-- Name: raw_events raw_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_events
    ADD CONSTRAINT raw_events_pkey PRIMARY KEY (id);


--
-- Name: raw_events raw_events_unique_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_events
    ADD CONSTRAINT raw_events_unique_key_key UNIQUE (unique_key);


--
-- Name: recompute_runs recompute_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recompute_runs
    ADD CONSTRAINT recompute_runs_pkey PRIMARY KEY (id);


--
-- Name: risk_events risk_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_events
    ADD CONSTRAINT risk_events_pkey PRIMARY KEY (id);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: sync_runs sync_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_runs
    ADD CONSTRAINT sync_runs_pkey PRIMARY KEY (id);


--
-- Name: underwater_periods underwater_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.underwater_periods
    ADD CONSTRAINT underwater_periods_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_address_key UNIQUE (address);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: economic_events_wallet_event_dedupe_key_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX economic_events_wallet_event_dedupe_key_uniq ON public.economic_events USING btree (wallet_id, event_type, dedupe_key) WHERE (dedupe_key IS NOT NULL);


--
-- Name: idx_behavior_flags_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_behavior_flags_position ON public.behavior_flags USING btree (position_id);


--
-- Name: idx_behavior_flags_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_behavior_flags_type ON public.behavior_flags USING btree (flag_type);


--
-- Name: idx_behavior_flags_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_behavior_flags_wallet ON public.behavior_flags USING btree (wallet_id);


--
-- Name: idx_clearinghouse_snapshots_wallet_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clearinghouse_snapshots_wallet_day ON public.clearinghouse_snapshots USING btree (wallet_id, day DESC);


--
-- Name: idx_closed_trades_exit_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_closed_trades_exit_time ON public.closed_trades USING btree (exit_time);


--
-- Name: idx_closed_trades_market; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_closed_trades_market ON public.closed_trades USING btree (market);


--
-- Name: idx_closed_trades_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_closed_trades_wallet_id ON public.closed_trades USING btree (wallet_id);


--
-- Name: idx_daily_pnl_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_pnl_wallet ON public.daily_pnl USING btree (wallet_id);


--
-- Name: idx_daily_rollups_wallet_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_rollups_wallet_day ON public.daily_rollups USING btree (wallet_id, day DESC);


--
-- Name: idx_drawdown_events_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drawdown_events_wallet_id ON public.drawdown_events USING btree (wallet_id);


--
-- Name: idx_econ_events_wallet_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_econ_events_wallet_day ON public.economic_events USING btree (wallet_id, day);


--
-- Name: idx_econ_events_wallet_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_econ_events_wallet_ts ON public.economic_events USING btree (wallet_id, ts);


--
-- Name: idx_econ_events_wallet_type_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_econ_events_wallet_type_day ON public.economic_events USING btree (wallet_id, event_type, day);


--
-- Name: idx_economic_events_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_economic_events_idempotency ON public.economic_events USING btree (wallet_id, event_type, ts, tx_hash, COALESCE((meta ->> 'dedupe'::text), ''::text));


--
-- Name: idx_economic_events_volume; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_economic_events_volume ON public.economic_events USING btree (wallet_id, day, event_type) WHERE (event_type = 'PERP_FILL'::public.event_type);


--
-- Name: idx_equity_curve_wallet_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equity_curve_wallet_day ON public.equity_curve USING btree (wallet_id, day);


--
-- Name: idx_funding_cycles_market; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funding_cycles_market ON public.funding_cycles USING btree (market);


--
-- Name: idx_funding_cycles_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funding_cycles_time ON public.funding_cycles USING btree (funding_time DESC);


--
-- Name: idx_funding_cycles_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funding_cycles_wallet ON public.funding_cycles USING btree (wallet_id);


--
-- Name: idx_mark_snapshots_market_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mark_snapshots_market_day ON public.mark_snapshots USING btree (market, day);


--
-- Name: idx_market_rollups_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_rollups_wallet ON public.market_rollups USING btree (wallet_id, market);


--
-- Name: idx_market_stats_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_stats_wallet_id ON public.market_stats USING btree (wallet_id);


--
-- Name: idx_materialized_positions_market; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materialized_positions_market ON public.materialized_positions USING btree (market);


--
-- Name: idx_materialized_positions_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materialized_positions_open ON public.materialized_positions USING btree (wallet_id, is_open);


--
-- Name: idx_materialized_positions_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materialized_positions_time ON public.materialized_positions USING btree (open_time DESC);


--
-- Name: idx_materialized_positions_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materialized_positions_wallet ON public.materialized_positions USING btree (wallet_id);


--
-- Name: idx_monthly_pnl_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monthly_pnl_wallet ON public.monthly_pnl USING btree (wallet_id);


--
-- Name: idx_payment_receipts_tx_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_receipts_tx_hash ON public.payment_receipts USING btree (tx_hash);


--
-- Name: idx_payment_receipts_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_receipts_wallet ON public.payment_receipts USING btree (wallet);


--
-- Name: idx_position_snapshots_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_position_snapshots_position ON public.position_snapshots USING btree (position_id);


--
-- Name: idx_position_snapshots_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_position_snapshots_time ON public.position_snapshots USING btree (ts DESC);


--
-- Name: idx_position_snapshots_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_position_snapshots_wallet ON public.position_snapshots USING btree (wallet_id);


--
-- Name: idx_price_snapshots_asset_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_snapshots_asset_day ON public.price_snapshots USING btree (asset, day);


--
-- Name: idx_raw_events_wallet_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raw_events_wallet_ts ON public.raw_events USING btree (wallet_id, ts);


--
-- Name: idx_recompute_runs_payment_tx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recompute_runs_payment_tx ON public.recompute_runs USING btree (payment_tx_hash);


--
-- Name: idx_recompute_runs_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recompute_runs_wallet_id ON public.recompute_runs USING btree (wallet_id);


--
-- Name: idx_risk_events_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_events_severity ON public.risk_events USING btree (severity);


--
-- Name: idx_risk_events_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_events_time ON public.risk_events USING btree (ts DESC);


--
-- Name: idx_risk_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_events_type ON public.risk_events USING btree (event_type);


--
-- Name: idx_risk_events_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_events_wallet ON public.risk_events USING btree (wallet_id);


--
-- Name: idx_sources_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sources_wallet ON public.sources USING btree (wallet_id);


--
-- Name: idx_sync_runs_wallet_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_runs_wallet_started ON public.sync_runs USING btree (wallet_id, started_at DESC);


--
-- Name: idx_underwater_periods_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_underwater_periods_active ON public.underwater_periods USING btree (wallet_id, is_active);


--
-- Name: idx_underwater_periods_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_underwater_periods_wallet ON public.underwater_periods USING btree (wallet_id);


--
-- Name: closed_trades update_closed_trades_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_closed_trades_updated_at BEFORE UPDATE ON public.closed_trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_pnl update_daily_pnl_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_pnl_updated_at BEFORE UPDATE ON public.daily_pnl FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_rollups update_daily_rollups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_rollups_updated_at BEFORE UPDATE ON public.daily_rollups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: drawdown_events update_drawdown_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_drawdown_events_updated_at BEFORE UPDATE ON public.drawdown_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: equity_curve update_equity_curve_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_equity_curve_updated_at BEFORE UPDATE ON public.equity_curve FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: market_rollups update_market_rollups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_market_rollups_updated_at BEFORE UPDATE ON public.market_rollups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: market_stats update_market_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_market_stats_updated_at BEFORE UPDATE ON public.market_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: materialized_positions update_materialized_positions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_materialized_positions_updated_at BEFORE UPDATE ON public.materialized_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: monthly_pnl update_monthly_pnl_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_monthly_pnl_updated_at BEFORE UPDATE ON public.monthly_pnl FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: positions_perps update_positions_perps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_positions_perps_updated_at BEFORE UPDATE ON public.positions_perps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: positions_spot update_positions_spot_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_positions_spot_updated_at BEFORE UPDATE ON public.positions_spot FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: underwater_periods update_underwater_periods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_underwater_periods_updated_at BEFORE UPDATE ON public.underwater_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: behavior_flags behavior_flags_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavior_flags
    ADD CONSTRAINT behavior_flags_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.materialized_positions(id) ON DELETE CASCADE;


--
-- Name: behavior_flags behavior_flags_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.behavior_flags
    ADD CONSTRAINT behavior_flags_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: clearinghouse_snapshots clearinghouse_snapshots_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clearinghouse_snapshots
    ADD CONSTRAINT clearinghouse_snapshots_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: closed_trades closed_trades_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.closed_trades
    ADD CONSTRAINT closed_trades_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: daily_pnl daily_pnl_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pnl
    ADD CONSTRAINT daily_pnl_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: daily_rollups daily_rollups_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_rollups
    ADD CONSTRAINT daily_rollups_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: drawdown_events drawdown_events_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drawdown_events
    ADD CONSTRAINT drawdown_events_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: economic_events economic_events_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.economic_events
    ADD CONSTRAINT economic_events_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: equity_curve equity_curve_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equity_curve
    ADD CONSTRAINT equity_curve_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: funding_cycles funding_cycles_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funding_cycles
    ADD CONSTRAINT funding_cycles_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: market_rollups market_rollups_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_rollups
    ADD CONSTRAINT market_rollups_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: market_stats market_stats_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_stats
    ADD CONSTRAINT market_stats_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: materialized_positions materialized_positions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materialized_positions
    ADD CONSTRAINT materialized_positions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: monthly_pnl monthly_pnl_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_pnl
    ADD CONSTRAINT monthly_pnl_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: position_snapshots position_snapshots_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_snapshots
    ADD CONSTRAINT position_snapshots_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.materialized_positions(id) ON DELETE CASCADE;


--
-- Name: position_snapshots position_snapshots_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_snapshots
    ADD CONSTRAINT position_snapshots_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: positions_perps positions_perps_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions_perps
    ADD CONSTRAINT positions_perps_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: positions_spot positions_spot_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions_spot
    ADD CONSTRAINT positions_spot_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: raw_events raw_events_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_events
    ADD CONSTRAINT raw_events_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: recompute_runs recompute_runs_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recompute_runs
    ADD CONSTRAINT recompute_runs_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: risk_events risk_events_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_events
    ADD CONSTRAINT risk_events_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.materialized_positions(id) ON DELETE SET NULL;


--
-- Name: risk_events risk_events_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_events
    ADD CONSTRAINT risk_events_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: sources sources_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: sync_runs sync_runs_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_runs
    ADD CONSTRAINT sync_runs_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: underwater_periods underwater_periods_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.underwater_periods
    ADD CONSTRAINT underwater_periods_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.materialized_positions(id) ON DELETE SET NULL;


--
-- Name: underwater_periods underwater_periods_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.underwater_periods
    ADD CONSTRAINT underwater_periods_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: behavior_flags Allow insert for behavior_flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for behavior_flags" ON public.behavior_flags FOR INSERT WITH CHECK (true);


--
-- Name: clearinghouse_snapshots Allow insert for clearinghouse_snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for clearinghouse_snapshots" ON public.clearinghouse_snapshots FOR INSERT WITH CHECK (true);


--
-- Name: closed_trades Allow insert for closed_trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for closed_trades" ON public.closed_trades FOR INSERT WITH CHECK (true);


--
-- Name: daily_rollups Allow insert for daily_rollups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for daily_rollups" ON public.daily_rollups FOR INSERT WITH CHECK (true);


--
-- Name: drawdown_events Allow insert for drawdown_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for drawdown_events" ON public.drawdown_events FOR INSERT WITH CHECK (true);


--
-- Name: economic_events Allow insert for economic events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for economic events" ON public.economic_events FOR INSERT WITH CHECK (true);


--
-- Name: funding_cycles Allow insert for funding_cycles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for funding_cycles" ON public.funding_cycles FOR INSERT WITH CHECK (true);


--
-- Name: market_rollups Allow insert for market_rollups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for market_rollups" ON public.market_rollups FOR INSERT WITH CHECK (true);


--
-- Name: materialized_positions Allow insert for materialized_positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for materialized_positions" ON public.materialized_positions FOR INSERT WITH CHECK (true);


--
-- Name: payment_receipts Allow insert for payment_receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for payment_receipts" ON public.payment_receipts FOR INSERT WITH CHECK (true);


--
-- Name: position_snapshots Allow insert for position_snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for position_snapshots" ON public.position_snapshots FOR INSERT WITH CHECK (true);


--
-- Name: raw_events Allow insert for raw events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for raw events" ON public.raw_events FOR INSERT WITH CHECK (true);


--
-- Name: recompute_runs Allow insert for recompute_runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for recompute_runs" ON public.recompute_runs FOR INSERT WITH CHECK (true);


--
-- Name: risk_events Allow insert for risk_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for risk_events" ON public.risk_events FOR INSERT WITH CHECK (true);


--
-- Name: sources Allow insert for sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for sources" ON public.sources FOR INSERT WITH CHECK (true);


--
-- Name: sync_runs Allow insert for sync_runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for sync_runs" ON public.sync_runs FOR INSERT WITH CHECK (true);


--
-- Name: underwater_periods Allow insert for underwater_periods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for underwater_periods" ON public.underwater_periods FOR INSERT WITH CHECK (true);


--
-- Name: wallets Allow insert for wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for wallets" ON public.wallets FOR INSERT WITH CHECK (true);


--
-- Name: asset_metadata Allow update for asset_metadata; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for asset_metadata" ON public.asset_metadata FOR UPDATE USING (true);


--
-- Name: clearinghouse_snapshots Allow update for clearinghouse_snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for clearinghouse_snapshots" ON public.clearinghouse_snapshots FOR UPDATE USING (true);


--
-- Name: closed_trades Allow update for closed_trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for closed_trades" ON public.closed_trades FOR UPDATE USING (true);


--
-- Name: daily_pnl Allow update for daily_pnl; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for daily_pnl" ON public.daily_pnl FOR UPDATE USING (true);


--
-- Name: daily_rollups Allow update for daily_rollups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for daily_rollups" ON public.daily_rollups FOR UPDATE USING (true);


--
-- Name: drawdown_events Allow update for drawdown_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for drawdown_events" ON public.drawdown_events FOR UPDATE USING (true);


--
-- Name: equity_curve Allow update for equity_curve; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for equity_curve" ON public.equity_curve FOR UPDATE USING (true);


--
-- Name: market_rollups Allow update for market_rollups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for market_rollups" ON public.market_rollups FOR UPDATE USING (true);


--
-- Name: market_stats Allow update for market_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for market_stats" ON public.market_stats FOR UPDATE USING (true);


--
-- Name: materialized_positions Allow update for materialized_positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for materialized_positions" ON public.materialized_positions FOR UPDATE USING (true);


--
-- Name: monthly_pnl Allow update for monthly_pnl; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for monthly_pnl" ON public.monthly_pnl FOR UPDATE USING (true);


--
-- Name: positions_perps Allow update for positions_perps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for positions_perps" ON public.positions_perps FOR UPDATE USING (true);


--
-- Name: positions_spot Allow update for positions_spot; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for positions_spot" ON public.positions_spot FOR UPDATE USING (true);


--
-- Name: recompute_runs Allow update for recompute_runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for recompute_runs" ON public.recompute_runs FOR UPDATE USING (true);


--
-- Name: sources Allow update for sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for sources" ON public.sources FOR UPDATE USING (true);


--
-- Name: sync_runs Allow update for sync_runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for sync_runs" ON public.sync_runs FOR UPDATE USING (true);


--
-- Name: underwater_periods Allow update for underwater_periods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for underwater_periods" ON public.underwater_periods FOR UPDATE USING (true);


--
-- Name: asset_metadata Allow upsert for asset_metadata; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow upsert for asset_metadata" ON public.asset_metadata FOR INSERT WITH CHECK (true);


--
-- Name: daily_pnl Allow upsert for daily_pnl; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow upsert for daily_pnl" ON public.daily_pnl FOR INSERT WITH CHECK (true);


--
-- Name: equity_curve Allow upsert for equity_curve; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow upsert for equity_curve" ON public.equity_curve FOR INSERT WITH CHECK (true);


--
-- Name: mark_snapshots Allow upsert for mark_snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow upsert for mark_snapshots" ON public.mark_snapshots FOR INSERT WITH CHECK (true);


--
-- Name: market_stats Allow upsert for market_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow upsert for market_stats" ON public.market_stats FOR INSERT WITH CHECK (true);


--
-- Name: monthly_pnl Allow upsert for monthly_pnl; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow upsert for monthly_pnl" ON public.monthly_pnl FOR INSERT WITH CHECK (true);


--
-- Name: positions_perps Allow upsert for positions_perps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow upsert for positions_perps" ON public.positions_perps FOR INSERT WITH CHECK (true);


--
-- Name: positions_spot Allow upsert for positions_spot; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow upsert for positions_spot" ON public.positions_spot FOR INSERT WITH CHECK (true);


--
-- Name: price_snapshots Allow upsert for price_snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow upsert for price_snapshots" ON public.price_snapshots FOR INSERT WITH CHECK (true);


--
-- Name: asset_metadata Asset metadata is publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Asset metadata is publicly readable" ON public.asset_metadata FOR SELECT USING (true);


--
-- Name: behavior_flags Behavior flags are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Behavior flags are publicly readable" ON public.behavior_flags FOR SELECT USING (true);


--
-- Name: clearinghouse_snapshots Clearinghouse snapshots are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clearinghouse snapshots are publicly readable" ON public.clearinghouse_snapshots FOR SELECT USING (true);


--
-- Name: closed_trades Closed trades are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Closed trades are publicly readable" ON public.closed_trades FOR SELECT USING (true);


--
-- Name: daily_pnl Daily PnL is publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Daily PnL is publicly readable" ON public.daily_pnl FOR SELECT USING (true);


--
-- Name: daily_rollups Daily rollups are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Daily rollups are publicly readable" ON public.daily_rollups FOR SELECT USING (true);


--
-- Name: drawdown_events Drawdown events are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drawdown events are publicly readable" ON public.drawdown_events FOR SELECT USING (true);


--
-- Name: economic_events Economic events are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Economic events are publicly readable" ON public.economic_events FOR SELECT USING (true);


--
-- Name: equity_curve Equity curve is publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Equity curve is publicly readable" ON public.equity_curve FOR SELECT USING (true);


--
-- Name: funding_cycles Funding cycles are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Funding cycles are publicly readable" ON public.funding_cycles FOR SELECT USING (true);


--
-- Name: mark_snapshots Mark snapshots are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mark snapshots are publicly readable" ON public.mark_snapshots FOR SELECT USING (true);


--
-- Name: market_rollups Market rollups are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Market rollups are publicly readable" ON public.market_rollups FOR SELECT USING (true);


--
-- Name: market_stats Market stats are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Market stats are publicly readable" ON public.market_stats FOR SELECT USING (true);


--
-- Name: materialized_positions Materialized positions are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Materialized positions are publicly readable" ON public.materialized_positions FOR SELECT USING (true);


--
-- Name: monthly_pnl Monthly PnL is publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Monthly PnL is publicly readable" ON public.monthly_pnl FOR SELECT USING (true);


--
-- Name: payment_receipts Payment receipts are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Payment receipts are publicly readable" ON public.payment_receipts FOR SELECT USING (true);


--
-- Name: positions_perps Perp positions are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Perp positions are publicly readable" ON public.positions_perps FOR SELECT USING (true);


--
-- Name: position_snapshots Position snapshots are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Position snapshots are publicly readable" ON public.position_snapshots FOR SELECT USING (true);


--
-- Name: price_snapshots Price snapshots are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Price snapshots are publicly readable" ON public.price_snapshots FOR SELECT USING (true);


--
-- Name: raw_events Raw events are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Raw events are publicly readable" ON public.raw_events FOR SELECT USING (true);


--
-- Name: recompute_runs Recompute runs are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recompute runs are publicly readable" ON public.recompute_runs FOR SELECT USING (true);


--
-- Name: risk_events Risk events are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Risk events are publicly readable" ON public.risk_events FOR SELECT USING (true);


--
-- Name: sources Sources are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sources are publicly readable" ON public.sources FOR SELECT USING (true);


--
-- Name: positions_spot Spot positions are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Spot positions are publicly readable" ON public.positions_spot FOR SELECT USING (true);


--
-- Name: sync_runs Sync runs are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sync runs are publicly readable" ON public.sync_runs FOR SELECT USING (true);


--
-- Name: underwater_periods Underwater periods are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Underwater periods are publicly readable" ON public.underwater_periods FOR SELECT USING (true);


--
-- Name: wallets Wallets are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Wallets are publicly readable" ON public.wallets FOR SELECT USING (true);


--
-- Name: asset_metadata; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_metadata ENABLE ROW LEVEL SECURITY;

--
-- Name: behavior_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.behavior_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: clearinghouse_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clearinghouse_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: closed_trades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.closed_trades ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_pnl; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_pnl ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_rollups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_rollups ENABLE ROW LEVEL SECURITY;

--
-- Name: drawdown_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drawdown_events ENABLE ROW LEVEL SECURITY;

--
-- Name: economic_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;

--
-- Name: equity_curve; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equity_curve ENABLE ROW LEVEL SECURITY;

--
-- Name: funding_cycles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.funding_cycles ENABLE ROW LEVEL SECURITY;

--
-- Name: mark_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mark_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: market_rollups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_rollups ENABLE ROW LEVEL SECURITY;

--
-- Name: market_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: materialized_positions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.materialized_positions ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_pnl; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monthly_pnl ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: position_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.position_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: positions_perps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.positions_perps ENABLE ROW LEVEL SECURITY;

--
-- Name: positions_spot; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.positions_spot ENABLE ROW LEVEL SECURITY;

--
-- Name: price_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: raw_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.raw_events ENABLE ROW LEVEL SECURITY;

--
-- Name: recompute_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recompute_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: underwater_periods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.underwater_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;