import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { describe, it, expect, vi } from 'vitest';

describe('SettingsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const defaultSettings = {
    volumeUnit: 'percent' as const,
    unityLevel: 100
  };

  it('renders correctly when open', () => {
    render(
      <SettingsModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
        initialSettings={defaultSettings} 
      />
    );
    expect(screen.getByText('SETTINGS')).toBeInTheDocument();
    expect(screen.getByText('Volume Display Unit')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <SettingsModal 
        isOpen={false} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
        initialSettings={defaultSettings} 
      />
    );
    expect(screen.queryByText('SETTINGS')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <SettingsModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
        initialSettings={defaultSettings} 
      />
    );
    const closeButton = screen.getAllByRole('button')[0]; // First button is usually close (X)
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('updates settings state when options are clicked', () => {
    render(
      <SettingsModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
        initialSettings={defaultSettings} 
      />
    );
    
    const dbButton = screen.getByText('DECIBELS (dB)');
    fireEvent.click(dbButton);
    
    // Check if the button style changed (active state)
    expect(dbButton).toHaveClass('bg-accent');
  });

  it('calls onSave with new settings when save button is clicked', () => {
    render(
      <SettingsModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
        initialSettings={defaultSettings} 
      />
    );
    
    const dbButton = screen.getByText('DECIBELS (dB)');
    fireEvent.click(dbButton);
    
    const saveButton = screen.getByText('SAVE SETTINGS');
    fireEvent.click(saveButton);
    
    expect(mockOnSave).toHaveBeenCalledWith({
      volumeUnit: 'db',
      unityLevel: 100
    });
  });
});
