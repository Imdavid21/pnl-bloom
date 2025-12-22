import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Goldrush event types we care about
type DecodedType = 'TRANSFER' | 'DEPOSIT' | 'WITHDRAW' | 'SWAP' | 'APPROVE' | 'UNKNOWN';

interface GoldrushEvent {
  chain: string;
  tx_hash: string;
  tx_offset?: number;
  log_index?: number;
  block_signed_at: string;
  decoded_type: DecodedType;
  decoded_details?: {
    from?: string;
    to?: string;
    amount?: string;
    token_address?: string;
    token_symbol?: string;
    token_decimals?: number;
    // Swap specific
    from_token?: string;
    to_token?: string;
    from_amount?: string;
    to_amount?: string;
  };
  quote_rate_usd?: number;
  quote_usd?: number;
  fee_usd?: number;
}

interface WebhookPayload {
  wallet: string;
  events: GoldrushEvent[];
}

// Generate unique key for idempotency
function generateUniqueKey(
  chain: string,
  txHash: string,
  txOffset: number | undefined,
  logIndex: number | undefined,
  decodedType: string,
  wallet: string
): string {
  return `${chain}:${txHash}:${txOffset || 0}:${logIndex || 0}:${decodedType}:${wallet.toLowerCase()}`;
}

// Normalize Goldrush event into economic events
function normalizeGoldrushEvent(
  walletId: string,
  walletAddress: string,
  event: GoldrushEvent
): { events: any[]; affectedDays: string[] } {
  const economicEvents: any[] = [];
  const affectedDays: string[] = [];
  
  const ts = new Date(event.block_signed_at);
  const day = ts.toISOString().split('T')[0];
  affectedDays.push(day);
  
  const baseEvent = {
    wallet_id: walletId,
    ts: ts.toISOString(),
    day,
    venue: 'onchain',
    chain: event.chain,
    tx_hash: event.tx_hash,
    fee_usd: event.fee_usd || 0,
  };

  const details = event.decoded_details || {};
  const walletLower = walletAddress.toLowerCase();
  const fromLower = (details.from || '').toLowerCase();
  const toLower = (details.to || '').toLowerCase();

  switch (event.decoded_type) {
    case 'TRANSFER':
    case 'DEPOSIT':
    case 'WITHDRAW': {
      const isIncoming = toLower === walletLower;
      const eventType = isIncoming ? 'SPOT_TRANSFER_IN' : 'SPOT_TRANSFER_OUT';
      
      economicEvents.push({
        ...baseEvent,
        event_type: eventType,
        asset: details.token_symbol || details.token_address || 'UNKNOWN',
        qty: details.amount ? parseFloat(details.amount) / Math.pow(10, details.token_decimals || 18) : 0,
        price_usd: event.quote_rate_usd || null,
        usd_value: event.quote_usd || null,
        meta: {
          dedupe: `${event.log_index || 0}`,
          from: details.from,
          to: details.to,
          decoded_type: event.decoded_type,
        },
      });
      break;
    }

    case 'SWAP': {
      // SWAP generates two events: SPOT_SELL (from) and SPOT_BUY (to)
      if (details.from_token && details.from_amount) {
        economicEvents.push({
          ...baseEvent,
          event_type: 'SPOT_SELL',
          asset: details.from_token,
          qty: parseFloat(details.from_amount),
          price_usd: event.quote_rate_usd || null,
          usd_value: event.quote_usd ? event.quote_usd / 2 : null, // Approximate
          meta: {
            dedupe: `${event.log_index || 0}_sell`,
            swap_pair: `${details.from_token}/${details.to_token}`,
          },
        });
      }

      if (details.to_token && details.to_amount) {
        economicEvents.push({
          ...baseEvent,
          event_type: 'SPOT_BUY',
          asset: details.to_token,
          qty: parseFloat(details.to_amount),
          price_usd: event.quote_rate_usd || null,
          usd_value: event.quote_usd ? event.quote_usd / 2 : null,
          meta: {
            dedupe: `${event.log_index || 0}_buy`,
            swap_pair: `${details.from_token}/${details.to_token}`,
          },
        });
      }
      break;
    }

    default:
      // Skip APPROVE and UNKNOWN
      break;
  }

  return { events: economicEvents, affectedDays };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: WebhookPayload = await req.json();
    const { wallet, events } = payload;

    console.log(`[ingest-goldrush] Received ${events?.length || 0} events for wallet: ${wallet}`);

    if (!wallet || !events || !Array.isArray(events)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: wallet and events array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const walletLower = wallet.toLowerCase();

    // Get or create wallet
    let { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('address', walletLower)
      .maybeSingle();

    if (walletError) throw walletError;

    if (!walletData) {
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({ address: walletLower })
        .select('id')
        .single();
      if (createError) throw createError;
      walletData = newWallet;
    }

    const walletId = walletData.id;

    // Process each event
    let rawEventsInserted = 0;
    let economicEventsInserted = 0;
    const allAffectedDays: Set<string> = new Set();

    for (const event of events) {
      // Generate unique key
      const uniqueKey = generateUniqueKey(
        event.chain,
        event.tx_hash,
        event.tx_offset,
        event.log_index,
        event.decoded_type,
        walletLower
      );

      // Upsert raw event (idempotent)
      const { error: rawError } = await supabase
        .from('raw_events')
        .upsert({
          wallet_id: walletId,
          source_type: 'goldrush',
          chain: event.chain,
          ts: event.block_signed_at,
          unique_key: uniqueKey,
          payload: event,
        }, {
          onConflict: 'unique_key',
          ignoreDuplicates: true,
        });

      if (rawError) {
        console.error('[ingest-goldrush] Error inserting raw event:', rawError);
        continue;
      }
      rawEventsInserted++;

      // Normalize into economic events
      const { events: econEvents, affectedDays } = normalizeGoldrushEvent(walletId, walletLower, event);
      
      for (const day of affectedDays) {
        allAffectedDays.add(day);
      }

      // Insert economic events (with conflict handling for idempotency)
      for (const econEvent of econEvents) {
        const { error: econError } = await supabase
          .from('economic_events')
          .insert(econEvent);

        if (econError) {
          // Likely duplicate due to idempotency constraint - skip silently
          if (!econError.message.includes('duplicate') && !econError.message.includes('unique')) {
            console.error('[ingest-goldrush] Error inserting economic event:', econError);
          }
        } else {
          economicEventsInserted++;
        }
      }
    }

    // Update source cursor
    const latestEvent = events[events.length - 1];
    if (latestEvent) {
      await supabase
        .from('sources')
        .upsert({
          wallet_id: walletId,
          source_type: 'goldrush',
          chain: latestEvent.chain,
          cursor: latestEvent.tx_hash,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'wallet_id,source_type',
        });
    }

    // Trigger recompute for affected days (D-1 to D+3 window for safety)
    const affectedDaysArray = Array.from(allAffectedDays).sort();
    if (affectedDaysArray.length > 0) {
      const minDay = new Date(affectedDaysArray[0]);
      minDay.setDate(minDay.getDate() - 1);
      const maxDay = new Date(affectedDaysArray[affectedDaysArray.length - 1]);
      maxDay.setDate(maxDay.getDate() + 3);

      console.log(`[ingest-goldrush] Triggering recompute from ${minDay.toISOString().split('T')[0]} to ${maxDay.toISOString().split('T')[0]}`);

      // Call recompute endpoint
      await supabase.functions.invoke('admin-recompute', {
        body: {
          wallet: walletLower,
          start_day: minDay.toISOString().split('T')[0],
          end_day: maxDay.toISOString().split('T')[0],
        },
      });
    }

    console.log(`[ingest-goldrush] Processed: ${rawEventsInserted} raw, ${economicEventsInserted} economic events`);

    return new Response(
      JSON.stringify({
        success: true,
        raw_events_inserted: rawEventsInserted,
        economic_events_inserted: economicEventsInserted,
        affected_days: affectedDaysArray,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[ingest-goldrush] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
