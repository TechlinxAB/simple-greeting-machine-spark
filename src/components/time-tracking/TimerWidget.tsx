
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Play, Pause, Square, Timer, Save, Trash2, AlertCircle } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Timer as TimerType } from '@/types/timer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/formatCurrency';

interface CompletedTimer extends TimerType {
  _calculatedDuration?: number;
  _roundedDuration?: number;
}

export function TimerWidget() {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [completedTimer, setCompletedTimer] = useState<CompletedTimer | null>(null);
  const { t } = useTranslation();
  
  const { 
    activeTimer, 
    isLoading, 
    isTimerRunning, 
    elapsedSeconds, 
    formatElapsedTime,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    convertTimerToTimeEntry,
    deleteTimer
  } = useTimer();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Only fetch activities (type = 'activity')
  const { data: activities = [] } = useQuery({
    queryKey: ['products-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('type', 'activity')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const handleStartTimer = async () => {
    if (!clientId || !productId) return;
    await startTimer(clientId, productId, description);
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    const stopped = await stopTimer();
    if (stopped) {
      setCompletedTimer(stopped as CompletedTimer);
      setConfirmDialogOpen(true);
    }
  };

  const handleConvertToTimeEntry = async () => {
    if (!completedTimer) return;
    const success = await convertTimerToTimeEntry(
      completedTimer.id, 
      completedTimer._calculatedDuration,
      completedTimer._roundedDuration
    );
    if (success) {
      setCompletedTimer(null);
      setConfirmDialogOpen(false);
    }
  };

  const handleDeleteTimer = async () => {
    if (!completedTimer) return;
    const success = await deleteTimer(completedTimer.id);
    if (success) {
      setCompletedTimer(null);
      setConfirmDialogOpen(false);
    }
  };

  const resetForm = () => {
    setClientId('');
    setProductId('');
    setDescription('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            <span>{t("timeTracking.timer")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeTimer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            <span>{t("timeTracking.activeTimer")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-mono font-bold">
                {formatElapsedTime(elapsedSeconds)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-sm font-medium">{t("clients.client")}:</span>
                  <div className="text-sm">
                    {clients.find(c => c.id === activeTimer.client_id)?.name || t("clients.unknownClient")}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">{t("products.activity")}:</span>
                  <div className="text-sm">
                    {activities.find(p => p.id === activeTimer.product_id)?.name || t("products.unknownActivity")}
                  </div>
                </div>
              </div>
              
              {activeTimer.description && (
                <div>
                  <span className="text-sm font-medium">{t("timeTracking.description")}:</span>
                  <div className="text-sm bg-secondary/50 p-2 rounded-md mt-1">
                    {activeTimer.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          {isTimerRunning ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={pauseTimer}
              className="flex items-center gap-1"
            >
              <Pause className="h-4 w-4" />
              <span>{t("timeTracking.pauseTimer")}</span>
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resumeTimer}
              className="flex items-center gap-1"
            >
              <Play className="h-4 w-4" />
              <span>{t("timeTracking.resumeTimer")}</span>
            </Button>
          )}
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleStopTimer}
            className="flex items-center gap-1"
          >
            <Square className="h-4 w-4" />
            <span>{t("timeTracking.stopTimer")}</span>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            <span>{t("timeTracking.startTimer")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("timeTracking.selectClient")}</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("clients.selectClient")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {clientId && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("timeTracking.selectActivity")}</label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("timeTracking.selectActivity")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.name} - {formatCurrency(activity.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("timeTracking.descriptionOptional")}</label>
                  <Textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("timeTracking.descriptionPlaceholder")}
                    className="resize-none"
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={handleStartTimer}
            disabled={!clientId || !productId}
            className="w-full flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            <span>{t("timeTracking.startTimer")}</span>
          </Button>
        </CardFooter>
      </Card>
      
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("timeTracking.timerCompleted")}</AlertDialogTitle>
            <AlertDialogDescription>
              <div>
                <div className="flex items-start gap-2 text-amber-500 mb-4">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>{t("timeTracking.timerCompletedQuestion")}</span>
                </div>
                
                <div className="bg-secondary/50 p-3 rounded-md mb-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">{t("clients.client")}:</span>{' '}
                      {clients.find(c => c.id === completedTimer?.client_id)?.name}
                    </div>
                    <div>
                      <span className="font-medium">{t("timeTracking.duration")}:</span>{' '}
                      {completedTimer?._roundedDuration !== undefined ? 
                        formatElapsedTime(completedTimer._roundedDuration) : 
                        (completedTimer?._calculatedDuration !== undefined ?
                          formatElapsedTime(completedTimer._calculatedDuration) :
                          formatElapsedTime(elapsedSeconds))
                      }
                      {completedTimer?._calculatedDuration !== undefined && 
                       completedTimer?._roundedDuration !== undefined && 
                       completedTimer._calculatedDuration !== completedTimer._roundedDuration && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({t("timeTracking.roundedFrom")} {formatElapsedTime(completedTimer._calculatedDuration)})
                        </span>
                      )}
                    </div>
                    {completedTimer?.description && (
                      <div className="col-span-2">
                        <span className="font-medium">{t("timeTracking.description")}:</span>{' '}
                        {completedTimer.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTimer();
              }}
              className="flex items-center gap-1 bg-transparent border border-destructive text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t("timeTracking.deleteTimer")}</span>
            </AlertDialogAction>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConvertToTimeEntry();
              }}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              <span>{t("timeTracking.convertToTimeEntry")}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
