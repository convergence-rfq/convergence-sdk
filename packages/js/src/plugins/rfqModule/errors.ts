import { PublicKey } from '@solana/web3.js';
import {
  ConvergenceError,
  ConvergenceErrorInputWithoutSource,
  ConvergenceErrorOptions,
} from '../../errors';

/** @group Errors */
export class RfqError extends ConvergenceError {
  constructor(input: ConvergenceErrorInputWithoutSource) {
    super({
      ...input,
      key: `plugin.nft.${input.key}`,
      title: `NFT > ${input.title}`,
      source: 'plugin',
      sourceDetails: 'NFT',
    });
  }
}

/** @group Errors */
export class ParentCollectionMissingError extends RfqError {
  constructor(
    mint: PublicKey,
    operation: string,
    options?: ConvergenceErrorOptions
  ) {
    super({
      options,
      key: 'parent_collection_missing',
      title: 'Parent Collection Missing',
      problem:
        `You are trying to send the operation [${operation}] which requires the NFT to have ` +
        `a parent collection but that is not the case for the NFT at address [${mint}].`,
      solution:
        'Ensure the NFT you are interacting with has a parent collection.',
    });
  }
}
