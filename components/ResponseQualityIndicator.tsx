import { useResponseQuality } from '@/hooks/useResponseQuality';
import { cn } from '@/lib/utils';

interface ResponseQualityIndicatorProps {
  responseText: string;
  className?: string;
}

export function ResponseQualityIndicator({ responseText, className }: ResponseQualityIndicatorProps) {
  const quality = useResponseQuality(responseText);

  // Don't show anything if there's no text
  if (!responseText || responseText.trim().length < 5) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-all duration-500 ease-in-out",
      "bg-gradient-to-r from-comfort-50/50 to-hope-50/50 border-comfort-200/50",
      className
    )}>
      <div className="text-3xl transition-all duration-300 ease-in-out transform hover:scale-110">
        {quality.emoji}
      </div>
      <div className="flex-1">
        <div className="text-sm font-compassionate text-comfort-800 transition-opacity duration-300">
          {quality.message}
        </div>
        <div className="text-xs text-peace-600 mt-1">
          {responseText.trim().split(/\s+/).length} words
        </div>
      </div>
      
      {/* Visual progress indicator */}
      <div className="w-20 h-2 bg-peace-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-500 ease-out rounded-full",
            quality.tier === 'good' && "bg-gradient-to-r from-hope-400 to-hope-500",
            quality.tier === 'better' && "bg-gradient-to-r from-comfort-400 to-comfort-500", 
            quality.tier === 'best' && "bg-gradient-to-r from-peace-400 to-comfort-500"
          )}
          style={{ width: `${Math.max(quality.score * 100, 20)}%` }}
        />
      </div>
    </div>
  );
}