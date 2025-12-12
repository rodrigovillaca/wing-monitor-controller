import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StereoMeter } from './StereoMeter';

describe('StereoMeter', () => {
  it('renders correctly', () => {
    const { container } = render(<StereoMeter left={0.5} right={0.5} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with zero levels', () => {
    const { container } = render(<StereoMeter left={0} right={0} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with max levels', () => {
    const { container } = render(<StereoMeter left={1} right={1} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
