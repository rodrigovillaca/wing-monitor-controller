import { render, screen } from '@testing-library/react';
import { VolumeKnob } from './VolumeKnob';
import { describe, it, expect, vi } from 'vitest';

describe('VolumeKnob', () => {
  const mockOnChange = vi.fn();

  it('renders correctly with default props', () => {
    render(<VolumeKnob value={50} onChange={mockOnChange} />);
    expect(screen.getByTestId('volume-knob')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays percentage correctly', () => {
    render(<VolumeKnob value={75} onChange={mockOnChange} displayUnit="percent" />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('displays dB correctly', () => {
    // 20 * log10(100/100) = 0 dB
    render(<VolumeKnob value={100} onChange={mockOnChange} displayUnit="db" unityLevel={100} />);
    expect(screen.getByText('0.0 dB')).toBeInTheDocument();

    // 20 * log10(50/100) = -6.0 dB
    render(<VolumeKnob value={50} onChange={mockOnChange} displayUnit="db" unityLevel={100} />);
    expect(screen.getByText('-6.0 dB')).toBeInTheDocument();
  });

  it('displays -∞ for 0 value in dB mode', () => {
    render(<VolumeKnob value={0} onChange={mockOnChange} displayUnit="db" unityLevel={100} />);
    expect(screen.getByText('-∞ dB')).toBeInTheDocument();
  });

  it('respects unityLevel setting', () => {
    // If unity level is 80, then 80 should be 0dB
    render(<VolumeKnob value={80} onChange={mockOnChange} displayUnit="db" unityLevel={80} />);
    expect(screen.getByText('0.0 dB')).toBeInTheDocument();
  });
});
