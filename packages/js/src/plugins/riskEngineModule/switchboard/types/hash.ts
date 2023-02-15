import * as borsh from '@coral-xyz/borsh'; // eslint-disable-line @typescript-eslint/no-unused-vars

export interface HashFields {
  /** The bytes used to derive the hash. */
  data: Array<number>;
}

export class Hash {
  /** The bytes used to derive the hash. */
  readonly data: Array<number>;

  constructor(fields: HashFields) {
    this.data = fields.data;
  }

  static layout(property?: string) {
    return borsh.struct([borsh.array(borsh.u8(), 32, 'data')], property);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new Hash({
      data: obj.data,
    });
  }
}
