import './App.css';
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getParsedNftAccountsByOwner, isValidSolanaAddress, createConnectionConfig, } from "@nfteyez/sol-rayz";
import { Col, Row, Button, Form, Card } from "react-bootstrap";
import AlertDismissible from './alert/alertDismissible';
import { useNavigate } from 'react-router-dom';
import { Connection, PublicKey } from '@solana/web3.js';

function App(props) {
  const { publicKey } = useWallet();
  const { connection } = props;
  
  
  // input ref
  const inputRef = useRef();
  const navigate = useNavigate();

  // state change
  useEffect(() => {
    setNfts([]);
    setShow(false);
     if (publicKey) {
       inputRef.current.value = publicKey;
     }
  }, [publicKey, connection]);
  const [nfts, setNfts] = useState([]);

  //alert props
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [show, setShow] = useState(false);

  //loading props
  const [loading, setLoading] = useState(false);


  const getNfts = async (e) => {
    e.preventDefault();

    setShow(false);

    let address = inputRef.current.value;

    if (address.length === 0) {
      address = publicKey;
    }

    if (!isValidSolanaAddress(address)) {
      setTitle("Invalid address");
      setMessage("Please enter a valid Solana address or Connect your wallet");
      setLoading(false);
      setShow(true);
      return;
    }

    const connect = createConnectionConfig(connection);

    setLoading(true);
    const nftArray = await getParsedNftAccountsByOwner({
      publicAddress: address,
      connection: connect,
      serialization: true,
    });

    console.log(nftArray);

    if (nftArray.length === 0) {
      setTitle("No NFTs found in " + props.title);
      setMessage("No NFTs found for address: " + address);
      setLoading(false);
      setShow(true);
      return;
    }

    const metadatas = await fetchMetadata(nftArray);
        console.log("Got nfts metadata");
    setLoading(false);
    return setNfts(metadatas);
  };

  const fetchMetadata = async (nftArray) => {
    let metadatas = [];
    for (const nft of nftArray) {
      await fetch(nft.data.uri)
        .then((response) => response.json())
        .then((meta) => {
          metadatas.push({...meta,...nft});
        });
    }
    return metadatas;
  };

  async function getNftsHolderTokenAccount(tokenMint) {
    const connect = new Connection(connection);
    const largestAccounts = await connect.getTokenLargestAccounts(
      new PublicKey(tokenMint)
    );
    console.log(largestAccounts);
    return largestAccounts.value[0].address.toBase58();
  }

  async function _navigateToFragment (mint,image) {
    const tokenAccount = await getNftsHolderTokenAccount(mint);
    console.log(tokenAccount);
    console.log(mint);
    navigate("/fragment", {
      state:{
          mint,
          tokenAccount,
          image,
          connection: connection
        },
    });

  }

  return (
    <div className="main">
      <Row className="inputForm">
        <Col lg="2"></Col>
        <Col xs="12" md="12" lg="5">
          <Form.Control
            type="text"
            ref={inputRef}
            placeholder="Wallet address"
          />
        </Col>
        <Col xs="12" md="12" lg="3" className="d-grid">
          <Button
            variant={props.variant.toLowerCase()}
            type="submit"
            onClick={getNfts}
          >
            {" "}
            Get NFTs from {props.title}{" "}
          </Button>
        </Col>

        <Col lg="2"></Col>
      </Row>
      {loading && (
        <div className="loading">
          <img src="loading.gif" alt="loading" />
        </div>
      )}
      <Row>
        {!loading &&
          nfts.map((metadata, index) => (
            <Col xs="12" md="12" lg="3" key={index}>
              <Card onClick={()=>{_navigateToFragment(metadata.mint, metadata?.image )}} className="imageGrid" lg="3" style={{ width: "100%" }}>
                <Card.Img
                  variant="top"
                  src={metadata?.image}
                  alt={metadata?.name}
                />
                <Card.Body>
                  <Card.Title>{metadata?.name}</Card.Title>
                </Card.Body>
              </Card>
            </Col>
          ))}
      </Row>

      {show && (
        <AlertDismissible title={title} message={message} setShow={setShow} />
      )}
    </div>
  );
}

export default App;
