"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Create interview session with questions (matching PrepWise approach)
export async function createInterviewSession(sessionData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // Generate questions using same approach as PrepWise
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/vapi/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: sessionData.sessionType || "Mixed",
        role: sessionData.role,
        level: sessionData.difficulty || "Mid",
        techstack: sessionData.techStack || user.skills?.join(", ") || "",
        amount: sessionData.questionCount || 8,
        userid: user.id,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate questions");
    }

    const result = await response.json();

    // Create session in NextStep database
    const session = await db.interviewSession.create({
      data: {
        userId: user.id,
        sessionType: sessionData.sessionType || "mock",
        industry: sessionData.industry || user.industry,
        role: sessionData.role,
        difficulty: sessionData.difficulty || "intermediate",
        duration: sessionData.duration || 30,
        status: "SCHEDULED",
        // Store questions as they come from PrepWise API
        questions: result.questions ? result.questions.map(q => ({ question: q, type: "interview" })) : []
      },
    });

    return {
      ...session,
      prepwiseInterviewId: result.interviewId // Store reference to PrepWise interview
    };
  } catch (error) {
    console.error("Error creating interview session:", error);
    throw new Error("Failed to create interview session");
  }
}

// Generate questions using PrepWise's exact approach
export async function generateInterviewQuestions(sessionData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Use PrepWise's exact prompt format
  const prompt = `Prepare questions for a job interview.
    The job role is ${sessionData.role}.
    The job experience level is ${sessionData.difficulty || "Mid"}.
    The tech stack used in the job is: ${sessionData.techStack || user.skills?.join(", ") || ""}.
    The focus between behavioural and technical questions should lean towards: ${sessionData.sessionType || "Mixed"}.
    The amount of questions required is: ${sessionData.questionCount || 8}.
    Please return only the questions, without any additional text.
    The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
    Return the questions formatted like this:
    ["Question 1", "Question 2", "Question 3"]
    
    Thank you! <3`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error generating interview questions:", error);
    
    // Fallback questions
    return [
      "Tell me about yourself and your background.",
      `What interests you most about working as a ${sessionData.role}?`,
      "What are your greatest strengths?",
      "Describe a challenging project you worked on.",
      "How do you handle working under pressure?",
      "Where do you see yourself in 5 years?",
      "Why should we hire you for this position?",
      "Do you have any questions for us?"
    ];
  }
}

// Start interview using PrepWise's VAPI approach
export async function startInterviewWithQuestions(sessionId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const session = await db.interviewSession.findUnique({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) throw new Error("Interview session not found");

  try {
    // Extract questions from session (same format as PrepWise)
    const questions = session.questions.map(q => q.question);
    
    // Format questions exactly like PrepWise does
    const formattedQuestions = questions
      .map((question) => `- ${question}`)
      .join("\n");

    // Use PrepWise's exact VAPI assistant configuration
    const assistantConfig = {
      name: "AI Interviewer",
      firstMessage: `Hello! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience for the ${session.role} position at ${session.difficulty} level.`,
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en",
      },
      voice: {
        provider: "11labs",
        voiceId: "sarah",
        stability: 0.4,
        similarityBoost: 0.8,
        speed: 0.9,
        style: 0.5,
        useSpeakerBoost: true,
      },
      model: {
        provider: "openai",
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the ${session.role} role at ${session.difficulty} level.

Interview Context:
- Position: ${session.role}
- Level: ${session.difficulty}
- Tech Stack: ${session.industry}

Interview Guidelines:
Focus on the structured question flow:
${formattedQuestions}

Engage naturally & react appropriately:
- Listen actively to responses and acknowledge them before moving forward.
- Ask brief follow-up questions if a response is vague or requires more detail.
- Keep the conversation flowing smoothly while maintaining control.
- Since we know they're applying for ${session.role} at ${session.difficulty} level, dive straight into relevant questions.

Be professional, yet warm and welcoming:
- Use official yet friendly language.
- Keep responses concise and to the point (like in a real voice interview).
- Avoid robotic phrasing—sound natural and conversational.
- Show genuine interest in the candidate's responses.

Conclude the interview properly:
- Thank the candidate for their time.
- Inform them that the company will reach out soon with feedback.
- End the conversation on a polite and positive note.

Important Notes:
- Be sure to be professional and polite.
- Keep all your responses short and simple. Use official language, but be kind and welcoming.
- This is a voice conversation, so keep your responses short, like in a real conversation. Don't ramble for too long.
- Do not include any special characters in your responses - this is a voice conversation.
- Focus on interviewing for the specific ${session.role} position at ${session.difficulty} level.`,
          },
        ],
      },
    };

    // Update session status
    const updatedSession = await db.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date()
      },
    });

    return {
      session: updatedSession,
      assistantConfig: assistantConfig, // Return config for VAPI
      questions: questions
    };
  } catch (error) {
    console.error("Error starting interview:", error);
    
    // Update session status to failed
    await db.interviewSession.update({
      where: { id: sessionId },
      data: { status: "FAILED" }
    });
    
    throw new Error("Failed to start interview");
  }
}

// Generate feedback using PrepWise's exact approach
export async function generateFeedbackFromTranscript(sessionId, transcript, messages) {
  try {
    const session = await db.interviewSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (!session) return;

    // Format transcript like PrepWise does
    const formattedTranscript = messages
      .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
      .join("");

    // Use PrepWise's exact feedback schema and prompt
    const prompt = `You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        
Transcript:
${formattedTranscript}

Please score the candidate from 0 to 100 in the following areas. Return the response in this JSON format:
{
  "totalScore": 85,
  "categoryScores": [
    {
      "name": "Communication Skills",
      "score": 85,
      "comment": "Clear articulation and structured responses"
    },
    {
      "name": "Technical Knowledge",
      "score": 80,
      "comment": "Good understanding of core concepts"
    },
    {
      "name": "Problem Solving",
      "score": 90,
      "comment": "Excellent analytical approach"
    },
    {
      "name": "Cultural Fit",
      "score": 85,
      "comment": "Good alignment with values"
    },
    {
      "name": "Confidence and Clarity",
      "score": 80,
      "comment": "Confident delivery with room for improvement"
    }
  ],
  "strengths": ["Clear communication", "Good technical knowledge"],
  "areasForImprovement": ["More specific examples", "Better confidence"],
  "finalAssessment": "Overall strong performance with areas to develop..."
}

Score categories: Communication Skills, Technical Knowledge, Problem-Solving, Cultural & Role Fit, and Confidence & Clarity.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const feedback = JSON.parse(cleanedText);

    // Update session with PrepWise-style feedback
    await db.interviewSession.update({
      where: { id: sessionId },
      data: {
        overallScore: feedback.totalScore,
        technicalScore: feedback.categoryScores.find(c => c.name === "Technical Knowledge")?.score,
        communicationScore: feedback.categoryScores.find(c => c.name === "Communication Skills")?.score,
        confidenceScore: feedback.categoryScores.find(c => c.name === "Confidence and Clarity")?.score,
        strengths: feedback.strengths,
        weaknesses: feedback.areasForImprovement,
        detailedFeedback: feedback.finalAssessment,
        status: "COMPLETED",
        endedAt: new Date()
      }
    });

    return feedback;
  } catch (error) {
    console.error("Error generating feedback:", error);
  }
}

// Handle "call end" event like PrepWise does
export async function handleInterviewComplete(sessionId, transcript, messages) {
  try {
    // Store transcript
    await db.callAnalytics.upsert({
      where: { sessionId: sessionId },
      update: {
        transcript: transcript,
        endedAt: new Date()
      },
      create: {
        userId: session.userId,
        sessionId: sessionId,
        callId: `session-${sessionId}`,
        transcript: transcript,
        endedAt: new Date()
      }
    });

    // Generate feedback (PrepWise style)
    const feedback = await generateFeedbackFromTranscript(sessionId, transcript, messages);
    
    return feedback;
  } catch (error) {
    console.error("Error handling interview completion:", error);
    throw error;
  }
}

// Get user's interview sessions
export async function getInterviewSessions() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.interviewSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });
}

// Get specific interview session with feedback
export async function getInterviewSession(sessionId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const session = await db.interviewSession.findUnique({
    where: { id: sessionId, userId: user.id }
  });

  if (!session) throw new Error("Interview session not found");

  // Get transcript if available
  const analytics = await db.callAnalytics.findUnique({
    where: { sessionId: sessionId }
  });

  return { session, analytics };
}