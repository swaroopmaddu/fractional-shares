import { Connection, PublicKey } from "@solana/web3.js";

const VAULT_PREFIX = "vault";
const VAULT_PROGRAM_ID = new PublicKey("vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn");
/**
 * Used to derive Vault PDA for a particular vault account.
 * Used for `fractionMintAuthority`.
 */
export async function pdaForVault(vault) {
  const [vaultPDA] = await PublicKey.findProgramAddress(
    [Buffer.from(VAULT_PREFIX), VAULT_PROGRAM_ID.toBuffer(), vault.toBuffer()],
    VAULT_PROGRAM_ID
  );
  return vaultPDA;
}


//! get total holders of a token
export const getHolders = async (endpoint, mint) => {
  const connection = new Connection(endpoint);
  console.log(connection)
  const tokenMint = new PublicKey(mint);
  const holders = await connection.getProgramAccounts(tokenMint,'processed');
  console.log("holders", holders);
};

//! get token account balance from token account
export const tokenAccountBalance = async (endpoint, token) => {
  const connection = new Connection(endpoint);
  const tokenAccount = new PublicKey(token);
  const balance = await connection.getTokenAccountBalance(tokenAccount);
  return balance.value.uiAmountString;
}
