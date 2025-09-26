import React from 'react';
import { getUserOnboardingStatus } from '@/actions/user';
import { redirect } from 'next/navigation';
import { getInterviewSessions, createInterviewSession, startInterviewWithQuestions } from '@/actions/interview-session';
import InterviewClient from './_components/interview-client';

const InterviewPage = async () => {
  const { isOnboarded } = await getUserOnboardingStatus();
  if (!isOnboarded) redirect("/onboarding");

  const sessions = await getInterviewSessions();

  return (
    <div className="container mx-auto">
      <InterviewClient 
        sessions={sessions}
      />
    </div>
  );
};

export default InterviewPage;