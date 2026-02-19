import * as DrawerModule from '@msviderok/base-ui-solid/drawer';
import { describe, expect, it } from 'vitest';

describe('<Drawer.SwipeArea />', () => {
  it('is not part of the public DrawerPreview API', () => {
    expect('SwipeArea' in DrawerModule.DrawerPreview).toBe(false);
  });

  it('is not exported from @msviderok/base-ui-solid/drawer', () => {
    expect('DrawerSwipeArea' in DrawerModule).toBe(false);
  });
});
