import dexterity from '@hxronetwork/dexterity-ts';
import { Convergence } from '@/Convergence';
import { CvgWallet } from '@/utils';

export const getHxroManifest = async (cvg: Convergence) => {
  // dexterity.getManifest adds a lot of clutter to logs, so we disable console.debug for this call
  // TODO: remove this workaround when dexterity library is updated
  const { debug } = console;
  console.debug = () => {};
  let manifest: any; // dexterity doesn't export a type for a manifest
  try {
    manifest = await dexterity.getManifest(
      cvg.connection.rpcEndpoint,
      true,
      new CvgWallet(cvg)
    );
  } finally {
    console.debug = debug;
  }

  return manifest;
};

export const fetchValidHxroMpg = async (cvg: Convergence, manifest: any) => {
  const { validMpg } = await cvg.hxro().fetchConfig();

  const mpg = await manifest.getMPG(validMpg);
  return { pubkey: validMpg, ...mpg };
};
