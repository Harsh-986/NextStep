import React from 'react';
import { redirect } from 'next/navigation';
import { getUserOnboardingStatus } from '@/actions/user';
import { getInterviewSession } from '@/actions/interview-session';
import SessionDetailClient from './_components/session-detail-client';

const SessionDetailPage = async ({ params }) => {
  const { isOnboarded } = await getUserOnboardingStatus();
  if (!isOnboarded) redirect("/onboarding");

  const { id } = await params;
  
  try {
    const { session, analytics } = await getInterviewSession(id);
    
    return (
      <div className="container mx-auto">
        <SessionDetailClient 
          session={session}
          analytics={analytics}
        />
      </div>
    );
  } catch (error) {
    console.error("Error fetching session:", error);
    redirect("/interview");
  }
};

export default SessionDetailPage;