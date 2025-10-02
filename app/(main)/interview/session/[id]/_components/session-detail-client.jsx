"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Award,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Brain,
  Target,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

const SessionDetailClient = ({ session, analytics }) => {
  const router = useRouter();

  if (!session) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The interview session you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button onClick={() => router.push('/interview')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Interviews
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'SCHEDULED': { color: 'bg-blue-500', text: 'Scheduled', icon: <Clock className="h-3 w-3" /> },
      'IN_PROGRESS': { color: 'bg-yellow-500', text: 'In Progress', icon: <Clock className="h-3 w-3 animate-spin" /> },
      'COMPLETED': { color: 'bg-green-500', text: 'Completed', icon: <CheckCircle className="h-3 w-3" /> },
      'CANCELLED': { color: 'bg-red-500', text: 'Cancelled', icon: <AlertCircle className="h-3 w-3" /> },
      'FAILED': { color: 'bg-red-500', text: 'Failed', icon: <AlertCircle className="h-3 w-3" /> }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-500', text: status, icon: <AlertCircle className="h-3 w-3" /> };
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (score >= 60) return <Target className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  // Calculate duration if available
  const calculateDuration = () => {
    if (session.startedAt && session.endedAt) {
      const start = new Date(session.startedAt);
      const end = new Date(session.endedAt);
      const durationMs = end - start;
      const minutes = Math.floor(durationMs / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return session.duration ? `${session.duration} min (planned)` : 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/interview')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{session.role || 'Interview'} Session</h1>
            <p className="text-muted-foreground">
              {session.industry && `${session.industry} • `}
              {session.difficulty} Level
            </p>
          </div>
        </div>
        {getStatusBadge(session.status)}
      </div>

      {/* Session Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Session Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(session.createdAt), 'MMM dd, yyyy')}</p>
              </div>
            </div>
            
            {session.startedAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Started</p>
                  <p className="font-medium">{format(new Date(session.startedAt), 'MMM dd, HH:mm')}</p>
                </div>
              </div>
            )}
            
            {session.endedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Completed</p>
                  <p className="font-medium">{format(new Date(session.endedAt), 'MMM dd, HH:mm')}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{calculateDuration()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Scores */}
      {session.status === 'COMPLETED' && session.overallScore && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" />
                Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getScoreIcon(session.overallScore)}
                <span className={`text-2xl font-bold ${getScoreColor(session.overallScore)}`}>
                  {session.overallScore}%
                </span>
              </div>
              <Progress value={session.overallScore} className="mt-2" />
            </CardContent>
          </Card>

          {/* Technical Score */}
          {session.technicalScore && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Technical
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getScoreIcon(session.technicalScore)}
                  <span className={`text-2xl font-bold ${getScoreColor(session.technicalScore)}`}>
                    {session.technicalScore}%
                  </span>
                </div>
                <Progress value={session.technicalScore} className="mt-2" />
              </CardContent>
            </Card>
          )}

          {/* Communication Score */}
          {session.communicationScore && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Communication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getScoreIcon(session.communicationScore)}
                  <span className={`text-2xl font-bold ${getScoreColor(session.communicationScore)}`}>
                    {session.communicationScore}%
                  </span>
                </div>
                <Progress value={session.communicationScore} className="mt-2" />
              </CardContent>
            </Card>
          )}

          {/* Confidence Score */}
          {session.confidenceScore && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getScoreIcon(session.confidenceScore)}
                  <span className={`text-2xl font-bold ${getScoreColor(session.confidenceScore)}`}>
                    {session.confidenceScore}%
                  </span>
                </div>
                <Progress value={session.confidenceScore} className="mt-2" />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Strengths and Weaknesses */}
      {session.status === 'COMPLETED' && (session.strengths?.length > 0 || session.weaknesses?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          {session.strengths?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {session.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Areas for Improvement */}
          {session.weaknesses?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Target className="h-5 w-5" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {session.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Detailed Feedback */}
      {session.status === 'COMPLETED' && session.detailedFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detailed Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {session.detailedFeedback}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interview Questions */}
      {session.questions && session.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Interview Questions
            </CardTitle>
            <CardDescription>
              Questions that were asked during this interview session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {session.questions.map((question, index) => {
                const questionText = typeof question === 'string' ? question : question.question || question.text || 'Question not available';
                return (
                  <div key={index} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <Badge variant="outline" className="min-w-fit">
                      Q{index + 1}
                    </Badge>
                    <p className="text-sm">{questionText}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      {analytics?.transcript && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Interview Transcript
            </CardTitle>
            <CardDescription>
              Full conversation transcript from the interview session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {analytics.transcript}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {session.status === 'COMPLETED' && !session.overallScore && !session.detailedFeedback && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Available</h3>
            <p className="text-muted-foreground">
              This interview session was completed but no feedback or scores were generated.
              This might be due to a technical issue during the feedback generation process.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SessionDetailClient;