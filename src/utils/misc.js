import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
//@ts-expect-error missing types
import * as BufferLayout from "buffer-layout";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from 'bn.js';

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function devNetConnetion() {
  const connection = new Connection(clusterApiUrl("devnet"), 'processed');
  return connection;
}

export const createAccountInfo = (
  pubkey,
  isSigner,
  isWritable
) => {
  return {
    pubkey: pubkey,
    isSigner: isSigner,
    isWritable: isWritable,
  };
};

export const checkAccountInitialized = async (
  connection,
  customAccountPubkey
) => {
  const customAccount = await connection.getAccountInfo(customAccountPubkey);
  console.log(customAccount);
  if (customAccount === null || customAccount.data.length === 0) {
    console.log("Account of custom program has not been initialized properly");
    return false;
  }

  return customAccount;
};


export const TokenSaleAccountLayout = BufferLayout.struct([
  BufferLayout.u8("isInitialized"), //1byte
  BufferLayout.blob(32, "sellerPubkey"), //pubkey(32byte)
  BufferLayout.blob(32, "tempTokenAccountPubkey"), //pubkey(32byte)
  BufferLayout.blob(8, "swapSolAmount"), //8byte
  BufferLayout.blob(8, "swapTokenAmount"), //8byte
]);

export async function findAssociatedTokenAddress(
  walletAddress,
  tokenMintAddress
){
  return (
    await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    )
  )[0];
}

export const checkAccountDataIsValid = (
  customAccountData,
  expectedCustomAccountState
) => {
  const keysOfAccountData = Object.keys(customAccountData);
  const data= {};

  keysOfAccountData.forEach((key) => {
    const value = customAccountData[key];
    const expectedValue = expectedCustomAccountState[key];

    //PublicKey
    if (value instanceof Uint8Array && expectedValue instanceof PublicKey) {
      if (!new PublicKey(value).equals(expectedValue)) {
        console.log(`${key} is not matched expected one`);
        process.exit(1);
      }
    } else if (
      value instanceof Uint8Array &&
      typeof expectedValue === "number"
    ) {
      //value is undefined
      if (!value) {
        console.log(`${key} flag has not been set`);
        process.exit(1);
      }

      //value is not matched expected one.
      const isBufferSame = Buffer.compare(
        value,
        Buffer.from(new BN(expectedValue).toArray("le", value.length))
      );

      if (isBufferSame !== 0) {
        console.log(
          `[${key}] : expected value is ${expectedValue}, but current value is ${value}`
        );
        process.exit(1);
      }
    }

    data[key] = expectedValue.toString();
  });
  console.table([data]);
};