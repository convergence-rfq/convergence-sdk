import * as borsh from '@coral-xyz/borsh'; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from 'bn.js';
import Big from 'big.js';

export interface SwitchboardDecimalFields {
  /**
   * The part of a floating-point number that represents the significant digits of that number,
   * and that is multiplied by the base, 10, raised to the power of scale to give the actual value of the number.
   */
  mantissa: BN;
  /** The number of decimal places to move to the left to yield the actual value. */
  scale: number;
}

export class SwitchboardDecimal {
  /**
   * The part of a floating-point number that represents the significant digits of that number,
   * and that is multiplied by the base, 10, raised to the power of scale to give the actual value of the number.
   */
  readonly mantissa: BN;
  /** The number of decimal places to move to the left to yield the actual value. */
  readonly scale: number;

  constructor(fields: SwitchboardDecimalFields) {
    this.mantissa = fields.mantissa;
    this.scale = fields.scale;
  }

  static layout(property?: string) {
    return borsh.struct([borsh.i128('mantissa'), borsh.u32('scale')], property);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new SwitchboardDecimal({
      mantissa: obj.mantissa,
      scale: obj.scale,
    });
  }

  public toBig(): Big {
    let mantissa: BN = new BN(this.mantissa, 10);
    let s = 1;
    const c: Array<number> = [];
    const ZERO = new BN(0, 10);
    const TEN = new BN(10, 10);
    if (mantissa.lt(ZERO)) {
      s = -1;
      mantissa = mantissa.abs();
    }
    while (mantissa.gt(ZERO)) {
      c.unshift(mantissa.mod(TEN).toNumber());
      mantissa = mantissa.div(TEN);
    }
    const e = c.length - this.scale - 1;
    const result = new Big(0);
    if (c.length === 0) {
      return result;
    }
    result.s = s;
    result.c = c;
    result.e = e;
    return result;
  }
}
