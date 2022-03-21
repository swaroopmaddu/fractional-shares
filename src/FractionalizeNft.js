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
  setLoading(false);
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
