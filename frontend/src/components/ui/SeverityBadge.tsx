/* ═══════════════════════════════════════════════════════════
   SeverityBadge — Color-coded severity indicator
   ═══════════════════════════════════════════════════════════ */

import type { Severity } from '../../types/security';
import { getSeverityColor } from '../../utils/colors';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export default function SeverityBadge({ severity, size = 'sm', showDot = true }: SeverityBadgeProps) {
  const colors = getSeverityColor(severity);
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-semibold uppercase tracking-wider ${sizeClasses[size]}`}
      style={{
        color: colors.text,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: colors.dot }}
        />
      )}
      {severity}
    </span>
  );
}
