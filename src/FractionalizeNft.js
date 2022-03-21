import { Fragment, useRef, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useLocation } from "react-router-dom";
import { Col, Form, Row, Button, Image, Alert } from "react-bootstrap";
import {
  createAndAddNFTtoVault,
  withdrawShares,
  activateMyVault,
} from "./utils/core";

function FractionalizeNft() {
  //our vault id
  //const vaultId = new PublicKey("5tzJztXrBUfaWcbKxLD3PdZFw1FrM1WnzdKydGE9CZVG");

  /*
      tokenMint is the publicKey of the NFT
      tokenAccount is the publicKey of the tokenAccount that owns the NFT
  */
  const params = useLocation();
  const numRef = useRef();

  const [vaultId, setVaultId] = useState("");
  const [step,setStep] = useState(0);
  const [messages, setMessages] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const myNfts = [
    {
      tokenAccount: new PublicKey( params.state.tokenAccount ),
      tokenMint: new PublicKey(params.state.mint),
      amount: new BN(1),
    },
  ];

  const buttonTitle = ["Create Vault & Add NFT to Vault", "Activate Vault", "Withdraw Shares"];

  const { publicKey, wallet, sendTransaction, signTransaction } = useWallet();

  /*
  const mintVault = async (e) => {
    setLoading(true);
    e.preventDefault();

    //create a new connection
    let connection = new Connection(params.state.connection);

    let walletAdapter = wallet.adapter;

    // 1. Create a new External Price Account
    const { externalPriceAccount, txId } =
      await metaplex.actions.createExternalPriceAccount({
        connection,
        wallet: walletAdapter,
      });

    await connection.confirmTransaction(txId);
    console.log("Step1: externalPriceAccount created");
    setMessages((messages) => [
      ...messages,
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
    setMessages((messages) => [...messages, "Step2: Vault created"]);

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
      setMessages((messages) => [...messages, "Step3: NFT added to vault"]);
    } catch (e) {
      console.error(e);
    }
    console.log(vault.toBase58());

    const fractionMint = new PublicKey(vaultResponse.fractionMint);
    const fractionTreasury = new PublicKey(vaultResponse.fractionTreasury);
    const fractionMintAuthority = await pdaForVault(vault);

    const feePayer = publicKey;

    let blockhash = (await connection.getLatestBlockhash("finalized"))
      .blockhash;

    const num = numRef.current.value;
    const numberOfShares = new BN(num, 10);

    console.log(numberOfShares);

    // params for activating vault
    let options = {
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
    const signedTx1 = await signTransaction(tx);
    const signature = await sendTransaction(signedTx1, connection);

    try {
      console.log("Wait for confirmation "+signature);
      await connection.confirmTransaction(signature, "finalized");
      console.log("Step4: Vault activated");
      setMessages((messages) => [...messages, "Step4: Vault activated"]);
    } catch (e) {
      console.error(e);
    }

    // 3. Prepare destination account for withdrawal
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
    const createTokenTx = new metaplex.transactions.CreateTokenAccount(
      options,
      {
        newAccountPubkey: newTokenAccountPublicKey,
        lamports: rentExempt,
        mint:fractionMint,
        owner: publicKey,
      }
    );

    createTokenTx.partialSign(newTokenAccount);
    const signedTx = await signTransaction(createTokenTx);

    try {
        const createTokenTxId = await sendTransaction(signedTx, connection);
        await connection.confirmTransaction(createTokenTxId);
        console.log("Step5: Token account created");
        setMessages((messages) => [...messages, "Step5: Token account created"]);
    } catch (e) {
        console.error(e);
    }

    // 4. Withdraw shares from treasury
    const destination = newTokenAccount.publicKey;

    blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

    options = {
      feePayer: feePayer,
      recentBlockhash: blockhash,
    };

    const vaultAuthority = publicKey;

    const withDrawParams = {
      vault,
      destination,
      fractionTreasury,
      vaultAuthority,
      transferAuthority: fractionMintAuthority,
      numberOfShares,
    };
    let tx2 = new WithdrawSharesFromTreasury(options, withDrawParams);

    try {
      const signature = await sendTransaction(tx2, connection);
      await connection.confirmTransaction(signature, "finalized");
      console.log(
        "Step6: Shares withdrawn to account " + destination.toBase58()
      );
      setMessages((messages) => [
        ...messages,
        num.toString() +
          " Shares withdrawn to account " +
          destination.toBase58(),
      ]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  */
 
const createFractionalVault = async (event) => {
  console.log(step);
  event.preventDefault();
  const connection = new Connection(params.state.connection);

  const num = numRef.current.value;
  const numberOfShares = new BN(num, 10);

  if(step === 0){
    const vaultResult = await createAndAddNFTtoVault(
      setLoading,
      connection,
      wallet,
      setMessages,
      myNfts
    );
    console.log(vaultResult);
    setVaultId(vaultResult);
    console.log(vaultId);
    setStep(1);
  }
  else if(step === 1){
  //step 2 activate vault with given number of shares
  await activateMyVault(
    vaultId,
    numberOfShares,
    connection,
    publicKey,
    signTransaction,
    sendTransaction,
    setMessages
  );
  setStep(2);

  }
  else if(step === 2){
  //step 3 withdraw shares from vault to user account
  await withdrawShares(
    vaultId,
    numberOfShares,
    connection,
    publicKey,
    signTransaction,
    sendTransaction,
    setMessages
  );

  console.log("Success!");
  setMessages((messages) => [...messages, "Success!"]);
  }
};

  return (
    <Fragment>
      <Row style={{ padding: "20px" }}>
        <Col xs="12" md="12" lg="6">
          <Row className="justify-content-center">
            <Col xs="12" md="12" lg="4">
              <Image fluid rounded src={params.state.image} />
            </Col>
          </Row>
          <Row>
            <br />
          </Row>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Token Mint</Form.Label>
              <Form.Control placeholder={params.state.mint} disabled />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Token Account</Form.Label>
              <Form.Control placeholder={params.state.tokenAccount} disabled />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Number of shares</Form.Label>
              <Form.Control
                ref={numRef}
                type="text"
                placeholder="Enter number of shares to be minted"
              />
              <Form.Text className="text-muted">
                You can't mint more more shares after creating your vault.
              </Form.Text>
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              onClick={createFractionalVault}
              style={{ width: "100%" }}
            >
              {buttonTitle[step]}
            </Button>
            <br />
            <br />
            <br />
            <br />
            <br />
          </Form>
        </Col>
        <Col xs="12" md="12" lg="6">
          {loading && (
            <center>
              <Image
                src="https://miro.medium.com/max/1400/1*CsJ05WEGfunYMLGfsT2sXA.gif"
                alt="gif"
                width="300px"
              />
            </center>
          )}
          <Row className="justify-content-center" id="results">
            {messages.map((message, index) => (
              <Col xs="12" md="12" lg="12" key={index}>
                <Alert variant="success">{message}</Alert>
              </Col>
            ))}
          </Row>
          <Row className="justify-content-center" id="results">
            {errors.map((message, index) => (
              <Col xs="12" md="12" lg="12" key={index}>
                <Alert variant="success">{message}</Alert>
              </Col>
            ))}
          </Row>
        </Col>
        <br />
        <br />
        <br />
        <br />
        <br />
      </Row>
    </Fragment>
  );
}

export default FractionalizeNft;
