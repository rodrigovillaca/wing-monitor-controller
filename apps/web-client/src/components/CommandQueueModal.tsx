import React from 'react';
import { X } from 'lucide-react';
import { CommandQueueItem } from '@wing-monitor/monitor-frontend';

interface CommandQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: CommandQueueItem[];
}

export function CommandQueueModal({ isOpen, onClose, queue }: CommandQueueModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-neu-base p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-800 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-rajdhani font-bold text-2xl text-foreground tracking-wider">COMMAND QUEUE</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto neu-pressed rounded-xl p-4 space-y-2">
          {queue.length === 0 ? (
            <div className="text-center text-muted-foreground font-rajdhani py-8">Queue is empty</div>
          ) : (
            queue.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-neu-base rounded-lg border border-gray-800/50">
                <div className="font-mono text-sm text-accent">{item.address}</div>
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
