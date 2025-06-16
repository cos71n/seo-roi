'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, Search, Globe, BarChart3, Brain, TrendingUp } from 'lucide-react';
import { ProgressBar } from './form-components';

// Analysis stages with detailed information
export interface AnalysisStage {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  estimatedDuration: number; // seconds
  status: 'pending' | 'active' | 'completed' | 'error';
  personalizedMessage?: string;
}

// Props for the AnalysisProgress component
interface AnalysisProgressProps {
  domain: string;
  companyName: string;
  targetKeywords: string[];
  onComplete?: () => void;
}

// Simulated competitor names for demo purposes
const DEMO_COMPETITORS = [
  'competitor1.com',
  'competitor2.com', 
  'competitor3.com',
  'topcompetitor.com',
  'leadingbrand.com'
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  domain,
  companyName,
  targetKeywords,
  onComplete,
}) => {
  // State management
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [discoveredCompetitors, setDiscoveredCompetitors] = useState<string[]>([]);
  const [isStalled, setIsStalled] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Create personalized analysis stages
  const [stages, setStages] = useState<AnalysisStage[]>([
    {
      id: 'domain-validation',
      title: 'Domain Validation & Setup',
      description: `Validating ${domain} and preparing analysis environment`,
      icon: Globe,
      estimatedDuration: 5,
      status: 'pending',
      personalizedMessage: `Setting up analysis for ${companyName}...`
    },
    {
      id: 'competitor-discovery',
      title: 'Competitor Discovery',
      description: `Identifying top competitors in your industry`,
      icon: Search,
      estimatedDuration: 10,
      status: 'pending',
      personalizedMessage: `Finding competitors for "${targetKeywords[0]}" and related keywords...`
    },
    {
      id: 'domain-authority',
      title: 'Domain Authority Analysis',
      description: `Analyzing ${domain} authority and backlink profile`,
      icon: TrendingUp,
      estimatedDuration: 15,
      status: 'pending',
      personalizedMessage: `Evaluating ${companyName}&apos;s domain strength and link profile...`
    },
    {
      id: 'keyword-analysis',
      title: 'Keyword Performance Analysis',
      description: `Analyzing ranking performance for ${targetKeywords.length} target keywords`,
      icon: BarChart3,
      estimatedDuration: 20,
      status: 'pending',
      personalizedMessage: `Checking rankings for "${targetKeywords.slice(0, 2).join('", "')}"${targetKeywords.length > 2 ? ` and ${targetKeywords.length - 2} more keywords` : ''}...`
    },
    {
      id: 'competitive-analysis',
      title: 'Competitive Gap Analysis',
      description: `Comparing performance against discovered competitors`,
      icon: Search,
      estimatedDuration: 15,
      status: 'pending',
      personalizedMessage: `Analyzing gaps between ${companyName} and competitors...`
    },
    {
      id: 'ai-visibility',
      title: 'AI Visibility Testing',
      description: `Testing visibility in AI search results`,
      icon: Brain,
      estimatedDuration: 10,
      status: 'pending',
      personalizedMessage: `Testing how ${companyName} appears in AI-powered search...`
    }
  ]);

  // Timer effect for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Process stage function
  const processStage = useCallback(async (stageIndex: number) => {
    if (stageIndex >= stages.length) {
      // All stages complete
      setOverallProgress(100);
      return;
    }

    const currentStage = stages[stageIndex];
    
    // Update stage to active
    setStages(prev => prev.map((stage, index) => ({
      ...stage,
      status: index === stageIndex ? 'active' : index < stageIndex ? 'completed' : 'pending'
    })));

    // Update overall progress
    const progressPerStage = 100 / stages.length;
    const stageProgress = (stageIndex * progressPerStage);
    setOverallProgress(stageProgress);

    // Calculate estimated time remaining
    const remainingStages = stages.slice(stageIndex);
    const remainingTime = remainingStages.reduce((total, stage) => total + stage.estimatedDuration, 0);
    setEstimatedTimeRemaining(remainingTime);

    // Simulate stage-specific processing
    await simulateStageProcessing(currentStage, stageIndex);

    // Mark stage as completed
    setStages(prev => prev.map((stage, index) => ({
      ...stage,
      status: index === stageIndex ? 'completed' : stage.status
    })));

    // Move to next stage
    setCurrentStageIndex(stageIndex + 1);
  }, [stages.length, companyName]);

  // Check if all stages are completed
  useEffect(() => {
    const allCompleted = stages.every(stage => stage.status === 'completed');
    if (allCompleted && stages.length > 0 && !hasCompleted) {
      console.log('All stages completed, triggering onComplete');
      setHasCompleted(true);
      onComplete?.();
    }
  }, [stages, onComplete, hasCompleted]);

  // Main processing effect
  useEffect(() => {
    if (currentStageIndex === 0) {
      // Start processing
      processStage(0);
    }
  }, []); // Only run once on mount

  // Process next stage when currentStageIndex changes
  useEffect(() => {
    if (currentStageIndex > 0 && currentStageIndex <= stages.length) {
      const timer = setTimeout(() => {
        processStage(currentStageIndex);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStageIndex, processStage, stages.length]);

  // Simulate stage-specific processing with realistic delays
  const simulateStageProcessing = async (stage: AnalysisStage, index: number) => {
    const duration = stage.estimatedDuration * 1000;
    const steps = 10; // Number of progress updates
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      
      // Update progress within the stage
      const progressPerStage = 100 / stages.length;
      const stageStartProgress = index * progressPerStage;
      const stageProgress = (i / steps) * progressPerStage;
      setOverallProgress(stageStartProgress + stageProgress);

      // Stage-specific updates
      if (stage.id === 'competitor-discovery' && i === 5) {
        // Simulate competitor discovery
        const competitors = DEMO_COMPETITORS.slice(0, 3 + Math.floor(Math.random() * 2));
        setDiscoveredCompetitors(competitors);
        
        // Update stage description with discovered competitors
        setStages(prev => prev.map(s => 
          s.id === 'competitor-discovery' 
            ? { ...s, description: `Found ${competitors.length} competitors: ${competitors.slice(0, 2).join(', ')}${competitors.length > 2 ? '...' : ''}` }
            : s.id === 'competitive-analysis'
            ? { ...s, description: `Comparing against ${competitors.length} competitors`, personalizedMessage: `Analyzing gaps between ${companyName} and ${competitors[0]}, ${competitors[1]}...` }
            : s
        ));
      }

      // Check for stalled processing (simulate slow API responses)
      if (timeElapsed > 60 && !isStalled) { // 1 minute
        setIsStalled(true);
      }
    }
  };



  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Header with personalized messaging */}
      <div className="text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-white animate-bounce" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analyzing {companyName}&apos;s SEO Performance
        </h2>
        <p className="text-gray-600 mb-4">
          Running comprehensive analysis for <span className="font-medium text-blue-600">{domain}</span>
        </p>
        
        {/* Overall progress */}
        <div className="max-w-md mx-auto mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <ProgressBar progress={overallProgress} className="h-3" />
        </div>

        {/* Time information */}
        <div className="flex justify-center items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Elapsed: {formatTime(timeElapsed)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Remaining: ~{formatTime(estimatedTimeRemaining)}</span>
          </div>
        </div>

        {/* Stalled message */}
        {isStalled && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-yellow-800">
              <strong>Analysis taking longer than expected.</strong><br />
              We&apos;re gathering comprehensive data from multiple sources. This ensures the most accurate results for {companyName}.
            </p>
          </div>
        )}
      </div>

      {/* Analysis Stages */}
      <div className="space-y-4">
        {stages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              className={`
                flex items-start gap-4 p-4 rounded-lg border transition-all duration-300
                ${stage.status === 'active' 
                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                  : stage.status === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
                }
              `}
            >
              {/* Stage Icon */}
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0
                ${stage.status === 'active'
                  ? 'bg-blue-100 text-blue-600'
                  : stage.status === 'completed'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-400'
                }
              `}>
                {stage.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : stage.status === 'active' ? (
                  <Icon className="h-5 w-5 animate-pulse" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Stage Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`
                    font-medium
                    ${stage.status === 'active' ? 'text-blue-900' : stage.status === 'completed' ? 'text-green-900' : 'text-gray-700'}
                  `}>
                    {stage.title}
                  </h3>
                  {stage.status === 'active' && (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
                <p className={`
                  text-sm mb-1
                  ${stage.status === 'active' ? 'text-blue-700' : stage.status === 'completed' ? 'text-green-700' : 'text-gray-600'}
                `}>
                  {stage.description}
                </p>
                {stage.personalizedMessage && (
                  <p className={`
                    text-xs italic
                    ${stage.status === 'active' ? 'text-blue-600' : stage.status === 'completed' ? 'text-green-600' : 'text-gray-500'}
                  `}>
                    {stage.personalizedMessage}
                  </p>
                )}
                
                {/* Show discovered competitors */}
                {stage.id === 'competitor-discovery' && discoveredCompetitors.length > 0 && stage.status === 'completed' && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {discoveredCompetitors.map((competitor, i) => (
                      <span key={i} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        {competitor}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom message */}
      <div className="text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-blue-800">
            <strong>Why does this take time?</strong><br />
            We&apos;re analyzing millions of data points from multiple SEO databases to give {companyName} the most accurate assessment possible.
          </p>
        </div>
      </div>
    </div>
  );
}; 