import React from 'react';
import { X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { CommandQueueItem } from '@wing-monitor/monitor-frontend';
import { cn } from '@/lib/utils';

interface CommandQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: CommandQueueItem[];
  onClear: () => void;
}

export function CommandQueueModal({ isOpen, onClose, queue, onClear }: CommandQueueModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-neu-base p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-800 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-rajdhani font-bold text-2xl text-foreground tracking-wider">COMMAND QUEUE</h2>
          <div className="flex items-center gap-4">
            {queue.length > 0 && (
              <button 
                onClick={onClear}
                className="text-xs font-rajdhani font-bold text-red-500 hover:text-red-400 transition-colors border border-red-500/30 hover:border-red-500/60 px-3 py-1 rounded-lg"
              >
                CLEAR HISTORY
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto neu-pressed rounded-xl p-4 space-y-2">
          {queue.length === 0 ? (
            <div className="text-center text-muted-foreground font-rajdhani py-8">Queue is empty</div>
          ) : (
            queue.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-neu-base rounded-lg border border-gray-800/50">
                <div className="flex items-center gap-3">
                  {item.status === 'sent' && <CheckCircle size={16} className="text-green-500" />}
                  {item.status === 'pending' && <Clock size={16} className="text-yellow-500 animate-pulse" />}
                  {item.status === 'failed' && <AlertCircle size={16} className="text-red-500" />}
                  
                  <div className="flex flex-col">
                    <span className={cn(
                      "font-mono text-sm",
                      item.status === 'sent' ? "text-green-500/80" : 
                      item.status === 'failed' ? "text-red-500/80" : "text-accent"
                    )}>
                      {item.address}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                  {JSON.stringify(item.args)}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-4 text-right text-xs text-muted-foreground font-rajdhani">
          {queue.length} items pending
        </div>
      </div>
    </div>
  );
}
