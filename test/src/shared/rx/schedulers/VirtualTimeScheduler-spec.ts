import { describe, beforeEach, it, expect, afterAll, beforeAll, afterEach, jest, test } from '@rbxts/jest-globals';
import { SchedulerAction, VirtualAction, VirtualTimeScheduler } from '@rbxts/rx';

/** @test {VirtualTimeScheduler} */
describe('VirtualTimeScheduler', () => {
  it('should exist', () => {
    expect(VirtualTimeScheduler).toBeDefined();
    expect(type(VirtualTimeScheduler)).toBe('function');
  });

  it('should schedule things in order when flushed if each this is scheduled synchronously', () => {
    const v = new VirtualTimeScheduler();
    const invoked: number[] = [];
    const invoke: any = (state: number) => {
      invoked.push(state);
    };
    v.schedule(invoke, 0, 1);
    v.schedule(invoke, 0, 2);
    v.schedule(invoke, 0, 3);
    v.schedule(invoke, 0, 4);
    v.schedule(invoke, 0, 5);

    v.flush();

    expect(invoked).toEqual([1, 2, 3, 4, 5]);
  });

  it('should schedule things in order when flushed if each this is scheduled at random', () => {
    const v = new VirtualTimeScheduler();
    const invoked: number[] = [];
    const invoke: any = (state: number) => {
      invoked.push(state);
    };
    v.schedule(invoke, 0, 1);
    v.schedule(invoke, 100, 2);
    v.schedule(invoke, 0, 3);
    v.schedule(invoke, 500, 4);
    v.schedule(invoke, 0, 5);
    v.schedule(invoke, 100, 6);

    v.flush();

    expect(invoked).toEqual([1, 3, 5, 2, 6, 4]);
  });

  it('should schedule things in order when there are negative delays', () => {
    const v = new VirtualTimeScheduler();
    const invoked: number[] = [];
    const invoke: any = (state: number) => {
      invoked.push(state);
    };
    v.schedule(invoke, 0, 1);
    v.schedule(invoke, 100, 2);
    v.schedule(invoke, 0, 3);
    v.schedule(invoke, -2, 4);
    v.schedule(invoke, 0, 5);
    v.schedule(invoke, -10, 6);

    v.flush();

    expect(invoked).toEqual([6, 4, 1, 3, 5, 2]);
  });

  it('should support recursive scheduling', () => {
    const v = new VirtualTimeScheduler();
    let count = 0;
    const expected = [100, 200, 300];

    v.schedule<string>(
      function (this: SchedulerAction<string>, state?: string) {
        if (++count === 3) {
          return;
        }
        const virtualAction = this as VirtualAction<string>;
        expect(virtualAction.delay).toEqual(expected.shift());
        this.schedule(state, virtualAction.delay);
      },
      100,
      'test'
    );

    v.flush();
    expect(count).toEqual(3);
  });

  it('should not execute virtual actions that have been rescheduled before flush', () => {
    const v = new VirtualTimeScheduler();
    const messages: string[] = [];

    const action: VirtualAction<string> = <VirtualAction<string>>v.schedule((state) => messages.push(state!), 10, 'first message');

    action.schedule('second message', 10);
    v.flush();

    expect(messages).toEqual(['second message']);
  });

  it('should execute only those virtual actions that fall into the maxFrames timespan', function () {
    const MAX_FRAMES = 50;
    const v = new VirtualTimeScheduler(VirtualAction, MAX_FRAMES);
    const messages: string[] = ['first message', 'second message', 'third message'];

    const actualMessages: string[] = [];

    messages.forEach((message, index) => {
      v.schedule((state) => actualMessages.push(state!), index * MAX_FRAMES, message);
    });

    v.flush();

    expect(actualMessages).toEqual(['first message', 'second message']);
    expect(v.actions.map((a) => a.state)).toEqual(['third message']);
  });

  it('should pick up actions execution where it left off after reaching previous maxFrames limit', function () {
    const MAX_FRAMES = 50;
    const v = new VirtualTimeScheduler(VirtualAction, MAX_FRAMES);
    const messages: string[] = ['first message', 'second message', 'third message'];

    const actualMessages: string[] = [];

    messages.forEach((message, index) => {
      v.schedule((state) => actualMessages.push(state!), index * MAX_FRAMES, message);
    });

    v.flush();
    v.maxFrames = 2 * MAX_FRAMES;
    v.flush();

    expect(actualMessages).toEqual(messages);
  });
});
