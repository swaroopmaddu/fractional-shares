import { actions, programs, transactions } from "@metaplex/js";
import { AccountLayout, MintLayout, NATIVE_MINT } from "@solana/spl-token";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import BN from 'bn.js';

export const getExternalPriceTransaction = async (connection, wallet) => {

  const txOptions = { feePayer: wallet.publicKey };
  let instructions = [],
  signers = [];
  const epaRentExempt = await connection.getMinimumBalanceForRentExemption(
    programs.vault.Vault.MAX_EXTERNAL_ACCOUNT_SIZE
  );

  const externalPriceAccount = Keypair.generate();

  const externalPriceAccountData = new programs.vault.ExternalPriceAccountData({
    pricePerShare: new BN(0),
    priceMint: NATIVE_MINT.toBase58(),
    allowedToCombine: true,
  });

  const uninitializedEPA = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: externalPriceAccount.publicKey,
      lamports: epaRentExempt,
      space: programs.vault.Vault.MAX_EXTERNAL_ACCOUNT_SIZE,
      programId: programs.vault.VaultProgram.PUBKEY,
    })
  );
  
  instructions.push(uninitializedEPA);
  signers.push(externalPriceAccount);

  const updateEPA = new programs.vault.UpdateExternalPriceAccount(txOptions, {
    externalPriceAccount: externalPriceAccount.publicKey,
    externalPriceAccountData,
  });
  
  instructions.push(updateEPA);
  console.log({
    externalPriceAccount: externalPriceAccount.publicKey,
    priceMint: NATIVE_MINT,
  });
  return {
    externalPriceAccount: externalPriceAccount.publicKey,
    priceMint: NATIVE_MINT,
    instructions: instructions,
    signers: signers,
  };
};

export const createVaultTransactions = async (
  connection,
  externalPriceAccount,
  wallet
) => {
  let instructions = [],
    signers = [];
  const accountRent = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span
  );

  const vaultRent = await connection.getMinimumBalanceForRentExemption(
    programs.vault.Vault.MAX_VAULT_SIZE
  );

  const vault = Keypair.generate();

  const vaultAuthority = await programs.vault.Vault.getPDA(vault.publicKey);
  const fractionMint = Keypair.generate();
  const fractionMintTx = new transactions.CreateMint(
    { feePayer: wallet.publicKey },
    {
      newAccountPubkey: fractionMint.publicKey,
      lamports: mintRent,
      owner: vaultAuthority,
      freezeAuthority: vaultAuthority,
    }
  );
  
  instructions.push(fractionMintTx);
  signers.push(fractionMint);

  const redeemTreasury = Keypair.generate();
  const redeemTreasuryTx = new transactions.CreateTokenAccount(
    { feePayer: wallet.publicKey },
    {
      newAccountPubkey: redeemTreasury.publicKey,
      lamports: accountRent,
      mint: NATIVE_MINT,
      owner: vaultAuthority,
    }
  );
  
  instructions.push(redeemTreasuryTx);
  signers.push(redeemTreasury);

  const fractionTreasury = Keypair.generate();
  const fractionTreasuryTx = new transactions.CreateTokenAccount(
    { feePayer: wallet.publicKey },
    {
      newAccountPubkey: fractionTreasury.publicKey,
      lamports: accountRent,
      mint: fractionMint.publicKey,
      owner: vaultAuthority,
    }
  );
  // fractionTreasuryTx.recentBlockhash = await getBlockHash();
  instructions.push(fractionTreasuryTx);
  signers.push(fractionTreasury);

  const uninitializedVaultTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: vault.publicKey,
      lamports: vaultRent,
      space: programs.vault.Vault.MAX_VAULT_SIZE,
      programId: programs.vault.VaultProgram.PUBKEY,
    })
  );
  // uninitializedVaultTx.recentBlockhash = await getBlockHash();
  instructions.push(uninitializedVaultTx);
  signers.push(vault);
  const initVaultTx = new programs.vault.InitVault(
    { feePayer: wallet.publicKey },
    {
      vault: vault.publicKey,
      vaultAuthority: wallet.publicKey,
      fractionalTreasury: fractionTreasury.publicKey,
      pricingLookupAddress: externalPriceAccount,
      redeemTreasury: redeemTreasury.publicKey,
      fractionalMint: fractionMint.publicKey,
      allowFurtherShareCreation: true,
    }
  );
  // initVaultTx.recentBlockhash = await getBlockHash();
  instructions.push(initVaultTx);

  return {
    instructions,
    signers,
    vault: vault.publicKey,
    fractionMint: fractionMint.publicKey,
    redeemTreasury: redeemTreasury.publicKey,
    fractionTreasury: fractionTreasury.publicKey,
  };
};
;

export const getNFTSAddToVaultInstructions = async ({
  connection,
  vault,
  wallet,
  listOfNFTs,
}) => {

  // We have to return a list of instructions, one for each NFT we want to add to the vault
  let instructions = [];
  let signers = [];

  const txOptions = { feePayer: wallet.publicKey };

  const vaultAuthority = await programs.vault.Vault.getPDA(vault);
  const accountRent = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  for (const nft of listOfNFTs) {
    const safetyDepositBox = await programs.vault.SafetyDepositBox.getPDA(
      vault,
      nft.tokenMint
    );

    const tokenStoreAccount = Keypair.generate();
    const tokenStoreAccountTx = new transactions.CreateTokenAccount(txOptions, {
      newAccountPubkey: tokenStoreAccount.publicKey,
      lamports: accountRent,
      mint: nft.tokenMint,
      owner: vaultAuthority,
    });
    instructions.push(tokenStoreAccountTx);
    signers.push(tokenStoreAccount);

    const { authority: transferAuthority, createApproveTx } = actions.createApproveTxs({
      account: nft.tokenAccount,
      owner: wallet.publicKey,
      amount: nft.amount.toNumber(),
    });
    instructions.push(createApproveTx);
    signers.push(transferAuthority);

    const addTokenTx = new programs.vault.AddTokenToInactiveVault(txOptions, {
      vault,
      vaultAuthority: wallet.publicKey,
      tokenAccount: nft.tokenAccount,
      tokenStoreAccount: tokenStoreAccount.publicKey,
      transferAuthority: transferAuthority.publicKey,
      safetyDepositBox: safetyDepositBox,
      amount: nft.amount,
    });
    instructions.push(addTokenTx);
  }
  return {
    instructions,
    signers,
  };
};



