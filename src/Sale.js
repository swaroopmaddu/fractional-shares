import { useWallet } from "@solana/wallet-adapter-react";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Fragment } from "react";
import {
  createAccountInfo,
  devNetConnetion,
  TokenSaleAccountLayout,
  checkAccountInitialized,
} from "./utils/misc";
import {
  AccountLayout,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import BN from 'bn.js';
import { Vault } from "@metaplex-foundation/mpl-token-vault";

const tokenSaleProgramId = new PublicKey("7o2TcTix3jF7ibQUNfpfoyWCcYn7aaWnprBU6aRZvbBW");

const vaultId = "88SJtrJwpj4MWW2ttmD86ipuRi1EBZpqXvbke9hYVrKv";

const tempTokenAccountKeypair = new Keypair();
const instruction = 0;
const amountOfTokenWantToSale = 200;
const swapSolAmount = 1;
const swapTokenAmount = 10;
let TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY = "nMvAepqzx95bQZHjZCJmDXHhhLkeFVgguao9YTfkF5F";
let TEMP_TOKEN_ACCOUNT_PUBKEY = "7WEaySjpzvEdLJvv9sQfzp5LMf7UhcVgkzyGp3T1qy89";

function Sale() {

    const {wallet, signTransaction, publicKey} = useWallet();
    const connection = devNetConnetion();


    async function buyToken() {
        const tokenSaleProgramId = new PublicKey(
          "7o2TcTix3jF7ibQUNfpfoyWCcYn7aaWnprBU6aRZvbBW"
        );

        const sellerPubkey = new PublicKey("DVcjkvnCuV59RpxxrSbnxHK9rAgfaVriXK3NX51eiv3i");
        const buyerPubkey =  publicKey;

        const vault = new PublicKey(vaultId);
        //load vault
        const vaultResponse = (await Vault.load(connection, vault)).data;
        const tokenPubkey = new PublicKey(vaultResponse.fractionMint);

        const tokenSaleProgramAccountPubkey = new PublicKey(TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY);
        const largestAccounts = await connection.getTokenLargestAccounts(
          tokenPubkey
        );
        const sellerTokenAccountPubkey = new PublicKey(largestAccounts.value[0].address.toBase58());

        const tempTokenAccountPubkey = tempTokenAccountKeypair.publicKey;
        const instruction = 1;

        const tokenSaleProgramAccount = await checkAccountInitialized(connection, tokenSaleProgramAccountPubkey);
        const encodedTokenSaleProgramAccountData = tokenSaleProgramAccount.data;
        const decodedTokenSaleProgramAccountData = TokenSaleAccountLayout.decode(
            encodedTokenSaleProgramAccountData
        );
        const tokenSaleProgramAccountData = {
            isInitialized: decodedTokenSaleProgramAccountData.isInitialized,
            sellerPubkey: new PublicKey(decodedTokenSaleProgramAccountData.sellerPubkey),
            tempTokenAccountPubkey: new PublicKey(decodedTokenSaleProgramAccountData.tempTokenAccountPubkey),
            swapSolAmount: decodedTokenSaleProgramAccountData.swapSolAmount,
            swapTokenAmount: decodedTokenSaleProgramAccountData.swapTokenAmount,
        };

        const buyerTokenAccount = new PublicKey(
          "QMRX52tXsYaKJMH2HArC1FDuwHzwGEu8Sj9dFPMJkNb"
        );

        const PDA = await PublicKey.findProgramAddress([Buffer.from("token_sale")], tokenSaleProgramId);

        const buyTokenIx = new TransactionInstruction({
          programId: tokenSaleProgramId,
          keys: [
            createAccountInfo(publicKey, true, true),
            createAccountInfo(
              tokenSaleProgramAccountData.sellerPubkey,
              false,
              true
            ),
            createAccountInfo(
              tokenSaleProgramAccountData.tempTokenAccountPubkey,
              false,
              true
            ),
            createAccountInfo(tokenSaleProgramAccountPubkey, false, false),
            createAccountInfo(SystemProgram.programId, false, false),
            createAccountInfo(buyerTokenAccount  , false, true),
            createAccountInfo(TOKEN_PROGRAM_ID, false, false),
            createAccountInfo(PDA[0], false, false),
          ],
          data: Buffer.from(Uint8Array.of(instruction)),
        });
        const blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
        
        let tx = new Transaction({
          recentBlockhash: blockhash,
          feePayer: publicKey,
        }).add(
          buyTokenIx
        );

        tx = await signTransaction(tx);
        
        
        try {
          await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
            });
            console.log("Transaction sent!");
            console.log("Buy DOne Started!");
        } catch (e) {
          console.log(e);
        }

        
        //phase2 end
        console.log(`✨TX successfully finished✨\n`);

    }
    
    return (
      <Fragment>
        <h1>Sale</h1>
        <button onClick={buyToken}>startSale</button>
        <br />
        <br />
        <br />
        <button onClick={buyToken}>buyToken</button>
      </Fragment>
    );
}
export default Sale;

