import { Buffer } from 'buffer';

import { getContentType, getExtension, randomStr } from '../../utils';
import { InvalidJsonVariableError } from '../../errors';

export type ConvergenceFile = {
  readonly buffer: Buffer;
  readonly fileName: string;
  readonly displayName: string;
  readonly uniqueName: string;
  readonly contentType: string | null;
  readonly extension: string | null;
  readonly tags: ConvergenceFileTag[];
};

export type ConvergenceFileContent = string | Buffer | Uint8Array | ArrayBuffer;

export type ConvergenceFileTag = { name: string; value: string };

export type ConvergenceFileOptions = {
  displayName?: string;
  uniqueName?: string;
  contentType?: string;
  extension?: string;
  tags?: { name: string; value: string }[];
};

export const toConvergenceFile = (
  content: ConvergenceFileContent,
  fileName: string,
  options: ConvergenceFileOptions = {}
): ConvergenceFile => ({
  buffer: parseConvergenceFileContent(content),
  fileName,
  displayName: options.displayName ?? fileName,
  uniqueName: options.uniqueName ?? randomStr(),
  contentType: options.contentType ?? getContentType(fileName),
  extension: options.extension ?? getExtension(fileName),
  tags: options.tags ?? [],
});

export const toConvergenceFileFromBrowser = async (
  file: File,
  options: ConvergenceFileOptions = {}
): Promise<ConvergenceFile> => {
  const buffer = await file.arrayBuffer();
  return toConvergenceFile(buffer, file.name, options);
};

export const toConvergenceFileFromJson = <T extends object = object>(
  json: T,
  fileName = 'inline.json',
  options: ConvergenceFileOptions = {}
): ConvergenceFile => {
  let jsonString;

  try {
    jsonString = JSON.stringify(json);
  } catch (error) {
    throw new InvalidJsonVariableError({ cause: error as Error });
  }

  return toConvergenceFile(jsonString, fileName, options);
};

export const parseConvergenceFileContent = (
  content: ConvergenceFileContent
): Buffer => {
  if (content instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(content));
  }

  return Buffer.from(content);
};

export const getBytesFromConvergenceFiles = (
  ...files: ConvergenceFile[]
): number => files.reduce((acc, file) => acc + file.buffer.byteLength, 0);

export const getBrowserFileFromConvergenceFile = (
  file: ConvergenceFile
): File => new File([file.buffer as BlobPart], file.fileName);

export const isConvergenceFile = (
  convergenceFile: any
): convergenceFile is ConvergenceFile => {
  return (
    convergenceFile != null &&
    typeof convergenceFile === 'object' &&
    'buffer' in convergenceFile &&
    'fileName' in convergenceFile &&
    'displayName' in convergenceFile &&
    'uniqueName' in convergenceFile &&
    'contentType' in convergenceFile &&
    'extension' in convergenceFile &&
    'tags' in convergenceFile
  );
};
