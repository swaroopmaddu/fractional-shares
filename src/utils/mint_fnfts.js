/* eslint-disable no-console */
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  Vault,
  WithdrawSharesFromTreasury,
} from "@metaplex-foundation/mpl-token-vault";
import { pdaForVault } from "./helpers";
import * as metaplex from "@metaplex/js";
import { AccountLayout } from "@solana/spl-token";
import { sendSignedTransaction } from "./transactions_helper";

export async function mintFractionalShares(
  vaultId,
  numberOfShares,
  connection,
  publicKey,
  signTransaction
) {
  const instructionsSet = [];

  // ? Step1: Transaction for activating the vault
  const vault = new PublicKey(vaultId);
  const result = await Vault.load(connection, vault);
  const vaultData = result.data;

  const fractionMint = new PublicKey(vaultData.fractionMint);
  const fractionTreasury = new PublicKey(vaultData.fractionTreasury);
  const fractionMintAuthority = await pdaForVault(vault);

  const feePayer = publicKey;
  let blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

  let options = {
    feePayer: feePayer,
    recentBlockhash: blockhash,
  };
  const vaultParams = {
    vault,
    fractionMint,
    fractionTreasury,
    fractionMintAuthority,
    vaultAuthority: publicKey,
    numberOfShares,
  };
  const tx = new metaplex.programs.vault.ActivateVault(options, vaultParams);
  instructionsSet.push(...tx.instructions);

  // ? Step2 : Create token account new account
  const newTokenAccount = Keypair.generate();
  const newTokenAccountPublicKey = newTokenAccount.publicKey;
  const rentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
  options = {
    feePayer: feePayer,
    recentBlockhash: blockhash,
  };

  const createTokenTx = new metaplex.transactions.CreateTokenAccount(options, {
    newAccountPubkey: newTokenAccountPublicKey,
    lamports: rentExempt,
    mint: fractionMint,
    owner: publicKey,
  });

  instructionsSet.push(...createTokenTx.instructions);

  // ? Step3 : Withdraw shares from treasury
  const vaultAuthority = publicKey;
  const destination = newTokenAccount.publicKey;

  blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
  options = {
    feePayer: feePayer,
    recentBlockhash: blockhash,
  };

  const params = {
    vault,
    destination,
    fractionTreasury,
    vaultAuthority,
    transferAuthority: fractionMintAuthority,
    numberOfShares,
  };

  const tx3 = new WithdrawSharesFromTreasury(options, params);
  instructionsSet.push(...tx3.instructions);

  blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

  // ? Step4 : add all instructions to a new ransaction
  const transaction = new Transaction();

  for (const instruction of instructionsSet) {
    transaction.add(instruction);
  }

  transaction.feePayer = feePayer;
  transaction.recentBlockhash = blockhash;

  transaction.partialSign(newTokenAccount);
  const signedTransaction = await signTransaction(transaction);

  // ? Step5 : send the transaction and wait for confirmation

  try {
    await sendSignedTransaction({
      connection: connection,
      signedTransaction: signedTransaction,
    });
    return {
      success: true,
      newTokenAccountPublicKey: newTokenAccountPublicKey.toBase58(),
    };
  } catch (err) {
    if (err.timeout) {
      throw new Error("Timed out awaiting confirmation on transaction");
    }
    throw new Error("Transaction failed");
  }
}
