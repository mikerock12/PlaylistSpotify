import React from 'react';
import { ListMusic, SlidersHorizontal, ListPlus, Check } from 'lucide-react';

export type AppStep = 'input' | 'review' | 'create' | 'success';

interface StepIndicatorProps {
  currentStep: AppStep;
  onStepClick?: (step: AppStep) => void;
  canNavigateToReview: boolean;
  canNavigateToCreate: boolean;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onStepClick,
  canNavigateToReview,
  canNavigateToCreate,
}) => {
  const steps: Array<{ id: AppStep; label: string; number: number; icon: React.ReactNode; enabled: boolean }> = [
    {
      id: 'input',
      label: '1. Inserir Músicas',
      number: 1,
      icon: <ListMusic size={16} />,
      enabled: true,
    },
    {
      id: 'review',
      label: '2. Revisar Versões & Ambiguidade',
      number: 2,
      icon: <SlidersHorizontal size={16} />,
      enabled: canNavigateToReview,
    },
    {
      id: 'create',
      label: '3. Criar Playlist',
      number: 3,
      icon: <ListPlus size={16} />,
      enabled: canNavigateToCreate,
    },
  ];

  const getStepStatus = (stepId: AppStep, index: number) => {
    const stepOrder: AppStep[] = ['input', 'review', 'create', 'success'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (stepId === currentStep) return 'active';
    if (currentIndex > index) return 'completed';
    return 'disabled';
  };

  return (
    <div className="step-indicator-container">
      <div className="step-indicator-bar">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.id, idx);
          const isClickable = step.enabled && onStepClick && status !== 'disabled';

          return (
            <React.Fragment key={step.id}>
              <div
                className={`step-item ${status} ${isClickable ? 'clickable' : ''}`}
                onClick={() => isClickable && onStepClick(step.id)}
              >
                <div className="step-circle">
                  {status === 'completed' ? (
                    <Check size={14} className="step-check" />
                  ) : (
                    <span className="step-num">{step.number}</span>
                  )}
                </div>
                <div className="step-info">
                  <span className="step-label">{step.label}</span>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`step-connector ${
                    getStepStatus(steps[idx + 1].id, idx + 1) !== 'disabled' ? 'filled' : ''
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
