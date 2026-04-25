import React from 'react';
import Icon from '@/components/ui/AppIcon';

interface StepProgressProps {
  currentStep: number;
  steps: { label: string; sublabel: string }[];
}

const STEP_ICONS = ['TagIcon', 'UserIcon', 'ClipboardDocumentListIcon', 'DevicePhoneMobileIcon'];

export default function StepProgress({ currentStep, steps }: StepProgressProps) {
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          return (
            <div
              key={`step-indicator-${stepNum}`}
              className="flex flex-col items-center gap-1.5 flex-1"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-accent text-white shadow-sm'
                    : isActive
                    ? 'bg-primary text-white shadow-md ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <Icon name="CheckIcon" size={16} />
                ) : (
                  <Icon name={STEP_ICONS[index] as 'TagIcon'} size={16} />
                )}
              </div>
              <div className="text-center hidden sm:block">
                <p
                  className={`text-xs font-semibold ${
                    isActive ? 'text-primary' : isCompleted ? 'text-accent' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.sublabel}</p>
              </div>
              {/* Mobile: show only step number */}
              <p className={`text-xs font-medium sm:hidden ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {stepNum}
              </p>
            </div>
          );
        })}
      </div>

      {/* Current step label */}
      <p className="text-center text-sm font-medium text-muted-foreground mt-4">
        Étape <span className="text-primary font-semibold">{currentStep}</span> sur {steps.length}
        {' — '}
        <span className="text-foreground">{steps[currentStep - 1]?.sublabel}</span>
      </p>
    </div>
  );
}