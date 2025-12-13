import { render } from '@testing-library/react';

import MonitorFrontend from './monitor-frontend';

describe('MonitorFrontend', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<MonitorFrontend />);
    expect(baseElement).toBeTruthy();
  });
});
