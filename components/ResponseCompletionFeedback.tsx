import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QualityScore, getCompletionMessage } from '@/lib/response-quality';
import { cn } from '@/lib/utils';

interface ResponseCompletionFeedbackProps {
  quality: QualityScore;
  onContinue: () => void;
  autoRedirectMs?: number;
}

export function ResponseCompletionFeedback({ 
  quality, 
  onContinue, 
  autoRedirectMs = 4000 
}: ResponseCompletionFeedbackProps) {
  const [countdown, setCountdown] = useState(Math.ceil(autoRedirectMs / 1000));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in animation
    const fadeInTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(fadeInTimer);
      clearInterval(countdownInterval);
    };
  }, [onContinue]);

  return (
    <div className={cn(
      "fixed inset-0 bg-gradient-to-br from-hope-50/90 via-white/90 to-comfort-50/90 backdrop-blur-sm",
      "flex items-center justify-center p-4 z-50 transition-opacity duration-500",
      isVisible ? "opacity-100" : "opacity-0"
    )}>
      <Card className={cn(
        "bg-white/95 backdrop-blur border-comfort-200 shadow-2xl max-w-md w-full",
        "transform transition-all duration-500 ease-out",
        isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
      )}>
        <CardContent className="p-8 text-center space-y-6">
          {/* Large emoji with gentle animation */}
          <div className="text-6xl animate-gentle-pulse">
            {quality.emoji}
          </div>
          
          {/* Celebration message */}
          <div className="space-y-3">
            <h2 className="text-2xl font-gentle bg-gradient-to-r from-peace-800 to-comfort-700 bg-clip-text text-transparent">
              Response Saved!
            </h2>
            <p className="text-lg text-peace-700 font-compassionate leading-relaxed">
              {getCompletionMessage(quality)}
            </p>
          </div>

          {/* Quality indicator */}
          <div className="bg-gradient-to-r from-comfort-50/50 to-hope-50/50 rounded-lg p-4 border border-comfort-200/50">
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">{quality.emoji}</span>
              <span className="text-lg font-compassionate text-comfort-800 capitalize">
                {quality.tier === 'best' ? 'Exceptional' : 
                 quality.tier === 'better' ? 'Wonderful' : 'Beautiful'} response
              </span>
            </div>
          </div>

          {/* Continue button with countdown */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={onContinue}
              className="w-full bg-gradient-to-r from-hope-500 to-comfort-500 text-white hover:from-hope-600 hover:to-comfort-600 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              ✨ Continue to Dashboard
            </Button>
            
            <p className="text-xs text-peace-500 font-compassionate">
              Continuing automatically in {countdown} seconds...
            </p>
          </div>

          {/* Legacy reminder */}
          <div className="pt-4 border-t border-peace-200/50">
            <p className="text-sm text-peace-600 font-compassionate italic">
              💝 This precious memory is now part of your eternal legacy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}