import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Video, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award,
  MessageSquare,
  Brain,
  Target,
  Play,
  Plus,
  BarChart3,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

const InterviewDashboard = ({ sessions = [], onStartInterview, onCreateSession }) => {
  const [stats, setStats] = useState({
    totalSessions: 0,
    averageScore: 0,
    completedSessions: 0,
    improvementRate: 0,
    averageTechnical: 0,
    averageCommunication: 0,
    averageConfidence: 0
  });

  useEffect(() => {
    calculateStats();
  }, [sessions]);

  const calculateStats = () => {
    const completed = sessions.filter(s => s.status === 'COMPLETED' && s.overallScore);
    const totalSessions = sessions.length;
    const completedSessions = completed.length;
    
    const averageScore = completedSessions > 0 
      ? Math.round(completed.reduce((sum, session) => sum + (session.overallScore || 0), 0) / completedSessions)
      : 0;

    // Calculate individual score averages
    const technicalScores = completed.filter(s => s.technicalScore);
    const averageTechnical = technicalScores.length > 0 
      ? Math.round(technicalScores.reduce((sum, s) => sum + s.technicalScore, 0) / technicalScores.length)
      : 0;

    const communicationScores = completed.filter(s => s.communicationScore);
    const averageCommunication = communicationScores.length > 0 
      ? Math.round(communicationScores.reduce((sum, s) => sum + s.communicationScore, 0) / communicationScores.length)
      : 0;

    const confidenceScores = completed.filter(s => s.confidenceScore);
    const averageConfidence = confidenceScores.length > 0 
      ? Math.round(confidenceScores.reduce((sum, s) => sum + s.confidenceScore, 0) / confidenceScores.length)
      : 0;

    // Calculate improvement rate (comparing last 3 sessions with previous 3)
    const recentSessions = completed.slice(0, 3);
    const previousSessions = completed.slice(3, 6);
    
    const recentAvg = recentSessions.length > 0 
      ? recentSessions.reduce((sum, s) => sum + (s.overallScore || 0), 0) / recentSessions.length
      : 0;
    
    const previousAvg = previousSessions.length > 0 
      ? previousSessions.reduce((sum, s) => sum + (s.overallScore || 0), 0) / previousSessions.length
      : 0;

    const improvementRate = previousAvg > 0 ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100) : 0;

    setStats({
      totalSessions,
      averageScore,
      completedSessions,
      improvementRate,
      averageTechnical,
      averageCommunication,
      averageConfidence
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'SCHEDULED': { color: 'bg-blue-500', text: 'Scheduled' },
      'IN_PROGRESS': { color: 'bg-yellow-500', text: 'In Progress' },
      'COMPLETED': { color: 'bg-green-500', text: 'Completed' },
      'CANCELLED': { color: 'bg-red-500', text: 'Cancelled' },
      'FAILED': { color: 'bg-red-500', text: 'Failed' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Interview Practice</h1>
          <p className="text-muted-foreground">
            Practice interviews with AI and get instant feedback
          </p>
        </div>
        <Button onClick={onCreateSession} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Interview
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
              {stats.averageScore}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.improvementRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.improvementRate > 0 ? '+' : ''}{stats.improvementRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Interview Sessions</CardTitle>
          <CardDescription>
            Your latest interview practice sessions and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No interviews yet</h3>
              <p className="text-muted-foreground mb-4">
                Start your first AI interview to practice and improve your skills
              </p>
              <Button onClick={onCreateSession}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Interview
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Video className="h-8 w-8 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {session.role || 'General Interview'}
                        </h3>
                        {getStatusBadge(session.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(session.createdAt), 'MMM dd, yyyy')}
                        </span>
                        
                        {session.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.duration}min
                          </span>
                        )}
                        
                        {session.industry && (
                          <span className="flex items-center gap-1">
                            <Brain className="h-3 w-3" />
                            {session.industry}
                          </span>
                        )}
                      </div>

                      {/* Show individual scores if available */}
                      {session.status === 'COMPLETED' && (session.technicalScore || session.communicationScore || session.confidenceScore) && (
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {session.technicalScore && (
                            <div className="flex items-center gap-1">
                              <Brain className="h-3 w-3" />
                              <span className={getScoreColor(session.technicalScore)}>
                                Tech: {session.technicalScore}%
                              </span>
                            </div>
                          )}
                          {session.communicationScore && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              <span className={getScoreColor(session.communicationScore)}>
                                Comm: {session.communicationScore}%
                              </span>
                            </div>
                          )}
                          {session.confidenceScore && (
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span className={getScoreColor(session.confidenceScore)}>
                                Conf: {session.confidenceScore}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {session.status === 'COMPLETED' && session.overallScore && (
                      <div className="text-right">
                        <div className={`font-semibold ${getScoreColor(session.overallScore)}`}>
                          {session.overallScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">Overall</div>
                      </div>
                    )}

                    {session.status === 'COMPLETED' && !session.overallScore && (
                      <div className="text-right">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" />
                        <div className="text-xs text-muted-foreground">No Score</div>
                      </div>
                    )}
                    
                    {session.status === 'SCHEDULED' && (
                      <Button
                        size="sm"
                        onClick={() => onStartInterview(session.id)}
                        className="flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" />
                        Start
                      </Button>
                    )}
                    
                    {session.status === 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/interview/session/${session.id}`}
                        className="flex items-center gap-1"
                      >
                        <BarChart3 className="h-3 w-3" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {sessions.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={() => window.location.href = '/interview/sessions'}>
                    View All Sessions
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Overview - Enhanced with all scores */}
      {stats.completedSessions > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Technical Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Average Score</span>
                  <span className={`font-semibold ${getScoreColor(stats.averageTechnical)}`}>
                    {stats.averageTechnical > 0 ? `${stats.averageTechnical}%` : 'N/A'}
                  </span>
                </div>
                <Progress value={stats.averageTechnical} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {sessions.filter(s => s.technicalScore).length} sessions with technical scores
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Communication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Average Score</span>
                  <span className={`font-semibold ${getScoreColor(stats.averageCommunication)}`}>
                    {stats.averageCommunication > 0 ? `${stats.averageCommunication}%` : 'N/A'}
                  </span>
                </div>
                <Progress value={stats.averageCommunication} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {sessions.filter(s => s.communicationScore).length} sessions with communication scores
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Average Score</span>
                  <span className={`font-semibold ${getScoreColor(stats.averageConfidence)}`}>
                    {stats.averageConfidence > 0 ? `${stats.averageConfidence}%` : 'N/A'}
                  </span>
                </div>
                <Progress value={stats.averageConfidence} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {sessions.filter(s => s.confidenceScore).length} sessions with confidence scores
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Debug Info for Development (remove in production) */}
      {process.env.NODE_ENV === 'development' && stats.completedSessions > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base text-yellow-800">Debug Info (Dev Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>Completed sessions: {stats.completedSessions}</p>
              <p>Sessions with technical scores: {sessions.filter(s => s.technicalScore).length}</p>
              <p>Sessions with communication scores: {sessions.filter(s => s.communicationScore).length}</p>
              <p>Sessions with confidence scores: {sessions.filter(s => s.confidenceScore).length}</p>
              <p>Sessions with strengths: {sessions.filter(s => s.strengths?.length > 0).length}</p>
              <p>Sessions with weaknesses: {sessions.filter(s => s.weaknesses?.length > 0).length}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InterviewDashboard;
