import { TronWeb } from "tronweb";
import { FunctionFragment, Interface } from "ethers";
import BigNumber from "bignumber.js";
import {
  CONTRACT_SUCCESS,
  ContractOption,
  FastTransactionResult,
  TransactionError,
  TransactionOption,
  TronResultError,
} from "./types";
import wait from "wait";
import { SignedTransaction, TransactionInfo } from "tronweb/lib/esm/types";
import { retry, executePromiseAndCallback } from "./helper";

export function formatBase58Address(address: string) {
  if (!TronWeb.isAddress(address)) {
    return address;
  }
  return TronWeb.address.fromHex(TronWeb.address.toChecksumAddress(address));
}

export const formatHexAddress = function (address: string) {
  if (!TronWeb.isAddress(address)) {
    return address;
  }
  return TronWeb.address.toChecksumAddress(address);
};

export const formatToEthAddress = function (address: string) {
  if (TronWeb.isAddress(address)) {
    return "0x" + formatHexAddress(address).slice(2).toLowerCase();
  }
  throw new Error(`${address} is invalid address.`);
};

export function validateContractOptions(contractOption: ContractOption) {
  const { address, abi, method } = contractOption;
  if (!address) {
    throw new Error(`No contract address is provided.`);
  }
  if (!abi) {
    throw new Error(`No contract abi is provided.`);
  }
  if (!method) {
    throw new Error(`No contract method is provided.`);
  }
}

export function getInterfaceAndFragments(contractOption: ContractOption) {
  const { address, abi, method, parameters = [] } = contractOption;
  const iface = new Interface(abi);
  const functionFragment = iface.getFunction(method);
  if (
    !functionFragment ||
    functionFragment.inputs.length !== parameters.length
  ) {
    throw new Error(`${address} ${method} is not matched in abi!`);
  }
  return {
    functionFragment,
    iface,
  };
}

export function handleValue(value: any, type: string) {
  switch (true) {
    case type.endsWith("[]"):
      const itemType = type.slice(0, -2);
      return value.map((el: any) => handleValue(el, itemType));
    case type.startsWith("uint"):
    case type.startsWith("int"):
      // value is BigInt type.
      return new BigNumber(value.toString());
    case type === "address":
      return formatBase58Address(value);
    default:
      return value;
  }
}

export function handleContractValue<T>(
  value: any,
  functionFragment: FunctionFragment
) {
  const outputs = functionFragment.outputs;
  if (outputs.length === 1 && !outputs[0].name) {
    return handleValue(value, outputs[0].type);
  }
  const result: Record<string, any> = {};
  for (let output of outputs) {
    result[output.name] = handleValue(value[output.name], output.type);
  }
  return result;
}

export const slowCheck = async function (
  provider: TronWeb,
  txID: string
): Promise<TransactionInfo> {
  const output = await provider.trx.getTransactionInfo(txID);

  if (!Object.keys(output).length) {
    await wait(3000);
    return slowCheck(provider, txID);
  }

  if (output.result && output.result === "FAILED") {
    const errMsg = provider.toUtf8(output.resMessage);
    throw new TransactionError(errMsg, output);
  }

  if (!Object.prototype.hasOwnProperty.call(output, "contractResult")) {
    const errMsg = "Failed to execute: " + JSON.stringify(output, null, 2);
    throw new TransactionError(errMsg, output);
  }

  return output;
};

export const fastCheck = async function (
  provider: TronWeb,
  txID: string
): Promise<FastTransactionResult> {
  return await retry(
    async () => {
      const transaction = (await provider.trx.getTransaction(
        txID
      )) as any as FastTransactionResult;
      if (!transaction.ret?.length) {
        await wait(1000);
        return fastCheck(provider, txID);
      }
      if (
        !transaction.ret.every(
          (result) => result.contractRet === CONTRACT_SUCCESS
        )
      ) {
        throw new TransactionError(
          transaction.ret
            .filter((el) => el.contractRet !== CONTRACT_SUCCESS)
            .map((el) => el.contractRet)
            .join(","),
          { id: transaction.txID }
        );
      }
      return transaction;
    },
    10,
    1000
  );
};


export const trackTransaction = async function (
  signedTransaction: SignedTransaction,
  provider: TronWeb,
  options: TransactionOption = {}
) {
  const checkOption = options.check ?? "slow";
  if (checkOption === "fast") {
    return await fastCheck(provider, signedTransaction.txID)
      .then((transaction) => {
        executePromiseAndCallback<TransactionInfo>(
          slowCheck(provider, signedTransaction.txID),
          options
        );
        return transaction;
      })
      .catch((error: TransactionError) => {
        executePromiseAndCallback<TransactionInfo>(
          Promise.reject(error),
          options
        );
        throw error;
      });
  }
  return await slowCheck(provider, signedTransaction.txID)
    .then((transaction) => {
      executePromiseAndCallback<TransactionInfo>(
        Promise.resolve(transaction),
        options
      );
      return transaction;
    })
    .catch((error: TransactionError) => {
      executePromiseAndCallback<TransactionInfo>(
        Promise.reject(error),
        options
      );
      throw error;
    });
};
