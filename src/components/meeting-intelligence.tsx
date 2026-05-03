import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Bot, 
  RefreshCw, 
  Copy, 
  Check,
  MessageSquare,
  Sparkles,
  ListTodo
} from 'lucide-react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Badge,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator
} from '../ui';
import { TranscriptSegment } from '../hooks/use-transcription';
import { cn } from '../utils';

interface MeetingIntelligenceProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  segments: TranscriptSegment[];
  isTranscribing: boolean;
  status: string;
  onToggleTranscription: () => void;
  apiBaseUrl: string;
  getAuthToken: () => string | null;
}

export const MeetingIntelligence: React.FC<MeetingIntelligenceProps> = ({
  isOpen,
  onClose,
  meetingId,
  segments,
  isTranscribing,
  status,
  onToggleTranscription,
  apiBaseUrl,
  getAuthToken
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('live');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // AI State
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isFetchingAI, setIsFetchingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcription
  useEffect(() => {
    if (activeTab === 'live' && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments, activeTab]);

  const fetchAIInsights = async () => {
    if (!meetingId) return;
    setIsFetchingAI(true);
    setAiError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/meetings/${meetingId}/ai-insights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch insights");
      const data = await res.json();
      
      // The API returns an array of outputs, take the latest one
      if (data && data.length > 0) {
          // Assuming result is a JSON field in the DB
          setAiInsights(typeof data[0].result === 'string' ? JSON.parse(data[0].result) : data[0].result);
      } else {
          setAiError("AI Analysis is still processing or unavailable.");
      }
    } catch (err: any) {
      setAiError(err.message || "An error occurred fetching AI Insights.");
    } finally {
      setIsFetchingAI(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <Card 
      className={cn(
        "fixed right-0 top-0 h-full flex flex-col border-l shadow-2xl rounded-none bg-background/95 backdrop-blur-md z-50 transition-all duration-300 ease-in-out border-border/40",
        isExpanded ? "w-[600px]" : "w-80 sm:w-96"
      )}
    >
      <CardHeader className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Meeting Intelligence
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8">
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
            <TabsTrigger value="live" className="data-[state=active]:bg-background">
              <MessageSquare className="h-3.5 w-3.5 mr-2" />
              Live
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-background" onClick={() => {
                if (!aiInsights) fetchAIInsights();
            }}>
              <Bot className="h-3.5 w-3.5 mr-2" />
              AI Insights
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <Tabs value={activeTab} className="h-full">
          <TabsContent value="live" className="h-full m-0 flex flex-col">
            <div className="p-3 border-b border-border/40 bg-muted/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  status === 'connected' ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                )} />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {status === 'connected' ? "Active Session" : status}
                </span>
              </div>
              <Button 
                size="sm" 
                variant={isTranscribing ? "destructive" : "default"}
                onClick={onToggleTranscription}
                disabled={status === 'connecting'}
                className="h-8 text-xs px-4"
              >
                {status === 'connecting' ? 'Connecting...' : isTranscribing ? 'Stop Live' : 'Start Live'}
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {segments.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center px-8">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Bot className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {isTranscribing ? "Listening for speakers..." : "Transcription inactive"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Start live transcription to capture the conversation and generate real-time meeting notes.
                    </p>
                  </div>
                ) : (
                  segments.map((seg, idx) => (
                    <div key={idx} className="flex gap-3 group">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {seg.speaker_name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate max-w-[120px]">
                              {seg.speaker_name}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {new Date(seg.start_secs * 1000).toISOString().substr(14, 5)}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopy(seg.text, idx)}
                          >
                            {copiedIndex === idx ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed break-words">
                          {seg.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai" className="h-full m-0 flex flex-col">
             <ScrollArea className="flex-1">
                <div className="p-4 space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      AI Analysis
                    </h3>
                    <Button variant="outline" size="sm" onClick={fetchAIInsights} disabled={isFetchingAI} className="h-7 text-[10px] px-2">
                      <RefreshCw className={cn("h-3 w-3 mr-1", isFetchingAI && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>

                  {aiError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                      {aiError}
                    </div>
                  )}

                  {isFetchingAI ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-20 bg-muted rounded-xl" />
                      <div className="h-32 bg-muted rounded-xl" />
                      <div className="h-24 bg-muted rounded-xl" />
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-8">
                       {/* Executive Summary */}
                       {aiInsights.executive_summary && (
                        <div className="space-y-3">
                          <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">Summary</Badge>
                          <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                            <p className="text-sm leading-relaxed text-foreground/90">
                              {aiInsights.executive_summary}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action Items */}
                      {aiInsights.action_items && aiInsights.action_items.length > 0 && (
                        <div className="space-y-3">
                          <Badge variant="secondary" className="bg-orange-500/5 text-orange-500 border-orange-500/10">
                            <ListTodo className="h-3 w-3 mr-1" />
                            Action Items
                          </Badge>
                          <div className="space-y-2">
                            {aiInsights.action_items.map((item: any, i: number) => (
                              <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/40 text-sm">
                                <p className="font-medium mb-2">{item.task}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <span className="bg-background px-1.5 py-0.5 rounded border border-border/40">
                                    @{item.assignee || 'Unassigned'}
                                  </span>
                                  {item.deadline && <span>Due: {item.deadline}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Topic Clusters */}
                      {aiInsights.topics && aiInsights.topics.length > 0 && (
                        <div className="space-y-3">
                          <Badge variant="secondary" className="bg-blue-500/5 text-blue-500 border-blue-500/10">Key Topics</Badge>
                          <div className="space-y-4">
                            {aiInsights.topics.map((topic: any, i: number) => (
                              <div key={i} className="space-y-2">
                                <p className="text-sm font-semibold">{topic.title}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {topic.summary}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-center px-8">
                       <Bot className="h-10 w-10 text-muted-foreground/30 mb-4" />
                       <p className="text-sm text-muted-foreground">No insights yet.</p>
                       <p className="text-xs text-muted-foreground/60 mt-1">End the meeting to trigger the full AI analysis pipeline.</p>
                    </div>
                  )}
                </div>
             </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
