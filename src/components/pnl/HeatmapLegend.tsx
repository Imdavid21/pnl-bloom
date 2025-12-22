export function HeatmapLegend() {
  return (
    <div className="flex flex-col gap-2 text-xs">
      {/* Loss row */}
      <div className="flex items-center gap-2">
        <span className="w-12 text-muted-foreground">Loss</span>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-[10px]">More</span>
          <div className="h-3 w-3 rounded-sm bg-loss-4" />
          <div className="h-3 w-3 rounded-sm bg-loss-3" />
          <div className="h-3 w-3 rounded-sm bg-loss-2" />
          <div className="h-3 w-3 rounded-sm bg-loss-1" />
          <div className="h-3 w-3 rounded-sm bg-neutral" />
          <span className="text-muted-foreground text-[10px]">Less</span>
        </div>
      </div>
      
      {/* Profit row */}
      <div className="flex items-center gap-2">
        <span className="w-12 text-muted-foreground">Profit</span>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-[10px]">Less</span>
          <div className="h-3 w-3 rounded-sm bg-neutral" />
          <div className="h-3 w-3 rounded-sm bg-profit-1" />
          <div className="h-3 w-3 rounded-sm bg-profit-2" />
          <div className="h-3 w-3 rounded-sm bg-profit-3" />
          <div className="h-3 w-3 rounded-sm bg-profit-4" />
          <span className="text-muted-foreground text-[10px]">More</span>
        </div>
      </div>
      
      {/* No data */}
      <div className="flex items-center gap-2">
        <span className="w-12 text-muted-foreground">No data</span>
        <div className="h-3 w-3 rounded-sm bg-no-data border border-border" />
      </div>
    </div>
  );
}
