import * as index from '@rbxts/rx/out/testing';
import { expect } from 'chai';

describe('index', () => {
  it('should export TestScheduler', () => {
    expect(index.TestScheduler).to.exist;
  });
});
