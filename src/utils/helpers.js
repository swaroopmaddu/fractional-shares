import { PublicKey } from "@solana/web3.js";

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

