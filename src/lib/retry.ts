/**
 * Retry utility with exponential backoff and jitter
 * Based on Hyperliquid rate limit documentation
 * https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits
 */

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 * Jitter helps prevent thundering herd when many clients retry simultaneously
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);
  
  if (options.jitter) {
    // Add random jitter between 0-30% of the delay
    const jitterRange = cappedDelay * 0.3;
    const jitter = Math.random() * jitterRange;
    return Math.floor(cappedDelay + jitter);
  }
  
  return cappedDelay;
}

/**
 * Check if error is retryable (rate limit or server error)
 */
function isRetryableError(error: any): boolean {
  // HTTP 429 Too Many Requests
  if (error?.status === 429) return true;
  
  // HTTP 5xx Server Errors
  if (error?.status >= 500 && error?.status < 600) return true;
  
  // Network errors
  if (error?.message?.includes('fetch failed')) return true;
  if (error?.message?.includes('network')) return true;
  if (error?.message?.includes('timeout')) return true;
  
  // Rate limit error messages
  if (error?.message?.toLowerCase().includes('rate limit')) return true;
  if (error?.message?.toLowerCase().includes('too many requests')) return true;
  
  return false;
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if it's the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }
      
      // Only retry on retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }
      
      const delay = calculateDelay(attempt, opts);
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed: ${error?.message || 'Unknown error'}. ` +
        `Retrying in ${delay}ms...`
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Fetch with retry logic built in
 */
export async function fetchWithRetry(
  url: string | URL,
  init?: RequestInit,
  options: Partial<RetryOptions> = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, init);
    
    // Throw on rate limit to trigger retry
    if (response.status === 429) {
      const error: any = new Error('Rate limit exceeded');
      error.status = 429;
      throw error;
    }
    
    // Throw on server errors to trigger retry
    if (response.status >= 500) {
      const error: any = new Error(`Server error: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    
    return response;
  }, options);
}

/**
 * JSON fetch with retry logic
 */
export async function fetchJsonWithRetry<T>(
  url: string | URL,
  init?: RequestInit,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const response = await fetchWithRetry(url, init, options);
  return response.json() as Promise<T>;
}
