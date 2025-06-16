'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Phase1Form, Phase1Preview } from '@/components/forms/Phase1Form';
import { Phase2Form, Phase2Preview } from '@/components/forms/Phase2Form';
import { ProgressBar } from '@/components/ui/form-components';
import { AnalysisProgress } from '@/components/ui/analysis-progress';
import {
  FormStep,
  Phase1FormData,
  Phase2FormData,
  CompleteAssessmentData,
  calculateProgress,
  saveFormData,
  loadFormData,
  clearFormData,
} from '@/lib/validation';

export const IntakeFlow: React.FC = () => {
  // Form state management
  const [currentStep, setCurrentStep] = useState<FormStep>(FormStep.PHASE_1);
  const [phase1Data, setPhase1Data] = useState<Phase1FormData | null>(null);
  const [phase2Data, setPhase2Data] = useState<Phase2FormData | null>(null);
  const [phase2Skipped, setPhase2Skipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved form data on mount
  useEffect(() => {
    const savedData = loadFormData();
    if (savedData) {
      // Restore form data from localStorage
      if (savedData.email && savedData.domain) {
        setPhase1Data(savedData as Phase1FormData);
        if (savedData.conversionRate || savedData.closeRate || savedData.averageOrderValue) {
          setPhase2Data(savedData as Phase2FormData);
          setCurrentStep(FormStep.PROCESSING);
        } else {
          setCurrentStep(FormStep.PHASE_2);
        }
      }
    }
  }, []);

  // Save form data whenever it changes
  useEffect(() => {
    if (phase1Data) {
      const combinedData: Partial<CompleteAssessmentData> = {
        ...phase1Data,
        ...phase2Data,
      };
      saveFormData(combinedData);
    }
  }, [phase1Data, phase2Data]);

  // Handle Phase 1 submission
  const handlePhase1Submit = async (data: Phase1FormData) => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setPhase1Data(data);
      setCurrentStep(FormStep.PHASE_2);
    } catch (error) {
      console.error('Phase 1 submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Phase 2 submission
  const handlePhase2Submit = async (data: Phase2FormData) => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setPhase2Data(data);
      setPhase2Skipped(false);
      setCurrentStep(FormStep.PROCESSING);
      
      // Start the assessment process
      await startAssessment();
    } catch (error) {
      console.error('Phase 2 submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Phase 2 skip
  const handlePhase2Skip = async () => {
    setPhase2Skipped(true);
    setCurrentStep(FormStep.PROCESSING);
    
    // Start the assessment process without conversion data
    await startAssessment();
  };

  // Start the assessment process
  const startAssessment = async () => {
    // The analysis will be handled by the AnalysisProgress component
    // This function is now just for setting up the processing step
    setIsLoading(false); // Let AnalysisProgress handle its own loading state
  };

  // Handle analysis completion
  const handleAnalysisComplete = () => {
    setCurrentStep(FormStep.LEAD_GATE);
  };

  // Handle analysis error
  const handleAnalysisError = (error: string) => {
    console.error('Analysis error:', error);
    // Could show error state or retry options
  };

  // Handle editing forms
  const handleEditPhase1 = () => {
    setCurrentStep(FormStep.PHASE_1);
  };

  const handleEditPhase2 = () => {
    setCurrentStep(FormStep.PHASE_2);
  };

  // Handle restart
  const handleRestart = () => {
    setPhase1Data(null);
    setPhase2Data(null);
    setPhase2Skipped(false);
    setCurrentStep(FormStep.PHASE_1);
    clearFormData();
  };

  // Calculate current progress
  const progress = calculateProgress(currentStep);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            SEO ROI Assessment
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Discover your SEO potential with our comprehensive analysis
          </p>
          
          {/* Progress Bar */}
          <div className="mb-2">
            <ProgressBar progress={progress} />
          </div>
          <p className="text-sm text-gray-500">
            {progress}% Complete
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Step Indicator */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <StepIndicator
                  step={1}
                  completed={phase1Data !== null}
                  current={currentStep === FormStep.PHASE_1}
                  label="Business Info"
                />
                <StepIndicator
                  step={2}
                  completed={phase2Data !== null || phase2Skipped}
                  current={currentStep === FormStep.PHASE_2}
                  label="Conversion Data"
                />
                <StepIndicator
                  step={3}
                  completed={currentStep === FormStep.RESULTS}
                  current={[FormStep.PROCESSING, FormStep.LEAD_GATE].includes(currentStep)}
                  label="Assessment"
                />
              </div>
              
              {currentStep !== FormStep.PHASE_1 && (
                <button
                  onClick={handleRestart}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Start Over
                </button>
              )}
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {currentStep === FormStep.PHASE_1 && (
              <Phase1Form
                onSubmit={handlePhase1Submit}
                defaultValues={phase1Data || undefined}
                isLoading={isLoading}
              />
            )}

            {currentStep === FormStep.PHASE_2 && (
              <div className="space-y-6">
                {phase1Data && (
                  <Phase1Preview data={phase1Data} onEdit={handleEditPhase1} />
                )}
                <Phase2Form
                  onSubmit={handlePhase2Submit}
                  onSkip={handlePhase2Skip}
                  defaultValues={phase2Data || undefined}
                  isLoading={isLoading}
                />
              </div>
            )}

            {currentStep === FormStep.PROCESSING && phase1Data && (
              <div className="space-y-6">
                <Phase1Preview data={phase1Data} onEdit={handleEditPhase1} />
                <Phase2Preview 
                  data={phase2Data || {}} 
                  onEdit={handleEditPhase2}
                  skipped={phase2Skipped}
                />
                <AnalysisProgress
                  domain={phase1Data.domain}
                  companyName={phase1Data.companyName}
                  targetKeywords={phase1Data.targetKeywords}
                  onComplete={handleAnalysisComplete}
                  onError={handleAnalysisError}
                />
              </div>
            )}

            {currentStep === FormStep.LEAD_GATE && (
              <div className="space-y-6">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Assessment Complete!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Your SEO analysis is ready. We&apos;ll implement the lead gate here to collect
                    contact information before showing the results.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Next:</strong> Lead gate form will be implemented in the next task
                      to collect final contact details before showing the comprehensive report.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Powered by The SEO Show • Secure & Confidential</p>
        </div>
      </div>
    </div>
  );
};

// Step Indicator Component
interface StepIndicatorProps {
  step: number;
  completed: boolean;
  current: boolean;
  label: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  step,
  completed,
  current,
  label,
}) => {
  return (
    <div className="flex items-center">
      <div className={`
        flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
        ${completed 
          ? 'bg-green-100 text-green-800' 
          : current 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-500'
        }
      `}>
        {completed ? <CheckCircle className="h-4 w-4" /> : step}
      </div>
      <span className={`
        ml-2 text-sm font-medium
        ${current ? 'text-blue-600' : completed ? 'text-green-600' : 'text-gray-500'}
      `}>
        {label}
      </span>
    </div>
  );
};

 