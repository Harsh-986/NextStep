"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
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
  const [currentQuestion] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);

  const intervalRef = useRef(null);
  const vapiRef = useRef(null);                  // holds Vapi instance
  const initializingRef = useRef(false);         // prevent re-entrancy
  const mountedRef = useRef(true);

  // message/transcript collection
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState("");

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

  // Initialize VAPI, attach handlers, cleanup
  useEffect(() => {
    if (!session || !callData) return;

    const init = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;

      // stop existing instance if present (safety to avoid multiple instances)
      if (vapiRef.current) {
        try { await vapiRef.current.stop?.(); } catch (e) { console.warn("vapi.stop failed", e); }
        vapiRef.current = null;
      }

      try {
        // try to get constructor from window first, else dynamic import
        let VapiCtor = typeof window !== "undefined" ? window.Vapi : null;
        if (!VapiCtor) {
          try {
            const mod = await import("@vapi-ai/web");
            VapiCtor = mod?.default || mod?.Vapi || window?.Vapi;
          } catch (impErr) {
            console.warn("Dynamic import @vapi-ai/web failed:", impErr);
          }
        }

        if (!VapiCtor) throw new Error("VAPI SDK not available (window.Vapi or @vapi-ai/web)");

        const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;
        if (!token) { toast.error("Missing VAPI public token (NEXT_PUBLIC_VAPI_WEB_TOKEN)"); setCallStatus("error"); return; }

        const vapi = new VapiCtor(token);
        vapiRef.current = vapi;

        // SDK message handler: collect messages/transcript
        vapi.on?.("message", (msg) => {
          // push raw message; adapt extraction to actual SDK shape
          setMessages(prev => {
            try { return [...prev, msg]; } catch { return prev; }
          });

          // try to extract text from common fields
          const maybeText = msg?.text || msg?.content || msg?.message?.text || msg?.data || "";
          if (maybeText) setTranscript(prev => (prev ? prev + "\n" + maybeText : String(maybeText)));
        });

        vapi.on?.("call-start", () => {
          console.log("VAPI event: call-start");
          setCallStatus("connected");
          setIsCallActive(true);
          startTimer();
          toast.success("Interview started");
        });

        vapi.on?.("call-end", async () => {
          console.log("VAPI event: call-end fired - sending to server", { sessionId: session?.id });
          setCallStatus("ended");
          setIsCallActive(false);
          stopTimer();

          try {
            // call server action to generate feedback and update session
            const result = await finishInterview(session.id, transcript || "", messages || []);
            console.log("finishInterview result:", result);
            if (mountedRef.current) onComplete(result?.session ?? session);
          } catch (err) {
            console.error("finishInterview error:", err);
            if (mountedRef.current) {
              toast.error("Failed to save interview results. See console.");
              onComplete(session); // fallback so UI continues
            }
          }
        });

        vapi.on?.("error", (e) => {
          console.error("VAPI error:", e);
          toast.error("VAPI error - see console");
          setCallStatus("error");
          setIsCallActive(false);
          stopTimer();
        });

        // start call
        const assistantConfig = callData?.assistantConfig;
        if (!assistantConfig) { throw new Error("assistantConfig missing from callData"); }
        console.log("VAPI: starting with assistantConfig", assistantConfig);
        const startResult = await vapi.start(assistantConfig);
        console.log("VAPI: start() returned:", startResult);

        // do not force connected here — wait for call-start event
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, callData?.assistantConfig]);

  const toggleMute = () => {
    try { vapiRef.current?.setMuted?.(!isMuted); } catch (e) { console.warn(e); }
    setIsMuted(m => !m);
  };
  const toggleSpeaker = () => setIsSpeakerOn(s => !s);
  const endCall = () => {
    try { vapiRef.current?.stop?.(); } catch (e) { console.warn("stop error", e); }
    setCallStatus("ended");
    setIsCallActive(false);
    stopTimer();
    // note: vapi 'call-end' will trigger finishInterview when the SDK actually ends
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
      <Script src="https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest" strategy="afterInteractive" onLoad={() => console.log("VAPI CDN loaded")} onError={(e)=>console.warn("VAPI CDN load error", e)} />
      {/* Header / UI ... (same as yours but trimmed here) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />{session?.role ?? "Interview"} Interview</CardTitle>
              <CardDescription>{session?.industry} • {session?.difficulty} • {session?.duration} min</CardDescription>
            </div>
            <Badge className={`${statusConfig.color} text-white`}>{statusConfig.icon}{statusConfig.text}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm"><span>Progress</span><span>{formatTime(elapsedTime)} / {formatTime((session?.duration||0)*60)}</span></div>
            <Progress value={Math.min(((session?.duration ? elapsedTime/ (session.duration*60) : 0) * 100) || 0, 100)} className="h-2" />
            {callStatus === "connecting" && <div className="py-4 text-center"><Bot className="h-12 w-12 mx-auto" /><p className="text-muted-foreground">Connecting to AI interviewer...</p></div>}
            {callStatus === "connected" && <div className="py-4 text-center"><Bot className="h-12 w-12 text-green-500 mx-auto" /><p className="font-medium">Interview in Progress</p></div>}
            {callStatus === "error" && <div className="py-4 text-center"><AlertCircle className="h-12 w-12 text-red-500 mx-auto" /><p className="text-red-600">Connection Error</p></div>}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card><CardContent className="py-6">
        <div className="flex items-center justify-center space-x-4">
          <Button size="lg" variant={isMuted ? "destructive":"outline"} onClick={toggleMute} className="rounded-full w-12 h-12" disabled={!isCallActive}>{isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</Button>
          <Button size="lg" variant={isSpeakerOn ? "outline":"secondary"} onClick={toggleSpeaker} className="rounded-full w-12 h-12" disabled={!isCallActive}>{isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</Button>
          <Button size="lg" variant="destructive" onClick={endCall} className="rounded-full w-12 h-12" disabled={callStatus === "ended"}><PhoneOff className="h-5 w-5" /></Button>
        </div>
        <div className="text-center mt-4"><div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /><span>{formatTime(elapsedTime)}</span></div></div>
      </CardContent></Card>
    </div>
  );
};

export default InterviewSession;
