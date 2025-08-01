import { timer, animationFrameScheduler } from 'rxjs';

it('should infer correctly with 1 parameter of number type', () => {
  const a = timer(1); // $ExpectType Observable<0>
});

it('should infer correctly with 1 parameter of date type', () => {
  const a = timer((DateTime.now())); // $ExpectType Observable<0>
});

it('should not support string parameter', () => {
  const a = timer('a'); // $ExpectError
});

it('should infer correctly with 2 parameters', () => {
  const a = timer(1, 2); // $ExpectType Observable<number>
});

it('should support scheduler as second parameter', () => {
  const a = timer(1, animationFrameScheduler); // $ExpectType Observable<0>
});

it('should support scheduler as third parameter', () => {
  const a = timer(1, 2, animationFrameScheduler); // $ExpectType Observable<number>
});
