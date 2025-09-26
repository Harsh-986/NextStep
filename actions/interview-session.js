"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Create interview session with questions (server-side generation)
export async function createInterviewSession(sessionData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  try {
    console.log("DEBUG: createInterviewSession called", { sessionData, userId });

    // Generate questions server-side (direct function call)
    let result;
    try {
      const questionsArray = await generateInterviewQuestions({
        role: sessionData.role,
        difficulty: sessionData.difficulty,
        techStack: sessionData.techStack,
        sessionType: sessionData.sessionType,
        questionCount: sessionData.questionCount,
      });

      result = { questions: Array.isArray(questionsArray) ? questionsArray : [], interviewId: `prepwise-${Date.now()}` };
      console.log("DEBUG: generated questions directly:", result);
    } catch (genErr) {
      console.error("Question generation failed (direct):", genErr);
      const fallback = [
        "Tell me about yourself and your background.",
        `What interests you most about working as a ${sessionData.role}?`,
        "What are your greatest strengths?",
        "Describe a challenging project you worked on.",
        "How do you handle working under pressure?",
        "Where do you see yourself in 5 years?",
        "Why should we hire you for this position?",
        "Do you have any questions for us?"
      ];
      result = { questions: fallback, interviewId: `prepwise-fallback-${Date.now()}` };
      console.log("DEBUG: Using fallback questions:", result);
    }

    const questionsJson = Array.isArray(result.questions) ? result.questions : [];

    const session = await db.interviewSession.create({
      data: {
        userId: user.id,
        sessionType: sessionData.sessionType || "mock",
        industry: sessionData.industry || user.industry,
        role: sessionData.role,
        difficulty: sessionData.difficulty || "intermediate",
        duration: sessionData.duration || 30,
        status: "SCHEDULED",
        questions: questionsJson,
      },
    });

    console.log("DEBUG: Session saved in DB:", session);

    const toReturn = { ...session, prepwiseInterviewId: result.interviewId };
    console.log("DEBUG: Returning to client:", toReturn);
    return toReturn;
  } catch (error) {
    console.error("Error creating interview session:", error?.message ?? error, error?.stack ?? "");
    throw error;
  }
}

// Generate questions using Gemini model
export async function generateInterviewQuestions(sessionData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const prompt = `Prepare questions for a job interview.
    The job role is ${sessionData.role}.
    The job experience level is ${sessionData.difficulty || "Mid"}.
    The tech stack used in the job is: ${sessionData.techStack || user.skills?.join(", ") || ""}.
    The focus between behavioural and technical questions should lean towards: ${sessionData.sessionType || "Mixed"}.
    The amount of questions required is: ${sessionData.questionCount || 4}.
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

// Start interview using VAPI-style assistant config
export async function startInterviewWithQuestions(sessionId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const session = await db.interviewSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) {
    console.error("startInterviewWithQuestions: session not found", { sessionId, userId });
    throw new Error("Interview session not found");
  }

  try {
    console.log("DEBUG: startInterviewWithQuestions called for session:", sessionId);

    const questions = Array.isArray(session.questions)
      ? session.questions.map(q => (typeof q === "string" ? q : (q.question || q.text || "")))
      : [];

    const formattedQuestions = questions.map(q => `- ${q}`).join("\n");

    const assistantConfig = {
      name: "AI Interviewer",
      firstMessage: `Hello! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience for the ${session.role} position.`,
      transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
      voice: {
        provider: "11labs",
        voiceId: "sarah",
        stability: 0.4,
        similarityBoost: 0.8,
        speed: 0.9,
        style: 0.5,
        useSpeakerBoost: true
      },
      model: {
        provider: "openai",
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a professional job interviewer conducting a real-time voice interview with a candidate.
Interview Context:
- Position: ${session.role}
- Level: ${session.difficulty || "unspecified"}

Interview Guidelines:
Focus on the structured question flow:
${formattedQuestions}
Be professional, yet warm. Keep answers brief, ask follow-ups when needed.`
          }
        ]
      }
    };

    const updatedSession = await db.interviewSession.update({
      where: { id: sessionId },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    console.log("DEBUG: startInterviewWithQuestions returning assistantConfig and updated session", { sessionId, updatedSessionId: updatedSession.id });

    return { session: updatedSession, assistantConfig, questions };
  } catch (error) {
    console.error("Error starting interview:", error);
    await db.interviewSession.update({ where: { id: sessionId }, data: { status: "FAILED" } }).catch(e => console.error("Failed to set session FAILED:", e));
    throw error;
  }
}

// Generate feedback from transcript (kept as before)
// Generate feedback using PrepWise's exact approach (robust parsing)
export async function generateFeedbackFromTranscript(sessionId, transcript, messages) {
  try {
    const session = await db.interviewSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });
    if (!session) return null;

    const formattedTranscript = messages
      .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
      .join("");

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

Score categories: Communication Skills, Technical Knowledge, Problem-Solving, Cultural & Role Fit, and Confidence & Clarity.

IMPORTANT: Return ONLY valid JSON and nothing else.
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    let feedback = null;

    // 1) try direct parse
    try {
      feedback = JSON.parse(cleanedText);
    } catch (e1) {
      console.warn("generateFeedbackFromTranscript: direct JSON.parse failed:", e1?.message);

      // 2) try to extract JSON object substring
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          feedback = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.warn("generateFeedbackFromTranscript: extracted JSON parse failed:", e2?.message);
          feedback = null;
        }
      }
    }

    if (!feedback) {
      // Could not parse structured JSON. Save raw assistant output into detailedFeedback and mark as COMPLETED.
      console.warn("generateFeedbackFromTranscript: Could not parse JSON. Saving raw assistant output into detailedFeedback.");
      await db.interviewSession.update({
        where: { id: sessionId },
        data: {
          detailedFeedback: cleanedText,
          status: "COMPLETED",
          endedAt: new Date()
        }
      });
      return null;
    }

    // If parsed, update interviewSession with category scores and details
    await db.interviewSession.update({
      where: { id: sessionId },
      data: {
        overallScore: feedback.totalScore ?? null,
        technicalScore: feedback.categoryScores?.find(c => c.name === "Technical Knowledge")?.score ?? null,
        communicationScore: feedback.categoryScores?.find(c => c.name === "Communication Skills")?.score ?? null,
        confidenceScore: feedback.categoryScores?.find(c => c.name === "Confidence and Clarity")?.score ?? null,
        strengths: feedback.strengths ?? [],
        weaknesses: feedback.areasForImprovement ?? [],
        detailedFeedback: feedback.finalAssessment ?? cleanedText,
        status: "COMPLETED",
        endedAt: new Date()
      }
    });

    console.log("generateFeedbackFromTranscript: updated session with feedback", { sessionId, totalScore: feedback.totalScore });

    return feedback;
  } catch (error) {
    console.error("Error generating feedback:", error);
    // best-effort: mark session FAILED so you can inspect it, or keep IN_PROGRESS depending on your policy
    await db.interviewSession.update({
      where: { id: sessionId },
      data: { status: "FAILED", endedAt: new Date() }
    }).catch(e => console.error("Failed to set session FAILED:", e));
    return null;
  }
}


// actions/interview-session.js (server)
// server: actions/interview-session.js
export async function handleInterviewComplete(sessionId, transcript = "", messages = []) {
  try {
    console.log("handleInterviewComplete: called", { sessionId, transcriptLength: transcript?.length ?? 0, messagesCount: messages?.length ?? 0 });

    // ensure session exists
    const session = await db.interviewSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      console.error("handleInterviewComplete: session not found", { sessionId });
      throw new Error("Session not found");
    }
    console.log("handleInterviewComplete: found session", { id: session.id, userId: session.userId });

    // upsert call analytics (wrap in try/catch)
    try {
      const upsertRes = await db.callAnalytics.upsert({
        where: { sessionId: sessionId },
        update: {
          transcript,
          endedAt: new Date()
        },
        create: {
          userId: session.userId,
          sessionId,
          transcript,
          endedAt: new Date()
        }
      });
      console.log("handleInterviewComplete: callAnalytics upsert result:", upsertRes);
    } catch (upsertErr) {
      console.error("handleInterviewComplete: callAnalytics upsert failed:", upsertErr);
      // don't throw yet — we still may want to attempt feedback generation
    }

    // generate feedback (this function should also update interviewSession to COMPLETED)
    let feedback = null;
    try {
      feedback = await generateFeedbackFromTranscript(sessionId, transcript, messages);
      console.log("handleInterviewComplete: generateFeedbackFromTranscript returned:", !!feedback);
    } catch (feedbackErr) {
      console.error("handleInterviewComplete: generateFeedbackFromTranscript failed:", feedbackErr);
      // continue to return updated session if possible
    }

    // re-read updated session from DB (important)
    const updatedSession = await db.interviewSession.findUnique({ where: { id: sessionId } });
    console.log("handleInterviewComplete: returning updated session:", {
      id: updatedSession?.id,
      status: updatedSession?.status,
      overallScore: updatedSession?.overallScore ?? null
    });

    return { session: updatedSession, feedback };
  } catch (err) {
    console.error("handleInterviewComplete: fatal error:", err);
    throw err;
  }
}


export async function getInterviewSessions() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");
  return await db.interviewSession.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
}

export async function getInterviewSession(sessionId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const session = await db.interviewSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) throw new Error("Interview session not found");

  const analytics = await db.callAnalytics.findUnique({ where: { sessionId } });
  return { session, analytics };
}
