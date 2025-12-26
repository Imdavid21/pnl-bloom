/**
 * Risk Summary Card
 * Shows risk alerts with integrated Analytics CTA
 * Collapsible by default
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RiskAlert, RiskAnalysis } from '@/lib/risk-detector';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface RiskSummaryCardProps {
  analysis: RiskAnalysis;
  address: string;
  defaultOpen?: boolean;
}

function getSeverityStyles(severity: 'low' | 'medium' | 'high') {
  switch (severity) {
    case 'high':
      return {
        bg: 'bg-red-500/10',
        border: 'border-l-red-500',
        title: 'text-red-600 dark:text-red-400',
        text: 'text-red-700 dark:text-red-300',
      };
    case 'medium':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-l-amber-500',
        title: 'text-amber-600 dark:text-amber-400',
        text: 'text-amber-700 dark:text-amber-300',
      };
    default:
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-l-yellow-500',
        title: 'text-yellow-600 dark:text-yellow-400',
        text: 'text-yellow-700 dark:text-yellow-300',
      };
  }
}

export function RiskSummaryCard({ analysis, address, defaultOpen = false }: RiskSummaryCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!analysis.hasRisk || analysis.alerts.length === 0) {
    return null;
  }

  const styles = getSeverityStyles(analysis.overallSeverity as 'low' | 'medium' | 'high');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        'rounded-lg border-l-4',
        styles.bg,
        styles.border
      )}>
        {/* Collapsible Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-r-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn('h-4 w-4', styles.title)} />
              <h4 className={cn('font-semibold text-sm', styles.title)}>
                Risk Alert ({analysis.alerts.length})
              </h4>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        {/* Collapsible Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Alert List */}
            <ul className="space-y-2">
              {analysis.alerts.map((alert, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span className={styles.text}>
                    {alert.message}
                    {alert.link && (
                      <Link 
                        to={alert.link}
                        className="ml-1 underline underline-offset-2 hover:opacity-80"
                      >
                        View
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {/* Unlock Analytics CTA - Primary Action */}
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Get detailed risk metrics & trade insights
                  </span>
                </div>
                <Button 
                  size="sm" 
                  asChild
                  className="bg-primary hover:bg-primary/90"
                >
                  <Link to={`/analytics?wallet=${address}`}>
                    Unlock Advanced Analytics
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
