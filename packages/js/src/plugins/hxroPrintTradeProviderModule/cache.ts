import dexterity from '@hxronetwork/dexterity-ts';
import { toHxroPrintTradeProviderConfig } from './models';
import { toHxroPrintTradeProviderConfigAccount } from './accounts';
import { Convergence } from '@/Convergence';
import { CvgWallet, useCache } from '@/utils';

export const configCache = useCache(
  async (cvg: Convergence, commitment = 'confirmed') => {
    const configAddress = cvg.hxro().pdas().config();
    const account = await cvg.rpc().getAccount(configAddress, commitment);
    const configAccount = toHxroPrintTradeProviderConfigAccount(account);

    return toHxroPrintTradeProviderConfig(configAccount);
  }
);

export const hxroManifestCache = useCache(async (cvg: Convergence) => {
  // dexterity.getManifest adds a lot of clutter to logs, so we disable console.debug for this call
  // TODO: remove this workaround when dexterity library is updated
  const { debug } = console;
  console.debug = () => {};
  let manifest: any; // dexterity doesn't export a type for a manifest
  try {
    // @ts-ignore the next line fixes a strange issue with dexterity default export when imported from .mjs files
    const getManifest = dexterity.getManifest ?? dexterity.default.getManifest;

    manifest = await getManifest(
      cvg.connection.rpcEndpoint,
      true,
      new CvgWallet(cvg)
    );
  } finally {
    console.debug = debug;
  }

  return manifest;
});
