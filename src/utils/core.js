import { Keypair, PublicKey } from "@solana/web3.js";
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
