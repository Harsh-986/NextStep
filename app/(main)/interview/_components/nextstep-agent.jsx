"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Vapi from "@vapi-ai/web";

// Initialize VAPI (same as PrepWise)
const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);

const CallStatus = {
  INACTIVE: "INACTIVE",
  CONNECTING: "CONNECTING",
  ACTIVE: "ACTIVE", 
  FINISHED: "FINISHED",
};

// Copy your PrepWise createInterviewAssistant function
const createInterviewAssistant = (params) => {
  const {
    questions = "",
    role = "Software Developer",
    level = "Mid-level",
    techstack = "General Technologies"
  } = params || {};

  return {
    name: "AI Interviewer",
    firstMessage: `Hello! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience for the ${role} position at ${level} level.`,
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
          content: `You are a professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the ${role} role at ${level}.

Interview Guidelines:
Focus on the structured question flow:
${questions}

Engage naturally & react appropriately:
- Listen actively to responses and acknowledge them before moving forward.
- Ask brief follow-up questions if a response is vague or requires more detail.
- Keep the conversation flowing smoothly while maintaining control.

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
- Do not include any special characters in your responses - this is a voice conversation.`,
        },
      ],
    },
  };
};

const NextStepAgent = ({
  userName,
  userId,
  sessionId,
  questions = [],
  onComplete
}) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState(CallStatus.INACTIVE);
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState("");

  // Copy your PrepWise useEffect hooks exactly
  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => {
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      setIsSpeaking(false);
    };

    const onError = (error) => {
      console.log("Error:", error);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages) => {
      try {
        const response = await fetch('/api/interview/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            transcript: messages.map(m => m.content).join('\n'),
            messages: messages
          })
        });

        const result = await response.json();
        if (result.success) {
          onComplete(result.session);
        } else {
          console.error("Error saving feedback");
          router.push("/interview");
        }
      } catch (error) {
        console.error("Error generating feedback:", error);
        router.push("/interview");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      handleGenerateFeedback(messages);
    }
  }, [messages, callStatus, sessionId, router, onComplete]);

  // Copy your PrepWise handleCall function exactly
  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    const formattedQuestions = questions
      .map((question) => `- ${question}`)
      .join("\n");

    const assistantConfig = createInterviewAssistant({
      questions: formattedQuestions,
      role: "Software Developer", // Get from session data
      level: "Mid-level", // Get from session data
      techstack: "General Technologies" // Get from session data
    });

    await vapi.start(assistantConfig);
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  // Copy your PrepWise JSX exactly but adapt styling for NextStep
  return (
    <div className="space-y-6">
      {/* Interview Interface */}
      <div className="flex sm:flex-row flex-col gap-10 items-center justify-between w-full">
        {/* AI Interviewer Card */}
        <div className="flex-center flex-col gap-2 p-7 h-[400px] bg-gradient-to-b from-blue-900/20 to-background rounded-lg border-2 border-primary/50 flex-1 sm:basis-1/2 w-full">
          <div className="z-10 flex items-center justify-center bg-gradient-to-l from-white to-primary/80 rounded-full size-[120px] relative">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6s.792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95a1 1 0 001.715 1.029zM8 9a1 1 0 000 2h.01a1 1 0 000-2H8zm3.99 0a1 1 0 000 2H12a1 1 0 000-2h-.01z" clipRule="evenodd" />
              </svg>
            </div>
            {isSpeaking && <span className="absolute inline-flex size-5/6 animate-ping rounded-full bg-primary opacity-75" />}
          </div>
          <h3 className="text-center text-primary mt-5">AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="flex-1 sm:basis-1/2 w-full h-[400px] max-md:hidden">
          <div className="flex flex-col gap-2 justify-center items-center p-7 bg-gradient-to-b from-gray-800 to-background rounded-lg min-h-full border-2 border-muted">
            <div className="w-[120px] h-[120px] bg-muted rounded-full flex items-center justify-center">
              <svg className="w-16 h-16 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-center text-white mt-5">{userName}</h3>
          </div>
        </div>
      </div>

      {/* Transcript Display */}
      {messages.length > 0 && (
        <div className="w-full border-2 border-muted rounded-lg">
          <div className="bg-gradient-to-b from-gray-800 to-background rounded-lg min-h-12 px-5 py-3 flex items-center justify-center">
            <p className={cn(
              "text-lg text-center text-white transition-opacity duration-500 opacity-0",
              "opacity-100"
            )}>
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      {/* Call Control Buttons */}
      <div className="w-full flex justify-center">
        {callStatus !== CallStatus.ACTIVE ? (
          <Button 
            className={cn(
              "relative px-7 py-3 font-bold text-sm leading-5 text-white transition-colors duration-150 bg-green-500 hover:bg-green-600 border border-transparent rounded-full shadow-sm min-w-28 cursor-pointer items-center justify-center overflow-visible",
              callStatus === CallStatus.CONNECTING && "animate-pulse"
            )} 
            onClick={handleCall}
            disabled={callStatus === CallStatus.CONNECTING}
          >
            <span className={cn(
              "absolute animate-ping rounded-full opacity-75 bg-green-500 h-[85%] w-[65%]",
              callStatus !== CallStatus.CONNECTING && "hidden"
            )} />

            <span className="relative">
              {callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED
                ? "Start Interview"
                : "Connecting..."}
            </span>
          </Button>
        ) : (
          <Button 
            className="px-7 py-3 text-sm font-bold leading-5 text-white transition-colors duration-150 bg-red-500 hover:bg-red-600 border border-transparent rounded-full shadow-sm min-w-28"
            onClick={handleDisconnect}
          >
            End Interview
          </Button>
        )}
      </div>
    </div>
  );
};

export default NextStepAgent;