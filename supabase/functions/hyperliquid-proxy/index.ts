import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HYPERLIQUID_INFO_API = "https://api.hyperliquid.xyz/info";
const HYPERLIQUID_EXPLORER_API = "https://api.hyperliquid.xyz/explorer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") || "info";
    
    let targetUrl: string;
    if (endpoint === "explorer") {
      targetUrl = HYPERLIQUID_EXPLORER_API;
    } else {
      targetUrl = HYPERLIQUID_INFO_API;
    }

    // Forward the request body
    const body = await req.text();
    
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    const responseText = await response.text();
    
    // Try to parse as JSON, return error if not valid JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Hyperliquid API returned non-JSON:", responseText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Hyperliquid API error", details: responseText.substring(0, 500) }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Proxy error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
