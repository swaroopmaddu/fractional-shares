import { clusterApiUrl, Transaction, Connection } from "@solana/web3.js";
import { sleep } from "./misc";

const DEFAULT_TIMEOUT = 10000;

async function awaitTransactionSignatureConfirmation(signature, connection) {
  
  const start = Date.now();
  const confirmations = 100;

  let statusResponse = await connection.getSignatureStatus(signature, {
    searchTransactionHistory: true,
  });
  for (;;) {
    const status = statusResponse.value;
    if (status) {
      // 'status.confirmations === null' implies that the tx has been finalized
      if (
        status.err ||
        status.confirmationStatus === "finalized" ||
        (typeof confirmations === "number" &&
          status.confirmations >= confirmations)
      ) {
        break;
      }
    } else if (Date.now() - start >= DEFAULT_TIMEOUT) {
      break;
    }
    console.log(status);
    await sleep(200);
    statusResponse = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
  }
  console.log(statusResponse.value);
  return statusResponse.value;
}

const getUnixTs = () => {
  return new Date().getTime() / 1000;
};



export async function sendSignedTransaction({
  signedTransaction,
  connection,
}) {
  const rawTransaction = signedTransaction.serialize();
  const startTime = getUnixTs();
  let slot = 0;
  const txid = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
  });

  console.log("Started awaiting confirmation for", txid);


  try {
    const confirmation = await awaitTransactionSignatureConfirmation(
      txid,
      connection
    );

    if (!confirmation)
      throw new Error("Timed out awaiting confirmation on transaction");

    if (confirmation.err) {
      console.error(confirmation.err);
      throw new Error("Transaction failed: Custom instruction error");
    }

    slot = confirmation?.slot || 0;
  } catch (err) {
    if (err.timeout) {
      throw new Error("Timed out awaiting confirmation on transaction");
    }
    throw new Error('Transaction failed');
  } 
  console.log("Latency", txid, getUnixTs() - startTime);
  return { txid, slot };
}

export const sendTransactions = async ({
  connection,
  wallet,
  instructionSet,
  signersSet
}) => {
  let unsignedTxns = [];
  
  let recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

  for (let i = 0; i < instructionSet.length; i++) {
      console.log("Instruction ", i);
    const instructions = instructionSet[i];
    const signers = signersSet[i];
    
    if (instructions.length === 0) {
      continue;
    }

    const transaction = new Transaction();
    instructions.forEach((instruction) => {
      instruction.feePayer = wallet.publicKey;
      transaction.add(instruction);
    });
    transaction.recentBlockhash = recentBlockhash;
    transaction.feePayer = wallet.publicKey;

    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }   
    
    unsignedTxns.push(transaction);
  }

  const signedTxns = await wallet.signAllTransactions(unsignedTxns);

  const breakEarlyObject = { breakEarly: false, i: 0 };

  let connction = new Connection(clusterApiUrl("devnet"), "finalized");
  for (let i = 0; i < signedTxns.length; i++) {
    const signedTxnPromise = sendSignedTransaction({
      connection: connction,
      signedTransaction: signedTxns[i],
    });
    signedTxnPromise
      .then(({ txid }) => {
        console.log("Success tx num", i, txid);
      })
      .catch(() => {
        breakEarlyObject.breakEarly = true;
        breakEarlyObject.i = i;
      });
    try {
      await signedTxnPromise;
      console.log("Success", i);
      await sleep(2);
    } catch (e) {
      console.log("Failure at txn", i);
      console.log("Error received", e);
      if (breakEarlyObject.breakEarly) {
        console.log("Died on ", breakEarlyObject.i);
        return breakEarlyObject.i; // Return the txn we failed on by index
      }
      break;
    }
  }
  return true;
};

