import type { Convergence } from '../../Convergence';
import {
  OperationConstructor,
  Operation,
  KeyOfOperation,
  InputOfOperation,
  OutputOfOperation,
  OperationHandler,
  OperationOptions,
  OperationScope,
} from '../../types';
import { Disposable, DisposableScope } from '../../utils';
import { OperationHandlerMissingError } from '../../errors';
import { AsyncCollection, toCollection } from './AsyncCollection';

/**
 * @group Modules
 */
export class OperationClient {
  /**
   * Maps the name of an operation with its operation handler.
   * Whilst the types on the Map are relatively loose, we ensure
   * operations match with their handlers when registering them.
   */
  protected operationHandlers: Map<
    string,
    OperationHandler<any, any, any, any>
  > = new Map();
  constructor(protected readonly convergence: Convergence) {}

  register<
    T extends Operation<K, I, O>,
    K extends string = KeyOfOperation<T>,
    I = InputOfOperation<T>,
    O = OutputOfOperation<T>
  >(
    operationConstructor: OperationConstructor<T, K, I, O>,
    operationHandler: OperationHandler<T, K, I, O>
  ) {
    this.operationHandlers.set(operationConstructor.key, operationHandler);
    return this;
  }

  get<
    T extends Operation<K, I, O>,
    K extends string = KeyOfOperation<T>,
    I = InputOfOperation<T>,
    O = OutputOfOperation<T>
  >(operation: T): OperationHandler<T, K, I, O> {
    const operationHandler = this.operationHandlers.get(operation.key) as
      | OperationHandler<T, K, I, O>
      | undefined;

    if (!operationHandler) {
      throw new OperationHandlerMissingError(operation.key);
    }

    return operationHandler;
  }

  async execute<
    T extends Operation<K, I, O>,
    K extends string = KeyOfOperation<T>,
    I = InputOfOperation<T>,
    O = OutputOfOperation<T>
  >(operation: T, options: OperationOptions = {}): Promise<O> {
    const operationHandler = this.get<T, K, I, O>(operation);
    const signal = options.signal ?? new AbortController().signal;

    const process = async (scope: DisposableScope): Promise<O> => {
      const result = operationHandler.handle(
        operation,
        this.convergence,
        this.getOperationScope(options, scope)
      );

      if (Symbol.asyncIterator in Object(result)) {
        // throw new TypeError('You cannot call execute ')
        const values: O[] = [];
        for await (const value of result as AsyncGenerator<O, void, void>) {
          values.push(value);
        }
        return values as O | Promise<O>;
      }
      return (await result) as O | Promise<O>;
    };

    return new Disposable(signal).run(process);
  }

  executeSync<
    T extends Operation<K, I, O>,
    K extends string = KeyOfOperation<T>,
    I = InputOfOperation<T>,
    O = OutputOfOperation<T>
  >(operation: T, options: OperationOptions = {}): O {
    const operationHandler = this.get<T, K, I, O>(operation);
    const { signal } = options;
    if (!signal) {
      throw new Error('Signal is required for executeSync');
    }
    const process = (scope: DisposableScope): O => {
      const result = operationHandler.handle(
        operation,
        this.convergence,
        this.getOperationScope(options, scope)
      );

      return result as O;
    };

    return new Disposable(signal).runSync(process);
  }

  toCollection<
    T extends Operation<K, I, O>,
    K extends string = KeyOfOperation<T>,
    I = InputOfOperation<T>,
    O = OutputOfOperation<T>
  >(operation: T, options: OperationOptions = {}): AsyncCollection<O> {
    const operationHandler = this.get<T, K, I, O>(operation);
    const signal = options.signal ?? new AbortController().signal;

    const process = (scope: DisposableScope) => {
      const result = operationHandler.handle(
        operation,
        this.convergence,
        this.getOperationScope(options, scope)
      );

      if (Symbol.asyncIterator in Object(result)) {
        const generator = result as AsyncGenerator<O, void, void>;
        return toCollection<O>(() => generator);
      }
      throw new TypeError('toCollection not supported');
    };

    return new Disposable(signal).runSync(process);
  }

  protected getOperationScope(
    options: OperationOptions,
    scope: DisposableScope
  ): OperationScope {
    if (!!options.commitment && !options.confirmOptions) {
      options.confirmOptions = { commitment: options.commitment };
    }

    const payer = options.payer ?? this.convergence.rpc().getDefaultFeePayer();
    return { ...options, ...scope, payer };
  }
}
