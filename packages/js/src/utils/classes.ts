import { Rfq } from '@/plugins/rfqModule';

export class RfqTimers {
  public timestampExpiry: Date;
  public timestampStart: Date;
  public timeStampSettlement: Date;

  constructor(rfq: Rfq) {
    this.timestampStart = new Date(Number(rfq.creationTimestamp));
    this.timestampExpiry = new Date(
      this.timestampStart.getTime() + Number(rfq.activeWindow) * 1000
    );
    this.timeStampSettlement = new Date(
      this.timestampExpiry.getTime() + Number(rfq.settlingWindow) * 1000
    );
  }

  isRfqExpired(): boolean {
    return Date.now() >= this.timestampExpiry.getTime();
  }

  isRfqSettlementWindowElapsed(): boolean {
    return Date.now() >= this.timeStampSettlement.getTime();
  }
}
