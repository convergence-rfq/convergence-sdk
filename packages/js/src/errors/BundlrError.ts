import {
  ConvergenceError,
  ConvergenceErrorInputWithoutSource,
  ConvergenceErrorOptions,
} from './ConvergenceError';

/** @group Errors */
export class BundlrError extends ConvergenceError {
  constructor(input: ConvergenceErrorInputWithoutSource) {
    super({
      ...input,
      key: `plugin.bundlr.${input.key}`,
      title: `Bundlr > ${input.title}`,
      source: 'plugin',
      sourceDetails: 'Bundlr',
    });
  }
}

/** @group Errors */
export class FailedToInitializeBundlrError extends BundlrError {
  constructor(options?: ConvergenceErrorOptions) {
    super({
      options,
      key: 'failed_to_initialize_bundlr',
      title: 'Failed to Initialize Bundlr',
      problem: 'Bundlr could not be initialized.',
      solution:
        'This could happen for a variety of reasons. ' +
        'Check the underlying error below for more information.',
    });
  }
}

/** @group Errors */
export class FailedToConnectToBundlrAddressError extends BundlrError {
  constructor(address: string, options?: ConvergenceErrorOptions) {
    super({
      options,
      key: 'failed_to_connect_to_bundlr_address',
      title: 'Failed to Connect to Bundlr Address',
      problem: `Bundlr could not connect to the provided address [${address}].`,
      solution:
        'Ensure the provided address is valid. Some valid addresses include: ' +
        '"https://node1.bundlr.network" for mainnet and "https://devnet.bundlr.network" for devnet',
    });
  }
}

/** @group Errors */
export class AssetUploadFailedError extends BundlrError {
  constructor(status: number, options?: ConvergenceErrorOptions) {
    super({
      options,
      key: 'asset_upload_failed',
      title: 'Asset Upload Failed',
      problem:
        'The asset could not be uploaded to the Bundlr network and ' +
        `returned the following status code [${status}].`,
      solution:
        'Check the provided status code for more information. For now, this is all we get ' +
        // eslint-disable-next-line quotes
        "from Bundlr's API but we'll improve this error message as we get more information.",
    });
  }
}

/** @group Errors */
export class BundlrWithdrawError extends BundlrError {
  constructor(status: number, options?: ConvergenceErrorOptions) {
    super({
      options,
      key: 'bundlr_withdraw_error',
      title: 'Bundlr Withdraw Error',
      problem:
        'The balance could not be withdrawn from the Bundlr network and ' +
        `returned the following status code [${status}].`,
      solution:
        'Check the provided status code for more information. For now, this is all we get ' +
        // eslint-disable-next-line quotes
        "from Bundlr's API but we'll improve this error message as we get more information.",
    });
  }
}
