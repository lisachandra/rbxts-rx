export class SubscriptionLog {
  constructor(
    public subscribedFrame: number,
    public unsubscribedFrame: number = math.huge
  ) {}
}
