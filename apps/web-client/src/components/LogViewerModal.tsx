import React, { useEffect, useRef } from 'react';
import { X, Terminal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  onSendCommand: (address: string, args: any[]) => void;
}

export function LogViewerModal({ isOpen, onClose, logs, onSendCommand }: LogViewerModalProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [command, setCommand] = React.useState('');
  const [args, setArgs] = React.useState('');

  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Terminal size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Backend Logs</h2>
              <p className="text-sm text-muted-foreground">Real-time server logs for troubleshooting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Log Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-black/90 font-mono text-xs md:text-sm">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <Terminal size={48} className="mb-4 opacity-20" />
              <p>No logs available yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => {
                const isError = log.includes('[ERROR]');
                return (
                  <div 
                    key={index} 
                    className={cn(
                      "break-all whitespace-pre-wrap",
                      isError ? "text-red-400" : "text-green-400"
                    )}
                  >
                    {log}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex flex-col gap-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="/osc/address" 
              className="flex-1 bg-background border border-input px-3 py-2 rounded text-sm font-mono"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && command) {
                  // Parse args if any
                  let parsedArgs: any[] = [];
                  if (args) {
                    try {
                      // Try to parse as JSON array first
                      if (args.startsWith('[')) {
                        parsedArgs = JSON.parse(args);
                      } else {
                        // Split by comma and try to infer types
                        parsedArgs = args.split(',').map(a => {
                          const trimmed = a.trim();
                          if (!isNaN(Number(trimmed))) return { type: 'f', value: Number(trimmed) };
                          return { type: 's', value: trimmed };
                        });
                      }
                    } catch (e) {
                      console.error('Failed to parse args', e);
                    }
                  }
                  onSendCommand(command, parsedArgs);
                  setCommand('');
                  setArgs('');
                }
              }}
            />
            <input 
              type="text" 
              placeholder="Args (e.g. 0.5 or [1, 0])" 
              className="w-1/3 bg-background border border-input px-3 py-2 rounded text-sm font-mono"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
            />
            <button 
              className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-bold hover:bg-primary/90"
              onClick={() => {
                if (command) {
                  let parsedArgs: any[] = [];
                  if (args) {
                    try {
                      if (args.startsWith('[')) {
                        parsedArgs = JSON.parse(args);
                      } else {
                        parsedArgs = args.split(',').map(a => {
                          const trimmed = a.trim();
                          if (!isNaN(Number(trimmed))) return { type: 'f', value: Number(trimmed) };
                          return { type: 's', value: trimmed };
                        });
                      }
                    } catch (e) {
                      console.error('Failed to parse args', e);
                    }
                  }
                  onSendCommand(command, parsedArgs);
                  setCommand('');
                  setArgs('');
                }
              }}
            >
              SEND
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Showing last {logs.length} lines
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
