import { RequestInit } from 'node-fetch';
import { ConvergenceFile } from './ConvergenceFile';
import { Amount } from '@/types';

export type StorageDriver = {
  getUploadPrice: (bytes: number) => Promise<Amount>;
  upload: (file: ConvergenceFile) => Promise<string>;
  uploadAll?: (files: ConvergenceFile[]) => Promise<string[]>;
  download?: (
    uri: string,
    options?: StorageDownloadOptions
  ) => Promise<ConvergenceFile>;
};

export type StorageDownloadOptions = Omit<RequestInit, 'signal'> & {
  signal?: AbortSignal | null;
};
