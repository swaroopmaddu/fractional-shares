import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import * as metaplex from "@metaplex/js";
import {
  AccountLayout,
  NATIVE_MINT,
} from "@solana/spl-token";
import {
  ActivateVault,
  Vault,
  WithdrawSharesFromTreasury,
} from "@metaplex-foundation/mpl-token-vault";
import { pdaForVault } from "./helpers";
import { sendSignedTransaction} from './transactions_helper';

export async function createAndAddNFTtoVault (setLoading,connection,wallet,setMessages,myNfts) {
  setLoading(true);

  let walletAdapter = wallet.adapter;

  // 1. Create a new External Price Account
    const { externalPriceAccount, txId } =
      await metaplex.actions.createExternalPriceAccount({
        connection,
        wallet: walletAdapter,
      });

    await connection.confirmTransaction(txId);
  console.log("Step1: externalPriceAccount created");
   setMessages( [
    "Step1: externalPriceAccount created",
  ]);

  // 2. Create a Vault
  const vaultResponse = await metaplex.actions.createVault({
    connection,
    wallet: walletAdapter,
    mint: NATIVE_MINT,
    externalPriceAccount: new PublicKey(externalPriceAccount),
  });
  await connection.confirmTransaction(vaultResponse.txId);
  console.log("Step2: Vault created");
  setMessages([ "Step2: Vault created"]);

  const vault = vaultResponse.vault;
  // 3. Add NFTs to Inactive Vault
  const response = await metaplex.actions.addTokensToVault({
    connection,
    wallet: walletAdapter,
    vault,
    nfts: myNfts,
  });
  try {
    const { txId } = response.safetyDepositTokenStores[0];

    await connection.confirmTransaction(txId);

    console.log("Step3: NFT added to vault");
    setMessages([ "Step3: NFT added to vault"]);
  } catch (e) {
    console.error(e);
  }
  console.log(vault.toBase58());

  return vault.toString();
};

export async function  activateMyVault (vaultId, numberOfShares,connection,publicKey,signTransaction,sendTransaction,setMessages) {
  
  console.log(vaultId);
  //param 1 is vault pubkey
  const vault = new PublicKey(vaultId);

  // load the vault
  const result = await Vault.load(connection, vault);
  console.log(result);
  const data = result.data;

  //param 2 & 3
  const fractionMint = new PublicKey(data.fractionMint);
  const fractionTreasury = new PublicKey(data.fractionTreasury);
  //param 4
  const fractionMintAuthority = await pdaForVault(vault);
  // param 5 number of shares

  const feePayer = publicKey;
  let blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

  const options = {
    feePayer: feePayer,
    recentBlockhash: blockhash,
  };
  const vaultParams = {
    vault,
    vaultAuthority: publicKey,
    fractionMint,
    fractionTreasury,
    fractionMintAuthority,
    numberOfShares,
  };
  let tx = new ActivateVault(options, vaultParams);

  //add required signature
  const signedTx = await signTransaction(tx);

  try {
    const signature = await sendTransaction(signedTx, connection);
    await connection.confirmTransaction(signature, "processed");
    console.log("Step4: Vault activated");
    setMessages(["Step4: Vault activated"]);
  } catch (e) {
    console.error(e);
  }
};

//to create token account for withdraw shares
export async function  prepareDestAccount (mint,connection,publicKey,signTransaction,sendTransaction,setMessages) {

  //new account
  const newTokenAccount = Keypair.generate();
  const newTokenAccountPublicKey = newTokenAccount.publicKey;

  const rentExempt = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);

  const feePayer = publicKey;
  let blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

  const options = {
    feePayer: feePayer,
    recentBlockhash: blockhash,
  };

  //load token account
  const createTokenTx = new metaplex.transactions.CreateTokenAccount(options, {
    newAccountPubkey: newTokenAccountPublicKey,
    lamports: rentExempt,
    mint,
    owner: publicKey,
  });

  createTokenTx.partialSign(newTokenAccount);
  const signedTx = await signTransaction(createTokenTx);
  const createTokenTxId = await connection.sendRawTransaction(
    signedTx.serialize()
  );

  try {
      await connection.confirmTransaction(createTokenTxId);
      console.log("Step5: Token account created");
      setMessages([ "Step5: Token account created"]);
  } catch (e) {
    const status = connection.getSignatureStatus(createTokenTxId);
    console.log(status);
    console.error(e);
  }
  return newTokenAccount;
};

export async function withdrawShares(
  vaultId,
  numberOfShares,
  connection,
  publicKey,
  signTransaction,
  sendTransaction,
  setMessages
) {
  //param 1 is vault pubkey
  const vault = new PublicKey(vaultId);
  console.log(vault);
  //load vault
  const vaultResponse = (await Vault.load(connection, vault)).data;

  //param 2 & 3
  const fractionMint = new PublicKey(vaultResponse.fractionMint);

  const fractionTreasury = new PublicKey(vaultResponse.fractionTreasury);

  //param 4
  const vaultAuthority = publicKey;

  // param 5
  const fractionMintAuthority = await pdaForVault(vault);

  //param 6 number of shares

  // options for minting
  const feePayer = publicKey;
  let blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

  const options = {
    feePayer: feePayer,
    recentBlockhash: blockhash,
  };

  // destination account para
  const destination = (
    await prepareDestAccount(
      fractionMint,
      connection,
      publicKey,
      signTransaction,
      sendTransaction,
      setMessages
    )
  ).publicKey;

  const vaultParams = {
    vault,
    destination,
    fractionTreasury,
    vaultAuthority,
    transferAuthority: fractionMintAuthority,
    numberOfShares,
  };

  try {
    let tx = new WithdrawSharesFromTreasury(options, vaultParams);
    const signature = await sendTransaction(tx, connection);
    await connection.confirmTransaction(signature, "finalized");
    console.log("Step6: Shares withdrawn to account " + destination.toBase58());
    setMessages([
      "Step6: Shares withdrawn to account " + destination.toBase58(),
    ]);
  } catch (e) {
    console.error(e);
  }
};


export async function withdrawMyShares(
  vaultId,
  numberOfShares,
  connection,
  publicKey,
  signTransaction,
  sendTransaction,
  setMessages
) {
  let instructionsSet = [];

  //? Step1: Transaction for activating the vault
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
  let tx = new metaplex.programs.vault.ActivateVault(options, vaultParams);
  console.log(tx);
  instructionsSet.push(...tx.instructions);
  //TODO add required signature

  //? Step2 : Create token account
  //new account
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

  //load token account
  const createTokenTx = new metaplex.transactions.CreateTokenAccount(options, {
    newAccountPubkey: newTokenAccountPublicKey,
    lamports: rentExempt,
    mint: fractionMint,
    owner: publicKey,
  });

  //TODO add required signature
  console.log(createTokenTx);
  instructionsSet.push(...createTokenTx.instructions);

  //? Step3 : Withdraw shares from treasury
  // options for minting
  blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

  options = {
    feePayer: feePayer,
    recentBlockhash: blockhash,
  };

  const vaultAuthority = publicKey;
  const destination = newTokenAccount.publicKey;
  console.log(vault);
  const params = {
    vault,
    destination,
    fractionTreasury,
    vaultAuthority,
    transferAuthority: fractionMintAuthority,
    numberOfShares,
  };

  let tx3 = new WithdrawSharesFromTreasury(options, params);
  instructionsSet.push(...tx3.instructions);

  blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
  //? Step4 : add all instructions to a transaction
  const transaction = new Transaction();

  instructionsSet.forEach((instruction) => {
    transaction.add(instruction);
  });

  transaction.feePayer = feePayer;
  transaction.recentBlockhash = blockhash;

  console.log(transaction);

  transaction.partialSign(newTokenAccount);
  const signedTransaction = await signTransaction(transaction);
  console.log(signedTransaction);
  //? Step5 : send the transaction
  const signedTxnPromise = sendSignedTransaction({
    connection: connection,
    signedTransaction: signedTransaction,
  });
  signedTxnPromise
    .then(({ txid }) => {
      console.log("Success tx num", txid);
    })
    .catch(() => {
      console.log("Failed tx num");
    });
  return {
    newTokenAccount
  };
}