import { handleInterviewComplete, getInterviewSession } from "@/actions/interview-session";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { sessionId, transcript, messages } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Handle interview completion (generate feedback, update session)
    const feedback = await handleInterviewComplete(sessionId, transcript, messages);

    // Get updated session
    const { session, analytics } = await getInterviewSession(sessionId);

    return NextResponse.json({ 
      success: true,
      session: session,
      feedback: feedback,
      analytics: analytics
    });
  } catch (error) {
    console.error("Interview completion error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process interview completion" },
      { status: 500 }
    );
  }
}