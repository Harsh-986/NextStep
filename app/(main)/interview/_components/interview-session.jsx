"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import useFetch from "@/hooks/use-fetch";
import { handleInterviewComplete as handleInterviewCompleteAction } from "@/actions/interview-session";
import {
  Mic, MicOff, PhoneOff, Volume2, VolumeX, Clock, User, Bot, AlertCircle, CheckCircle, Settings
} from "lucide-react";
import { toast } from "sonner";

const InterviewSession = ({ session, callData, onComplete, onCancel }) => {
  const [callStatus, setCallStatus] = useState("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);

  const intervalRef = useRef(null);
  const vapiRef = useRef(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);

  // state for UI
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);

  // refs to keep latest values for callbacks
  const messagesRef = useRef([]);
  const transcriptRef = useRef("");
  const conversationRef = useRef([]);

  const { fn: finishInterview, loading: finishing } = useFetch(handleInterviewCompleteAction);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const startTimer = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => setElapsedTime(e => e + 1), 1000);
  };
  const stopTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  // sanitizer: whitelist only allowed transcriber fields (provider, model, language)
  function sanitizeAssistantConfigForVapi(rawConfig) {
    if (!rawConfig || typeof rawConfig !== "object") return rawConfig;
    const config = { ...rawConfig };

    if (config.transcriber && typeof config.transcriber === "object") {
      const { provider, model, language } = config.transcriber;
      const transcriber = {};
      if (provider) transcriber.provider = provider;
      if (model) transcriber.model = model;
      if (language) transcriber.language = language;
      config.transcriber = transcriber;
    }

    if (config.clientMessages && !Array.isArray(config.clientMessages)) {
      delete config.clientMessages;
    }

    // If you need to whitelist other nested fields (voice, model), do so explicitly here.
    return config;
  }

  // VAPI init + handlers (single useEffect)
  useEffect(() => {
    if (!session || !callData) return;

    const init = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;

      // cleanup previous
      if (vapiRef.current) {
        try { await vapiRef.current.stop?.(); } catch (e) { console.warn("vapi.stop failed", e); }
        vapiRef.current = null;
      }

      try {
        // prefer dynamic import to avoid loading an incompatible CDN build
        let VapiCtor = typeof window !== "undefined" ? window.Vapi : null;
        if (!VapiCtor) {
          try {
            const mod = await import("@vapi-ai/web");
            VapiCtor = mod?.default || mod?.Vapi || window?.Vapi;
          } catch (impErr) {
            console.warn("Dynamic import @vapi-ai/web failed:", impErr);
          }
        }

        if (!VapiCtor) throw new Error("VAPI SDK not available. Install @vapi-ai/web or include the vendor's browser bundle.");

        const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;
        if (!token) {
          toast.error("Missing VAPI public token");
          setCallStatus("error");
          initializingRef.current = false;
          return;
        }

        const vapi = new VapiCtor(token);
        vapiRef.current = vapi;

        // MESSAGE HANDLER
        vapi.on?.("message", (msg) => {
          try {
            console.log("VAPI Message Received:", msg);

            // update messages state + ref
            setMessages(prev => {
              const next = [...prev, msg];
              messagesRef.current = next;
              return next;
            });

            // transcripts
            if (msg.type === "transcript") {
              const content = msg.transcript || msg.text || "";
              const role = msg.role || "unknown";
              const transcriptType = msg.transcriptType || "unknown";

              if (transcriptType === "final" && content) {
                const conversationEntry = {
                  role,
                  content,
                  timestamp: new Date().toISOString(),
                  type: transcriptType
                };

                setConversationHistory(prev => {
                  const next = [...prev, conversationEntry];
                  conversationRef.current = next;
                  return next;
                });

                setTranscript(prev => {
                  const newTranscript = prev ? `${prev}\n${role}: ${content}` : `${role}: ${content}`;
                  transcriptRef.current = newTranscript;
                  return newTranscript;
                });
              }
              return;
            }

            // conversation updates (array)
            if (msg.type === "conversation-update" || msg.type === "model-output") {
              const conversationData = msg.conversation || msg.messages;
              if (Array.isArray(conversationData)) {
                conversationData.forEach(item => {
                  const content = item.content || item.text || item.message || "";
                  const role = item.role || "unknown";
                  if (content) {
                    const conversationEntry = {
                      role,
                      content,
                      timestamp: new Date().toISOString(),
                      type: "conversation-update"
                    };

                    setConversationHistory(prev => {
                      const exists = prev.find(p => p.content === content && p.role === role);
                      const next = exists ? prev : [...prev, conversationEntry];
                      conversationRef.current = next;
                      return next;
                    });
                  }
                });
              }
              return;
            }

            // fallback text extraction
            if (msg.text || msg.content || msg.message) {
              const content = msg.text || msg.content || msg.message;
              const conversationEntry = {
                role: msg.role || "system",
                content: String(content),
                timestamp: new Date().toISOString(),
                type: msg.type || "fallback"
              };

              setConversationHistory(prev => {
                const next = [...prev, conversationEntry];
                conversationRef.current = next;
                return next;
              });
            }
          } catch (msgError) {
            console.error("Error processing VAPI message:", msgError);
          }
        });

        // call-start
        vapi.on?.("call-start", () => {
          console.log("VAPI event: call-start");
          setCallStatus("connected");
          setIsCallActive(true);
          startTimer();
          toast.success("Interview started");
          // reset previous conversation buffers
          setMessages([]);
          setTranscript("");
          setConversationHistory([]);
          messagesRef.current = [];
          transcriptRef.current = "";
          conversationRef.current = [];
        });

        // call-end: wait briefly for in-flight messages, then send final transcript
        vapi.on?.("call-end", async () => {
          console.log("VAPI event: call-end fired — waiting briefly to allow last transcripts to arrive");
          setCallStatus("ended");
          setIsCallActive(false);
          stopTimer();

          // brief grace for last events
          await new Promise(res => setTimeout(res, 600));

          try {
            const finalTranscript = transcriptRef.current
              || (conversationRef.current.length > 0 ? conversationRef.current.map(c => `${c.role}: ${c.content}`).join("\n") : "");
            const finalMessages = conversationRef.current.length > 0 ? conversationRef.current : messagesRef.current;

            console.log("Sending to finishInterview (call-end):", {
              sessionId: session.id,
              transcriptLength: finalTranscript.length,
              messagesCount: finalMessages?.length ?? 0
            });

            const result = await finishInterview(session.id, finalTranscript, finalMessages);
            console.log("finishInterview result:", result);

            if (mountedRef.current) onComplete(result?.session ?? session);
          } catch (err) {
            console.error("finishInterview error (call-end):", err);
            if (mountedRef.current) {
              toast.error("Failed to save interview results");
              onComplete(session);
            }
          }
        });

        // error
        vapi.on?.("error", (e) => {
          console.error("VAPI error:", e);
          toast.error("VAPI error occurred");
          setCallStatus("error");
          setIsCallActive(false);
          stopTimer();
        });

        // Build sanitized assistantConfig (avoid rejected keys like punctuate)
        const sanitizedConfig = sanitizeAssistantConfigForVapi({
          ...callData.assistantConfig
        });

        // Ensure minimal transcriber if not present
        if (!sanitizedConfig.transcriber) {
          sanitizedConfig.transcriber = { provider: "deepgram", model: "nova-2", language: "en" };
        }

        // Ensure clientMessages present and is array
        if (!Array.isArray(sanitizedConfig.clientMessages)) {
          sanitizedConfig.clientMessages = [
            "transcript",
            "conversation-update",
            "model-output",
            "speech-update",
            "status-update"
          ];
        }

        console.log("VAPI: starting with sanitized assistantConfig", sanitizedConfig);

        try {
          const startResult = await vapi.start(sanitizedConfig);
          console.log("VAPI: start() returned:", startResult);
        } catch (startErr) {
          console.error("vapi.start failed:", startErr);
          // attempt to extract body from Response-like object
          try {
            if (startErr?.error instanceof Response) {
              const res = startErr.error;
              const txt = await res.text().catch(() => null);
              console.error("vapi.start response body:", txt);
            } else if (startErr?.body) {
              console.error("vapi.start body:", startErr.body);
            }
          } catch (dbgErr) {
            console.warn("Error extracting start error body", dbgErr);
          }
          throw startErr;
        }

      } catch (err) {
        console.error("VAPI init error:", err);
        toast.error("Failed to initialize VAPI");
        setCallStatus("error");
      } finally {
        initializingRef.current = false;
      }
    };

    init();

    return () => {
      (async () => {
        try { if (vapiRef.current) await vapiRef.current.stop?.(); } catch (e) { console.warn("cleanup vapi stop", e); }
        vapiRef.current = null;
        stopTimer();
      })();
    };
  }, [session?.id, callData?.assistantConfig, finishInterview, onComplete, session]);

  const toggleMute = () => {
    try { vapiRef.current?.setMuted?.(!isMuted); } catch (e) { console.warn(e); }
    setIsMuted(m => !m);
  };

  const toggleSpeaker = () => setIsSpeakerOn(s => !s);

  const endCall = async () => {
    console.log("Manual call end triggered");
    try {
      await vapiRef.current?.stop?.();
    } catch (e) {
      console.warn("stop error", e);
    }
    setCallStatus("ended");
    setIsCallActive(false);
    stopTimer();

    // ensure we still save transcript on manual end
    try {
      await new Promise(res => setTimeout(res, 400));

      const finalTranscript = transcriptRef.current
        || (conversationRef.current.length > 0 ? conversationRef.current.map(c => `${c.role}: ${c.content}`).join("\n") : "");
      const finalMessages = conversationRef.current.length > 0 ? conversationRef.current : messagesRef.current;

      console.log("Sending to finishInterview (manual end):", {
        sessionId: session.id,
        transcriptLength: finalTranscript.length,
        messagesCount: finalMessages?.length ?? 0
      });

      const result = await finishInterview(session.id, finalTranscript, finalMessages);
      if (mountedRef.current) onComplete(result?.session ?? session);
    } catch (err) {
      console.error("finishInterview error (manual end):", err);
      if (mountedRef.current) {
        toast.error("Failed to save interview results");
        onComplete(session);
      }
    }
  };

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const statusConfig = (() => {
    switch (callStatus) {
      case "connecting": return { color: "bg-yellow-500", text: "Connecting...", icon: <Settings className="h-4 w-4 animate-spin" /> };
      case "connected": return { color: "bg-green-500", text: "Connected", icon: <CheckCircle className="h-4 w-4" /> };
      case "ended": return { color: "bg-gray-500", text: "Ended", icon: <CheckCircle className="h-4 w-4" /> };
      case "error": return { color: "bg-red-500", text: "Connection Error", icon: <AlertCircle className="h-4 w-4" /> };
      default: return { color: "bg-gray-500", text: "Unknown", icon: <AlertCircle className="h-4 w-4" /> };
    }
  })();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {session?.role ?? "Interview"} Interview
              </CardTitle>
              <CardDescription>
                {session?.industry} • {session?.difficulty} • {session?.duration} min
              </CardDescription>
            </div>
            <Badge className={`${statusConfig.color} text-white`}>
              {statusConfig.icon}
              {statusConfig.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{formatTime(elapsedTime)} / {formatTime((session?.duration||0)*60)}</span>
            </div>
            <Progress
              value={Math.min(((session?.duration ? elapsedTime/ (session.duration*60) : 0) * 100) || 0, 100)}
              className="h-2"
            />

            {callStatus === "connecting" && (
              <div className="py-4 text-center">
                <Bot className="h-12 w-12 mx-auto animate-pulse text-primary" />
                <p className="text-muted-foreground mt-2">Connecting to AI interviewer...</p>
              </div>
            )}

            {callStatus === "connected" && (
              <div className="py-4 text-center">
                <Bot className="h-12 w-12 text-green-500 mx-auto" />
                <p className="font-medium">Interview in Progress</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {conversationHistory.length} messages exchanged
                </p>
              </div>
            )}

            {callStatus === "error" && (
              <div className="py-4 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <p className="text-red-600">Connection Error</p>
                <p className="text-sm text-muted-foreground">Please try again</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center space-x-4">
            <Button
              size="lg"
              variant={isMuted ? "destructive" : "outline"}
              onClick={toggleMute}
              className="rounded-full w-12 h-12"
              disabled={!isCallActive}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              size="lg"
              variant={isSpeakerOn ? "outline" : "secondary"}
              onClick={toggleSpeaker}
              className="rounded-full w-12 h-12"
              disabled={!isCallActive}
            >
              {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>

            <Button
              size="lg"
              variant="destructive"
              onClick={endCall}
              className="rounded-full w-12 h-12"
              disabled={callStatus === "ended"}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>

          <div className="text-center mt-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatTime(elapsedTime)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DEBUGGING: Real-time transcript display (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm text-blue-800">
              Debug Info (Dev Only) - Messages: {messages.length}, Conversation: {conversationHistory.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-32 overflow-y-auto">
            <div className="text-xs space-y-1">
              {conversationHistory.slice(-5).map((msg, i) => (
                <div key={i} className="text-blue-700">
                  <strong>{msg.role}:</strong> {String(msg.content).substring(0, 100)}...
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InterviewSession;
