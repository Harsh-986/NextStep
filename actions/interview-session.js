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

// FIXED: Generate feedback using PrepWise's exact approach (robust parsing)
// server-side: replace generateFeedbackFromTranscript with this version
export async function generateFeedbackFromTranscript(sessionId, transcript, messages) {
  try {
    console.log("generateFeedbackFromTranscript: Starting", { sessionId, transcriptLength: transcript?.length, messagesCount: messages?.length });

    const session = await db.interviewSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });
    if (!session) {
      console.error("generateFeedbackFromTranscript: Session not found", { sessionId });
      return null;
    }

    // Build a reliable formattedTranscript from messages first (preferred)
    let formattedTranscript = "";
    if (messages && Array.isArray(messages) && messages.length > 0) {
      formattedTranscript = messages
        .filter(m => m && (m.content || m.text || m.transcript || typeof m === "string"))
        .map(m => {
          if (typeof m === "string") return `User: ${m}`;
          const content = m.content || m.text || m.transcript || "";
          const role = m.role || (m.type === "transcript" ? "User" : (m.role || "System"));
          return `${role}: ${content}`;
        })
        .join("\n");
    } else if (transcript && transcript.length > 0) {
      formattedTranscript = transcript;
    } else {
      formattedTranscript = "";
    }

    console.log("generateFeedbackFromTranscript: Formatted transcript length:", formattedTranscript.length);

    // Save raw transcript to call analytics for debugging (non-blocking)
    try {
      await db.callAnalytics.upsert({
        where: { sessionId },
        update: { transcript: formattedTranscript || "No transcript", endedAt: new Date() },
        create: { userId: session.userId, sessionId, transcript: formattedTranscript || "No transcript", endedAt: new Date() }
      });
    } catch (analyticsErr) {
      console.warn("generateFeedbackFromTranscript: failed to upsert analytics", analyticsErr);
    }

    // If no transcript, immediately write a deterministic fallback and return that
    if (!formattedTranscript || formattedTranscript.trim().length < 10) {
      const fallbackFeedback = {
        totalScore: 50,
        categoryScores: [
          { name: "Communication Skills", score: 50, comment: "No transcript provided" },
          { name: "Technical Knowledge", score: 50, comment: "No transcript provided" },
          { name: "Problem Solving", score: 50, comment: "No transcript provided" },
          { name: "Cultural Fit", score: 50, comment: "No transcript provided" },
          { name: "Confidence and Clarity", score: 50, comment: "No transcript provided" }
        ],
        strengths: [],
        areasForImprovement: ["Transcript not available"],
        finalAssessment: "No transcript was provided for analysis. Please provide the interview transcript to assess the candidate's performance."
      };

      // update DB so fields are not null
      await db.interviewSession.update({
        where: { id: sessionId },
        data: {
          overallScore: fallbackFeedback.totalScore,
          technicalScore: fallbackFeedback.categoryScores.find(c => c.name === "Technical Knowledge")?.score ?? 50,
          communicationScore: fallbackFeedback.categoryScores.find(c => c.name === "Communication Skills")?.score ?? 50,
          confidenceScore: fallbackFeedback.categoryScores.find(c => c.name === "Confidence and Clarity")?.score ?? 50,
          strengths: fallbackFeedback.strengths,
          weaknesses: fallbackFeedback.areasForImprovement,
          detailedFeedback: fallbackFeedback.finalAssessment,
          status: "COMPLETED",
          endedAt: new Date()
        }
      });

      console.log("generateFeedbackFromTranscript: No transcript - wrote fallback feedback");
      return fallbackFeedback;
    }

    // Build the robust prompt for Gemini (keep it deterministic for debugging)
    const prompt = `You are an AI interviewer analyzing a mock interview. Evaluate the candidate's performance based on the transcript below.
TRANSCRIPT:
${formattedTranscript}

INSTRUCTIONS:
- Provide scores 0-100 for each category listed below.
- Return ONLY valid JSON (no extra text) in the exact format:
{
  "totalScore": number,
  "categoryScores": [
    {"name":"Communication Skills","score":number,"comment":"..."},
    {"name":"Technical Knowledge","score":number,"comment":"..."},
    {"name":"Problem Solving","score":number,"comment":"..."},
    {"name":"Cultural Fit","score":number,"comment":"..."},
    {"name":"Confidence and Clarity","score":number,"comment":"..."}
  ],
  "strengths": ["..."],
  "areasForImprovement": ["..."],
  "finalAssessment": "..."
}
Be concise and return valid JSON only.`;

    // call model
    let modelResponseText = "";
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      modelResponseText = response.text();
      console.log("generateFeedbackFromTranscript: Raw AI response (first 1000 chars):", modelResponseText.substring(0, 1000));
    } catch (modelErr) {
      console.error("generateFeedbackFromTranscript: model.generateContent failed:", modelErr);
      // Save a record of the model error to DB (non-fatal)
      try {
        await db.callAnalytics.updateMany({
          where: { sessionId },
          data: { metadata: { ...(session.metadata || {}), modelError: String(modelErr) } }
        });
      } catch (uerr) { console.warn("Failed to save model error", uerr); }
      // fall back to deterministic fallback
      const fallback = {
        totalScore: 60,
        categoryScores: [
          { name: "Communication Skills", score: 60, comment: "Could not generate detailed feedback due to model error" },
          { name: "Technical Knowledge", score: 60, comment: "Could not generate detailed feedback due to model error" },
          { name: "Problem Solving", score: 60, comment: "Could not generate detailed feedback due to model error" },
          { name: "Cultural Fit", score: 60, comment: "Could not generate detailed feedback due to model error" },
          { name: "Confidence and Clarity", score: 60, comment: "Could not generate detailed feedback due to model error" }
        ],
        strengths: [],
        areasForImprovement: ["Feedback generation failed"],
        finalAssessment: "Feedback generation encountered an error. Please retry."
      };
      await db.interviewSession.update({
        where: { id: sessionId },
        data: {
          overallScore: fallback.totalScore,
          technicalScore: fallback.categoryScores.find(c => c.name === "Technical Knowledge")?.score ?? 60,
          communicationScore: fallback.categoryScores.find(c => c.name === "Communication Skills")?.score ?? 60,
          confidenceScore: fallback.categoryScores.find(c => c.name === "Confidence and Clarity")?.score ?? 60,
          strengths: fallback.strengths,
          weaknesses: fallback.areasForImprovement,
          detailedFeedback: fallback.finalAssessment,
          status: "COMPLETED",
          endedAt: new Date()
        }
      });
      return fallback;
    }

    // Clean and extract JSON from modelResponseText
    let cleanedText = (modelResponseText || "").trim();
    cleanedText = cleanedText.replace(/```(?:json)?\n?/g, "").trim();

    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    }

    // Attempt parse
    let feedback = null;
    try {
      feedback = JSON.parse(cleanedText);
      console.log("generateFeedbackFromTranscript: Parsed feedback JSON successfully");
    } catch (parseErr) {
      console.error("generateFeedbackFromTranscript: JSON parse failed:", parseErr, "cleanedText:", cleanedText.substring(0, 1000));
      // Attempt lightweight heuristics: extract any numeric totals with regex
      const numMatch = cleanedText.match(/(\d{1,3})\s*\/\s*100/); // e.g. "85/100"
      let totalGuess = null;
      if (numMatch) totalGuess = Number(numMatch[1]);
      else {
        const digits = cleanedText.match(/(\b\d{1,3}\b)/);
        if (digits) totalGuess = Number(digits[1]);
      }

      feedback = {
        totalScore: Number.isFinite(totalGuess) ? Math.max(0, Math.min(100, Math.round(totalGuess))) : 75,
        categoryScores: [
          { name: "Communication Skills", score: 75, comment: "Auto-generated fallback" },
          { name: "Technical Knowledge", score: 75, comment: "Auto-generated fallback" },
          { name: "Problem Solving", score: 75, comment: "Auto-generated fallback" },
          { name: "Cultural Fit", score: 75, comment: "Auto-generated fallback" },
          { name: "Confidence and Clarity", score: 75, comment: "Auto-generated fallback" }
        ],
        strengths: [],
        areasForImprovement: ["Could not parse model JSON; using fallback values"],
        finalAssessment: cleanedText.substring(0, 1000)
      };
    }

    // Ensure structure
    if (!feedback.totalScore) feedback.totalScore = 75;
    if (!Array.isArray(feedback.categoryScores) || feedback.categoryScores.length === 0) {
      feedback.categoryScores = [
        { name: "Communication Skills", score: feedback.totalScore, comment: "Auto" },
        { name: "Technical Knowledge", score: feedback.totalScore, comment: "Auto" },
        { name: "Problem Solving", score: feedback.totalScore, comment: "Auto" },
        { name: "Cultural Fit", score: feedback.totalScore, comment: "Auto" },
        { name: "Confidence and Clarity", score: feedback.totalScore, comment: "Auto" }
      ];
    }
    if (!Array.isArray(feedback.strengths)) feedback.strengths = [];
    if (!Array.isArray(feedback.areasForImprovement)) feedback.areasForImprovement = [];

    // Persist to DB with deterministic fields (no nulls)
    const updateData = {
      overallScore: Math.round(feedback.totalScore) || 75,
      technicalScore: Math.round(feedback.categoryScores.find(c => c.name === "Technical Knowledge")?.score) || 50,
      communicationScore: Math.round(feedback.categoryScores.find(c => c.name === "Communication Skills")?.score) || 50,
      confidenceScore: Math.round(feedback.categoryScores.find(c => c.name === "Confidence and Clarity")?.score) || 50,
      strengths: feedback.strengths,
      weaknesses: feedback.areasForImprovement,
      detailedFeedback: feedback.finalAssessment || (cleanedText.substring(0, 200) || "Feedback generated"),
      status: "COMPLETED",
      endedAt: new Date()
    };

    console.log("generateFeedbackFromTranscript: Updating session with:", updateData);
    const updatedSession = await db.interviewSession.update({
      where: { id: sessionId },
      data: updateData
    });

    // Save raw model output for debugging
    try {
      await db.callAnalytics.upsert({
        where: { sessionId },
        update: { metadata: { ...(session.metadata || {}), rawModelOutput: modelResponseText.substring(0, 5000) } },
        create: {
          userId: session.userId, sessionId, transcript: formattedTranscript, endedAt: new Date(), metadata: { rawModelOutput: modelResponseText.substring(0, 5000) }
        }
      });
    } catch (uerr) {
      console.warn("generateFeedbackFromTranscript: failed to persist raw model output", uerr);
    }

    console.log("generateFeedbackFromTranscript: Completed successfully", { sessionId, overallScore: updatedSession.overallScore });
    return feedback;
  } catch (error) {
    console.error("generateFeedbackFromTranscript: Fatal error:", error);
    // Best-effort DB update (non-null fields)
    try {
      await db.interviewSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
          detailedFeedback: "Interview completed. Feedback generation encountered an issue.",
          overallScore: 50,
          strengths: [],
          weaknesses: ["Feedback generation failed"]
        }
      });
    } catch (e) {
      console.error("generateFeedbackFromTranscript: failed to update session after fatal error", e);
    }
    return null;
  }
}

// FIXED: handleInterviewComplete with better error handling
export async function handleInterviewComplete(sessionId, transcript = "", messages = []) {
  try {
    console.log("handleInterviewComplete: Starting", { 
      sessionId, 
      transcriptLength: transcript?.length ?? 0, 
      messagesCount: messages?.length ?? 0 
    });

    // Ensure session exists
    const session = await db.interviewSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      console.error("handleInterviewComplete: Session not found", { sessionId });
      throw new Error("Session not found");
    }
    
    console.log("handleInterviewComplete: Found session", { 
      id: session.id, 
      userId: session.userId,
      currentStatus: session.status 
    });

    // FIXED: Upsert call analytics with better error handling
    try {
      const analyticsData = {
        userId: session.userId,
        sessionId,
        transcript: transcript || "No transcript available",
        endedAt: new Date(),
        // Add other analytics fields as needed
        duration: null,
        cost: null,
        speakingTime: null,
        silenceTime: null,
        wordsPerMinute: null,
        fillerWordsCount: null,
        startedAt: session.startedAt,
        metadata: { messages: messages?.length || 0 }
      };

      const upsertRes = await db.callAnalytics.upsert({
        where: { sessionId: sessionId },
        update: {
          transcript: analyticsData.transcript,
          endedAt: analyticsData.endedAt,
          metadata: analyticsData.metadata
        },
        create: analyticsData
      });
      
      console.log("handleInterviewComplete: CallAnalytics upserted successfully", { id: upsertRes.id });
    } catch (upsertErr) {
      console.error("handleInterviewComplete: CallAnalytics upsert failed:", upsertErr);
      // Continue execution - don't fail the entire process for analytics
    }

    // FIXED: Generate feedback with timeout protection
    let feedback = null;
    try {
      // Add a reasonable timeout for feedback generation
      const feedbackPromise = generateFeedbackFromTranscript(sessionId, transcript, messages);
      feedback = await Promise.race([
        feedbackPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Feedback generation timeout")), 30000)
        )
      ]);
      
      console.log("handleInterviewComplete: Feedback generated successfully");
    } catch (feedbackErr) {
      console.error("handleInterviewComplete: Feedback generation failed:", feedbackErr);
      
      // FIXED: Ensure session is still marked as completed even if feedback fails
      try {
        await db.interviewSession.update({
          where: { id: sessionId },
          data: { 
            status: "COMPLETED", 
            endedAt: new Date(),
            detailedFeedback: "Interview completed successfully. Feedback generation encountered an issue.",
            overallScore: 50
          }
        });
        console.log("handleInterviewComplete: Session marked as completed despite feedback error");
      } catch (updateErr) {
        console.error("handleInterviewComplete: Failed to update session after feedback error:", updateErr);
      }
    }

    // Re-read the updated session from database
    const updatedSession = await db.interviewSession.findUnique({ 
      where: { id: sessionId },
      include: { user: true } // Include user data if needed
    });
    
    console.log("handleInterviewComplete: Final session state", {
      id: updatedSession?.id,
      status: updatedSession?.status,
      overallScore: updatedSession?.overallScore,
      hasDetailedFeedback: !!updatedSession?.detailedFeedback
    });

    return { session: updatedSession, feedback };
  } catch (err) {
    console.error("handleInterviewComplete: Fatal error:", err);
    
    // FIXED: Last resort - ensure session doesn't remain in IN_PROGRESS state
    try {
      await db.interviewSession.update({
        where: { id: sessionId },
        data: { 
          status: "FAILED", 
          endedAt: new Date(),
          detailedFeedback: "Interview encountered an error during completion."
        }
      });
      console.log("handleInterviewComplete: Set session status to FAILED due to fatal error");
    } catch (finalErr) {
      console.error("handleInterviewComplete: Could not update session status to FAILED:", finalErr);
    }
    
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