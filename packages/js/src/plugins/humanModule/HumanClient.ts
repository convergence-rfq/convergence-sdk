import { PublicKey } from '@solana/web3.js';
import { Convergence } from '../../Convergence';
import {
  baseAssetsCache,
  protocolCache,
  registeredMintsCache,
} from '../protocolModule';
import { HumanOrderType } from './types';
import {
  HumanProtocol,
  HumanBaseAsset,
  HumanRegisteredMint,
  toHumanProtocol,
  toHumanBaseAsset,
  toHumanRegisteredMint,
} from './models';
import { createRfq } from './helpers';

/**
 * @group Modules
 */
export class HumanClient {
  constructor(protected readonly convergence: Convergence) {}

  async getProtocol(): Promise<HumanProtocol> {
    const protocol = await protocolCache.get(this.convergence);
    return toHumanProtocol(protocol);
  }

  async getBaseAssets(): Promise<HumanBaseAsset[]> {
    const baseAssets = await baseAssetsCache.get(this.convergence);
    return baseAssets.map(toHumanBaseAsset);
  }

  async getRegisteredMints(): Promise<HumanRegisteredMint[]> {
    const registeredMints = await registeredMintsCache.get(this.convergence);
    return registeredMints.map(toHumanRegisteredMint);
  }

  async createRfq(
    amount: number,
    orderType: HumanOrderType,
    baseMintPk: PublicKey,
    quoteMintPk: PublicKey
  ): Promise<any> {
    return await createRfq(
      this.convergence,
      amount,
      orderType,
      baseMintPk,
      quoteMintPk
    );
  }
}
