import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Clock,
  Settings,
  Briefcase,
  GraduationCap,
  Target,
  Info,
  Play
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const InterviewSetup = ({ user, onSessionCreate, onCancel, isLoading }) => {
  const [step, setStep] = useState(1);
  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      sessionType: 'mock',
      industry: user?.industry || '',
      role: '',
      difficulty: 'intermediate',
      duration: 30,
      questionCount: 12,
      customQuestions: ''
    }
  });

  const sessionType = watch('sessionType');
  const difficulty = watch('difficulty');
  const duration = watch('duration');
  const questionCount = watch('questionCount');

  const sessionTypes = [
    {
      id: 'assessment',
      title: 'Skills Assessment',
      description: 'Focused technical evaluation with scoring',
      duration: 15,
      questionCount: 4,
      icon: <Settings className="h-5 w-5" />
    },
    {
      id: 'practice',
      title: 'Practice Session',
      description: 'Quick practice with specific question types',
      duration: 20,
      questionCount: 8,
      icon: <GraduationCap className="h-5 w-5" />
    },
    {
      id: 'mock',
      title: 'Mock Interview',
      description: 'Full interview simulation with comprehensive feedback',
      duration: 30,
      questionCount: 12,
      icon: <Target className="h-5 w-5" />
    }
  ];

  // Auto-update duration and question count when session type changes
  useEffect(() => {
    const selectedType = sessionTypes.find(type => type.id === sessionType);
    if (selectedType) {
      setValue('duration', selectedType.duration);
      setValue('questionCount', selectedType.questionCount);
    }
  }, [sessionType, setValue]);

  const difficultyLevels = [
    {
      id: 'beginner',
      title: 'Beginner',
      description: 'Entry-level questions, basic concepts',
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'intermediate',
      title: 'Intermediate',
      description: 'Mid-level questions, practical scenarios',
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Expert-level questions, complex problems',
      color: 'bg-red-100 text-red-800'
    }
  ];

  const commonRoles = [
    'Software Engineer',
    'Data Scientist',
    'Product Manager',
    'UX Designer',
    'DevOps Engineer',
    'Business Analyst',
    'Marketing Manager',
    'Sales Representative',
    'Project Manager',
    'Consultant'
  ];

  const onSubmit = async (data) => {
    try {
      await onSessionCreate(data);
      toast.success('Interview session created successfully!');
    } catch (error) {
      toast.error('Failed to create interview session');
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2 mb-8">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {num}
            </div>
            {num < 3 && (
              <div
                className={`w-12 h-1 mx-2 ${
                  step > num ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Interview Type */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Choose Interview Type
              </CardTitle>
              <CardDescription>
                Select the type of interview session you'd like to practice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={sessionType}
                onValueChange={(value) => setValue('sessionType', value)}
              >
                {sessionTypes.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.id} id={type.id} />
                    <Label 
                      htmlFor={type.id} 
                      className="flex-1 cursor-pointer"
                    >
                      <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="text-primary mt-0.5">
                            {type.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{type.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {type.description}
                            </p>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                {type.duration} min
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {type.questionCount} questions
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="flex justify-end pt-4">
                <Button type="button" onClick={nextStep}>
                  Next Step
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Role & Settings */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Interview Details
              </CardTitle>
              <CardDescription>
                Configure your interview settings and target role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Target Role *</Label>
                <div className="space-y-2">
                  <Input
                    id="role"
                    placeholder="e.g., Senior Software Engineer"
                    {...register('role', { required: 'Role is required' })}
                  />
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role.message}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {commonRoles.map((role) => (
                      <Badge
                        key={role}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                        onClick={() => setValue('role', role)}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  placeholder="e.g., Technology, Healthcare"
                  {...register('industry')}
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-3">
                <Label>Difficulty Level</Label>
                <RadioGroup
                  value={difficulty}
                  onValueChange={(value) => setValue('difficulty', value)}
                >
                  {difficultyLevels.map((level) => (
                    <div key={level.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={level.id} id={level.id} />
                      <Label htmlFor={level.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div>
                            <div className="font-medium">{level.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {level.description}
                            </div>
                          </div>
                          <Badge className={level.color}>
                            {level.title}
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Session Configuration Display (Read-only) */}
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Session Configuration
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-2 font-medium">{duration} minutes</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Questions:</span>
                    <span className="ml-2 font-medium">{questionCount} questions</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Configuration is automatically set based on your selected interview type.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
                <Button type="button" onClick={nextStep}>
                  Next Step
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Start */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Review & Start
              </CardTitle>
              <CardDescription>
                Review your settings and start the interview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold">Interview Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-medium">
                      {sessionTypes.find(t => t.id === sessionType)?.title}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Role:</span>
                    <span className="ml-2 font-medium">{watch('role')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Difficulty:</span>
                    <Badge className={difficultyLevels.find(d => d.id === difficulty)?.color}>
                      {difficultyLevels.find(d => d.id === difficulty)?.title}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-2 font-medium">{duration} minutes</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Questions:</span>
                    <span className="ml-2 font-medium">{questionCount} questions</span>
                  </div>
                  {watch('industry') && (
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground">Industry:</span>
                      <span className="ml-2 font-medium">{watch('industry')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-2">
                <Label htmlFor="customQuestions">
                  Additional Instructions (Optional)
                </Label>
                <Textarea
                  id="customQuestions"
                  placeholder="Any specific topics or questions you'd like to focus on..."
                  {...register('customQuestions')}
                  className="min-h-[80px]"
                />
              </div>

              {/* Important Notes */}
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Before You Start:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Ensure you have a stable internet connection</li>
                  <li>• Find a quiet environment for the interview</li>
                  <li>• Have your microphone and speakers ready</li>
                  <li>• The interview will be recorded for feedback purposes</li>
                </ul>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Starting...
                    </div>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Interview
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

      {/* Cancel Button */}
      <div className="flex justify-center">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default InterviewSetup;