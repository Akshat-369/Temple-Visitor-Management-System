import React from 'react';
import { CheckCircle, Circle, ChevronRight } from 'lucide-react';

interface Step {
  title: string;
  description: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
}

const StepIndicator: React.FC<Props> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200'
                    : isCurrent
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-200 scale-110'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
              </div>
              <p className={`text-xs mt-2 font-medium text-center max-w-[80px] ${
                isCurrent ? 'text-amber-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {step.title}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className="flex items-center mx-2 mb-6">
                <div className={`w-12 sm:w-20 h-0.5 transition-colors duration-300 ${
                  isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                }`} />
                <ChevronRight size={14} className={isCompleted ? 'text-emerald-400' : 'text-slate-300'} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
