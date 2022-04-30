import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import * as metaplex from "@metaplex/js"
import { NATIVE_MINT } from "@solana/spl-token";
import BN from 'bn.js';

async function startAuction(
  myNfts,
  publicKey,
  wallet,
  sendTransaction,
  signTransaction
) {
  let walletAdapter = wallet.adapter;

  const connection = new Connection(clusterApiUrl("devnet"));

  //step 1: create external price account

  const { externalPriceAccount, txId } =
    await metaplex.actions.createExternalPriceAccount({
      connection,
      wallet: walletAdapter,
    });

  await connection.confirmTransaction(txId);

  // step 2: create vault
  const vaultResponse = await metaplex.actions.createVault({
    connection,
    wallet: walletAdapter,
    mint: NATIVE_MINT,
    externalPriceAccount: new PublicKey(externalPriceAccount),
  });
  await connection.confirmTransaction(vaultResponse.txId);

  // step 3: add nfts to vault
  const vault = vaultResponse.vault;

  const response = await metaplex.actions.addTokensToVault({
    connection,
    wallet: walletAdapter,
    vault,
    nfts: myNfts,
  });
  const {tokenAccount, tokenStoreAccount, tokenMint} = response;
  const { txId3 } = response.safetyDepositTokenStores[0].txId;

  await connection.confirmTransaction(txId3);

  // step 4 & 5: activate and combine_vault via close vault

  const closeVault = await metaplex.actions.closeVault({
    connection,
    wallet: walletAdapter,
    vault,
    priceMint: NATIVE_MINT,
  });
  const { txId4 } = closeVault.txId;
  await connection.confirmTransaction(txId4);

  // step 5: create_auction

  const _auctionSettings = {
    winners: new metaplex.programs.auction.WinnerLimit({
      type: metaplex.programs.auction.WinnerLimitType.Capped,
      usize: new BN(1),
    }),
    endAuctionAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    auctionGap: null,
    tokenMint: NATIVE_MINT.toString(),
    authority: wallet.publicKey.toString(),
    resource: vault.toBase58(),
    priceFloor: new metaplex.programs.auction.PriceFloor({
      type: metaplex.programs.auction.PriceFloorType.Minimum,
    }),
    tickSize: new BN(10),
    gapTickSizePercentage: 1,
  };

  const auctionInitResponse = await metaplex.actions.initAuction({
    connection,
    wallet: walletAdapter,
    vault: closeVault.vault,
    auctionSettings: _auctionSettings,
  });
  const { auction } = auctionInitResponse;
  const { txId5 } = auctionInitResponse.txId;
  await connection.confirmTransaction(txId5);

  // step 6: init_auction_manager 
  const init_auction_managerResponse = await metaplex.programs.metaplex.InitAuctionManagerV2({});


}
export default startAuction;