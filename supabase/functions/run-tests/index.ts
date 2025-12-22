import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runGoldenDayTests, printTestResults } from "../_shared/golden-day-test.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Test runner endpoint
 * 
 * Call this endpoint to run the golden day tests and verify PnL calculations.
 * Use this whenever you modify PnL logic to prevent regressions.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[run-tests] Starting golden day tests...');
    
    const results = runGoldenDayTests();
    printTestResults(results);

    const response = {
      success: results.passed,
      summary: results.passed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED',
      tests: results.results.map(r => ({
        name: r.name,
        passed: r.passed,
        expected: r.expected,
        actual: r.actual,
      })),
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(response, null, 2),
      { 
        status: results.passed ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('[run-tests] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Test execution failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
