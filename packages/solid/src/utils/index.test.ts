import { isJSDOM } from '#test-utils';
import * as Utils from '@msviderok/base-ui-solid/utils';
import { expect } from 'chai';
import { describe, it } from 'vitest';

describe('@msviderok/base-ui-solid/utils', () => {
  it('should have exports', () => {
    expect(typeof Utils).to.equal('object');
  });

  it('should not have undefined exports', () => {
    Object.keys(Utils).forEach((exportKey) => {
      const value = (Utils as Record<string, unknown>)[exportKey];
      expect(value).not.to.equal(undefined);
    });
  });

  it.skipIf(!isJSDOM)('should expose the expected util surface', () => {
    expect(Utils.EMPTY_ARRAY).to.be.an('array');
    expect(Utils.NOOP).to.be.a('function');
    expect(Utils.formatErrorMessage).to.be.a('function');
    expect(Utils.expectType).to.be.a('function');
    expect(Utils.useTimeout).to.be.a('function');
    expect(Utils.useBaseUiId).to.be.a('function');
    expect(Utils.PopupTriggerMap).to.be.a('function');
  });
});
