import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface PriceDataPoint {
  time: number;
  price: number;
}

interface VolumeDataPoint {
  time: number;
  volume: number;
}

interface TokenPriceChartProps {
  priceHistory?: PriceDataPoint[];
  volumeHistory?: VolumeDataPoint[];
  symbol: string;
  className?: string;
}

export function TokenPriceChart({
  priceHistory = [],
  volumeHistory = [],
  symbol,
  className,
}: TokenPriceChartProps) {
  const priceData = useMemo(() => {
    return priceHistory.map(p => ({
      ...p,
      date: new Date(p.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [priceHistory]);

  const volumeData = useMemo(() => {
    return volumeHistory.map(v => ({
      ...v,
      date: new Date(v.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [volumeHistory]);

  const priceChange = useMemo(() => {
    if (priceHistory.length < 2) return 0;
    const first = priceHistory[0].price;
    const last = priceHistory[priceHistory.length - 1].price;
    return ((last - first) / first) * 100;
  }, [priceHistory]);

  const formatPrice = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toPrecision(4)}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (priceHistory.length === 0 && volumeHistory.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center text-muted-foreground">
          No chart data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Tabs defaultValue="price" className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{symbol} Chart</CardTitle>
            <TabsList className="h-8">
              <TabsTrigger value="price" className="text-xs px-3 h-7">Price</TabsTrigger>
              <TabsTrigger value="volume" className="text-xs px-3 h-7">Volume</TabsTrigger>
            </TabsList>
          </div>
          {priceHistory.length > 0 && (
            <p className={cn(
              "text-sm",
              priceChange >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (30d)
            </p>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          <TabsContent value="price" className="mt-0">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={priceChange >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={priceChange >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={formatPrice}
                    width={60}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
                            <p className="text-sm font-mono font-medium">{formatPrice(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={priceChange >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))"} 
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="volume" className="mt-0">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={formatVolume}
                    width={60}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
                            <p className="text-sm font-mono font-medium">{formatVolume(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="volume" 
                    fill="hsl(var(--primary))"
                    opacity={0.8}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
