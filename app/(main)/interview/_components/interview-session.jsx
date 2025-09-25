"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Volume2,
  VolumeX,
  Clock,
  User,
  Bot,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

const InterviewSession = ({ session, callData, onComplete, onCancel }) => {
  const [callStatus, setCallStatus] = useState('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const vapiCallRef = useRef(null);

  // VAPI Web Call Integration
  useEffect(() => {
    if (callData?.webCallUrl) {
      initializeVapiCall();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (vapiCallRef.current) {
        vapiCallRef.current.end();
      }
    };
  }, [callData]);

  const initializeVapiCall = async () => {
    try {
      // Import VAPI SDK (assuming it's loaded via CDN)
      if (typeof window !== 'undefined' && window.Vapi) {
        const vapi = new window.Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
        vapiCallRef.current = vapi;

        // Set up event listeners
        vapi.on('call-start', () => {
          setCallStatus('connected');
          setIsCallActive(true);
          startTimer();
          toast.success('Interview started!');
        });

        vapi.on('call-end', () => {
          setCallStatus('ended');
          setIsCallActive(false);
          stopTimer();
          handleCallEnd();
        });

        vapi.on('speech-start', () => {
          console.log('User started speaking');
        });

        vapi.on('speech-end', () => {
          console.log('User stopped speaking');
        });

        vapi.on('message', (message) => {
          console.log('Message received:', message);
        });

        vapi.on('error', (error) => {
          console.error('VAPI error:', error);
          toast.error('Interview connection error');
          setCallStatus('error');
        });

        // Start the call using the web call URL
        await vapi.start(callData.webCallUrl);
        
      } else {
        // Fallback: Use iframe or direct URL navigation
        handleFallbackCall();
      }
    } catch (error) {
      console.error('Failed to initialize VAPI call:', error);
      toast.error('Failed to start interview');
      setCallStatus('error');
    }
  };

  const handleFallbackCall = () => {
    // If VAPI SDK is not available, open in new window/iframe
    setCallStatus('connected');
    setIsCallActive(true);
    startTimer();
    
    // You could open the webCallUrl in an iframe or new window
    if (callData.webCallUrl) {
      window.open(callData.webCallUrl, 'interview-call', 'width=800,height=600');
    }
  };

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleCallEnd = () => {
    toast.success('Interview completed! Generating feedback...');
    setTimeout(() => {
      onComplete(session);
    }, 2000);
  };

  const toggleMute = () => {
    if (vapiCallRef.current) {
      if (isMuted) {
        vapiCallRef.current.unmute();
      } else {
        vapiCallRef.current.mute();
      }
    }
    setIsMuted(!isMuted);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Handle speaker toggle logic here
  };

  const endCall = () => {
    if (vapiCallRef.current) {
      vapiCallRef.current.end();
    } else {
      setCallStatus('ended');
      setIsCallActive(false);
      stopTimer();
      handleCallEnd();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = () => {
    switch (callStatus) {
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          text: 'Connecting...',
          icon: <Settings className="h-4 w-4 animate-spin" />
        };
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Connected',
          icon: <CheckCircle className="h-4 w-4" />
        };
      case 'ended':
        return {
          color: 'bg-gray-500',
          text: 'Ended',
          icon: <CheckCircle className="h-4 w-4" />
        };
      case 'error':
        return {
          color: 'bg-red-500',
          text: 'Connection Error',
          icon: <AlertCircle className="h-4 w-4" />
        };
      default:
        return {
          color: 'bg-gray-500',
          text: 'Unknown',
          icon: <AlertCircle className="h-4 w-4" />
        };
    }
  };

  const statusConfig = getStatusConfig();
  const progress = session.duration ? (elapsedTime / (session.duration * 60)) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {session.role} Interview
              </CardTitle>
              <CardDescription>
                {session.industry} • {session.difficulty} level • {session.duration} minutes
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className={`${statusConfig.color} text-white`}>
                {statusConfig.icon}
                {statusConfig.text}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{formatTime(elapsedTime)} / {formatTime(session.duration * 60)}</span>
              </div>
              <Progress value={Math.min(progress, 100)} className="h-2" />
            </div>

            {/* Call Status */}
            {callStatus === 'connecting' && (
              <div className="text-center py-4">
                <div className="animate-pulse">
                  <Bot className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="text-muted-foreground">Connecting to AI interviewer...</p>
                </div>
              </div>
            )}

            {callStatus === 'connected' && (
              <div className="text-center py-4">
                <Bot className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="font-medium">Interview in Progress</p>
                <p className="text-sm text-muted-foreground">
                  Speak clearly and answer each question thoughtfully
                </p>
              </div>
            )}

            {callStatus === 'error' && (
              <div className="text-center py-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <p className="font-medium text-red-600">Connection Error</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Unable to connect to the interview session
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Retry Connection
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Call Controls */}
      {(callStatus === 'connected' || callStatus === 'connecting') && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-center space-x-4">
              {/* Mute Button */}
              <Button
                size="lg"
                variant={isMuted ? "destructive" : "outline"}
                onClick={toggleMute}
                className="rounded-full w-12 h-12"
                disabled={!isCallActive}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              {/* Speaker Button */}
              <Button
                size="lg"
                variant={isSpeakerOn ? "outline" : "secondary"}
                onClick={toggleSpeaker}
                className="rounded-full w-12 h-12"
                disabled={!isCallActive}
              >
                {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>

              {/* End Call Button */}
              <Button
                size="lg"
                variant="destructive"
                onClick={endCall}
                className="rounded-full w-12 h-12"
                disabled={callStatus === 'ended'}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>

            <div className="text-center mt-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
              
              {isMuted && (
                <p className="text-sm text-destructive">
                  Microphone is muted
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interview Questions Preview */}
      {session.questions && session.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Interview Topics</CardTitle>
            <CardDescription>
              The AI will ask questions covering these areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {session.questions.slice(0, 6).map((question, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border text-sm ${
                    index === currentQuestion 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {question.type || 'General'}
                    </Badge>
                    {index === currentQuestion && (
                      <Badge className="bg-primary text-xs">Current</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Question {index + 1} of {session.questions.length}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Having issues? You can end the session and try again later.
            </div>
            <Button variant="outline" onClick={onCancel}>
              End Session
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* VAPI SDK Script */}
      <script 
        src="https://cdn.jsdelivr.net/npm/@vapi-ai/web-sdk@latest" 
        async 
      />
    </div>
  );
};

export default InterviewSession;