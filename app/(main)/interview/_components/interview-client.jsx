"use client"

import React, { useState } from 'react';
import InterviewDashboard from './interview-dashboard';
import InterviewSetup from './interview-setup';
import InterviewSession from './interview-session';
import { toast } from 'sonner';
import useFetch from '@/hooks/use-fetch';
import { useUser } from '@clerk/nextjs';

const InterviewClient = ({ 
  sessions: initialSessions = [], 
  onCreateSession, 
  onStartInterview 
}) => {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'setup', 'interview'
  const [sessions, setSessions] = useState(initialSessions);
  const [currentSession, setCurrentSession] = useState(null);
  const [callData, setCallData] = useState(null);
  const { user } = useUser();

  const {
    loading: creatingSession,
    fn: createSession
  } = useFetch(onCreateSession);

  const {
    loading: startingInterview,
    fn: startInterview
  } = useFetch(onStartInterview);

  const handleCreateSession = async (sessionData) => {
    try {
      const newSession = await createSession(sessionData);
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setView('setup-complete');
      return newSession;
    } catch (error) {
      toast.error('Failed to create interview session');
      throw error;
    }
  };

  const handleStartInterview = async (sessionId) => {
    try {
      const result = await startInterview(sessionId);
      setCallData(result);
      setCurrentSession(result.session);
      setView('interview');
      return result;
    } catch (error) {
      toast.error('Failed to start interview');
      throw error;
    }
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setCurrentSession(null);
    setCallData(null);
  };

  const handleSessionComplete = (updatedSession) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === updatedSession.id ? updatedSession : session
      )
    );
    setView('dashboard');
    setCurrentSession(null);
    setCallData(null);
  };

  switch (view) {
    case 'setup':
      return (
        <InterviewSetup
          user={user}
          onSessionCreate={handleCreateSession}
          onCancel={handleBackToDashboard}
          isLoading={creatingSession}
        />
      );

    case 'interview':
      return (
        <InterviewSession
          session={currentSession}
          callData={callData}
          onComplete={handleSessionComplete}
          onCancel={handleBackToDashboard}
        />
      );

    case 'setup-complete':
      return (
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg 
                className="w-8 h-8 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">Interview Ready!</h2>
              <p className="text-muted-foreground mb-2">
                Your interview session has been created with {currentSession?.questions?.length || 8} personalized questions.
              </p>
              <div className="text-sm text-muted-foreground mb-6">
                <p>• {currentSession?.role} position</p>
                <p>• {currentSession?.difficulty} difficulty level</p>
                <p>• {currentSession?.duration} minutes duration</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleStartInterview(currentSession.id)}
                disabled={startingInterview}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {startingInterview ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting Interview...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Start Interview
                  </>
                )}
              </button>
              
              <button
                onClick={handleBackToDashboard}
                className="px-6 py-3 border border-border rounded-md hover:bg-muted"
              >
                Back to Dashboard
              </button>
            </div>

            {/* Preview Questions */}
            {currentSession?.questions && currentSession.questions.length > 0 && (
              <div className="mt-8 p-4 border rounded-lg bg-muted/20">
                <h3 className="font-medium mb-3">Interview Questions Preview:</h3>
                <div className="text-sm space-y-1 text-left">
                  {currentSession.questions.slice(0, 3).map((q, i) => (
                    <p key={i} className="text-muted-foreground">
                      {i + 1}. {q.question}
                    </p>
                  ))}
                  {currentSession.questions.length > 3 && (
                    <p className="text-muted-foreground italic">
                      ... and {currentSession.questions.length - 3} more questions
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );

    default:
      return (
        <InterviewDashboard
          sessions={sessions}
          onStartInterview={handleStartInterview}
          onCreateSession={() => setView('setup')}
        />
      );
  }
};

export default InterviewClient;