import fetch, { RequestInit } from 'node-fetch';
import {
  getBytesFromConvergenceFiles,
  ConvergenceFile,
  toConvergenceFile,
  toConvergenceFileFromJson,
} from './ConvergenceFile';
import { StorageDownloadOptions, StorageDriver } from './StorageDriver';
import { Amount, HasDriver } from '@/types';
import { DriverNotProvidedError, InvalidJsonStringError } from '@/errors';

/**
 * @group Modules
 */
export class StorageClient implements HasDriver<StorageDriver> {
  private _driver: StorageDriver | null = null;

  driver(): StorageDriver {
    if (!this._driver) {
      throw new DriverNotProvidedError('StorageDriver');
    }

    return this._driver;
  }

  /** Helper method to set the driver. */
  setDriver(newDriver: StorageDriver): void {
    this._driver = newDriver;
  }

  /** Helper method to get the upload price for a specific number of bytes. */
  getUploadPriceForBytes(bytes: number): Promise<Amount> {
    return this.driver().getUploadPrice(bytes);
  }

  /** Helper method to get the upload price for a specified file. */
  getUploadPriceForFile(file: ConvergenceFile): Promise<Amount> {
    return this.getUploadPriceForFiles([file]);
  }

  /** Helper method to get the upload price for multiple files. */
  getUploadPriceForFiles(files: ConvergenceFile[]): Promise<Amount> {
    return this.getUploadPriceForBytes(getBytesFromConvergenceFiles(...files));
  }

  /** Helper method to upload a file. */
  upload(file: ConvergenceFile): Promise<string> {
    return this.driver().upload(file);
  }

  /** Helper method to upload multiple files. */
  uploadAll(files: ConvergenceFile[]): Promise<string[]> {
    const driver = this.driver();

    return driver.uploadAll
      ? driver.uploadAll(files)
      : Promise.all(files.map((file) => this.driver().upload(file)));
  }

  /** Helper method to upload a JSON object. */
  uploadJson<T extends object = object>(json: T): Promise<string> {
    return this.upload(toConvergenceFileFromJson<T>(json));
  }

  /** Helper method to download a file. */
  async download(
    uri: string,
    options?: StorageDownloadOptions
  ): Promise<ConvergenceFile> {
    const driver = this.driver();

    if (driver.download) {
      return driver.download(uri, options);
    }

    const response = await fetch(uri, options as RequestInit);
    const buffer = await response.arrayBuffer();

    return toConvergenceFile(buffer, uri);
  }

  /** Helper method to download a JSON object. */
  async downloadJson<T extends object = object>(
    uri: string,
    options?: StorageDownloadOptions
  ): Promise<T> {
    const file = await this.download(uri, options);

    try {
      return JSON.parse(file.buffer.toString());
    } catch (error) {
      throw new InvalidJsonStringError({ cause: error as Error });
    }
  }
}
