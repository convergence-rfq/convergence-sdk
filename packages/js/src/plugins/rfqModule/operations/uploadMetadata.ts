import cloneDeep from 'lodash.clonedeep';
import { isConvergenceFile, ConvergenceFile } from '../../storageModule';
import { JsonMetadata } from '../models';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { walk } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'UploadMetadataOperation' as const;

/**
 * Uploads a JSON Metadata object to the current storage provider.
 *
 * ```ts
 * const { uri } = await convergence
 *   .rfqs()
 *   .uploadMetadata({
 *     name: "My NFT",
 *     description: "My description",
 *     image: "https://arweave.net/123",
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const uploadMetadataOperation =
  useOperation<UploadMetadataOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UploadMetadataOperation = Operation<
  typeof Key,
  UploadMetadataInput,
  UploadMetadataOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UploadMetadataInput = JsonMetadata<ConvergenceFile | string>;

/**
 * @group Operations
 * @category Outputs
 */
export type UploadMetadataOutput = {
  /** The uploaded JSON metadata. */
  metadata: JsonMetadata;

  /**
   * The URIs of all assets that were uploaded
   * within the provided metadata.
   */
  assetUris: string[];

  /** The URI of the uploaded JSON metadata. */
  uri: string;
};

/**
 * @group Operations
 * @category Handlers
 */
export const uploadMetadataOperationHandler: OperationHandler<UploadMetadataOperation> =
  {
    handle: async (
      operation: UploadMetadataOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<UploadMetadataOutput> => {
      const rawMetadata = operation.input;
      const files = getAssetsFromJsonMetadata(rawMetadata);
      const assetUris = await convergence.storage().uploadAll(files);
      scope.throwIfCanceled();

      const metadata = replaceAssetsWithUris(rawMetadata, assetUris);
      const uri = await convergence.storage().uploadJson(metadata);

      return { uri, metadata, assetUris };
    },
  };

export const getAssetsFromJsonMetadata = (
  input: UploadMetadataInput
): ConvergenceFile[] => {
  const files: ConvergenceFile[] = [];

  walk(input, (next, value) => {
    if (isConvergenceFile(value)) {
      files.push(value);
    } else {
      next(value);
    }
  });

  return files;
};

export const replaceAssetsWithUris = (
  input: UploadMetadataInput,
  replacements: string[]
): JsonMetadata => {
  const clone = cloneDeep(input);
  let index = 0;

  walk(clone, (next, value, key, parent) => {
    if (isConvergenceFile(value) && index < replacements.length) {
      parent[key] = replacements[index++];
    }

    next(value);
  });

  return clone as JsonMetadata;
};
