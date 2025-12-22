import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";

interface MonthSwitcherProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onShare: () => void;
}

export function MonthSwitcher({
  currentMonth,
  onMonthChange,
  onShare
}: MonthSwitcherProps) {
  const handlePrevMonth = () => {
    onMonthChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1));
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevMonth}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="text-sm font-medium min-w-[100px] text-center">
        {format(currentMonth, "MMMM yyyy")}
      </span>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextMonth}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onShare}
        className="h-8 w-8 ml-2"
      >
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
