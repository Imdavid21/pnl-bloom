/**
 * Risk Summary Card
 * Shows risk alerts when dangerous conditions are detected
 */

import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RiskAlert, RiskAnalysis } from '@/lib/risk-detector';

interface RiskSummaryCardProps {
  analysis: RiskAnalysis;
  address: string;
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

export function RiskSummaryCard({ analysis, address }: RiskSummaryCardProps) {
  if (!analysis.hasRisk || analysis.alerts.length === 0) {
    return null;
  }

  const styles = getSeverityStyles(analysis.overallSeverity as 'low' | 'medium' | 'high');

  return (
    <div className={cn(
      'rounded-lg border-l-4 p-4 space-y-3',
      styles.bg,
      styles.border
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className={cn('h-5 w-5', styles.title)} />
        <h4 className={cn('font-semibold', styles.title)}>Risk Alert</h4>
      </div>

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

      {/* Action Button */}
      <Button 
        variant="outline" 
        size="sm" 
        asChild
        className={cn(
          'mt-2',
          analysis.overallSeverity === 'high' && 'border-red-500/50 text-red-600 hover:bg-red-500/10',
          analysis.overallSeverity === 'medium' && 'border-amber-500/50 text-amber-600 hover:bg-amber-500/10'
        )}
      >
        <Link to={`/analytics/${address}#risk`}>
          View Detailed Risk Analysis
          <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </div>
  );
}
