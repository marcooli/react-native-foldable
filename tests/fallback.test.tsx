import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import HingeNativeView from '../src/HingeNativeView';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('loads the non-iOS implementation without importing native React Native bindings', async () => {
  const onChange = vi.fn();
  let root!: ReactTestRenderer;
  await act(() => { root = create(<HingeNativeView onChange={onChange} includeInactiveRegions={false} />); });
  expect(onChange).toHaveBeenCalledWith({ available: false, status: 'unknown', angleRadians: 0, reason: 'unsupported-platform', regions: [] });
  await act(() => { root.unmount(); });
});
