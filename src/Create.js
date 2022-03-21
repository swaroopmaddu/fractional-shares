
import * as metaplex from "@metaplex/js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { Fragment, useRef, useState } from "react";
import { Col, Form, Row, Button, ProgressBar } from "react-bootstrap";
import {addObjectToIPFS} from "./utils/mint_nft";


function CreateArt(props) {

	  const [selectedFile, setSelectedFile] = useState();
    const [files, setFiles] = useState([]);
    const [isFilePicked, setIsFilePicked] = useState(false);
    const { publicKey, wallet} = useWallet();
    
    const [nftCreateProgress, setNFTcreateProgress] = useState(0);

    //attributes of the NFT
    const [attributes, setAttributes] = useState([
      { trait: "", value: "", display_type: undefined },
    ]);

    // refs for input fields
    const titleRef = useRef();
    const symbolRef = useRef();
    const descriptionRef = useRef();

    

    //To display the image
    const changeHandler = (event) => {
        if (event.target.files && event.target.files[0]) {
          let reader = new FileReader();
          let file = event.target.files[0];
          setFiles([file]);
          reader.onloadend = (e) => {
            setSelectedFile(e.target.result);
          };
          reader.readAsDataURL(file);
        }
        setIsFilePicked(true);
    };

    const handleAddFields = () => {
      const values = [...attributes];
      values.push({ trait: "", value: "", display_type: undefined });
      setAttributes(values);
    };

     const handleChange = (index, event) => {
       //set attributes
       const values = [...attributes];

       if (event.target.name === "trait") {
         values[index].trait = event.target.value;
       } else if ( event.target.name === "value" ) {
         values[index].value = event.target.value;
       } else if (event.target.name === "display_type") {
         values[index].display_type = event.target.value;
       }
       setAttributes(values);
     };


    // To send the transaction for creating the NFT
    const handleSubmission = async (event) => {
        event.preventDefault();

        const connection = new Connection(props.endpoint);

        const metadata = {
          name: titleRef.current.value,
          symbol: symbolRef.current.value,
          creators: [
            {
              address: publicKey.toString(),
              verified: true,
              share: 100,
            },
          ],
          description: descriptionRef.current.value,
          image: "",
          animation_url: undefined,
          attributes: attributes,
          seller_fee_basis_points: 1000,
          external_url: "",
          properties: {
            category: "image",
            files: [
              {
                type: "image/jpeg",
                uri: "",
              },
            ],
          },
        };
        setNFTcreateProgress(20);

        const uri = await addObjectToIPFS(metadata, files[0]);
        console.log(uri);
        setNFTcreateProgress(50);
        
        let walletAdapter = wallet.adapter;

        const _nftResponse = await metaplex.actions.mintNFT({
          connection,
          wallet: walletAdapter,
          uri,
          maxSupply:1,
        });
        console.log(_nftResponse);
        await connection.confirmTransaction(_nftResponse.txId);
        setNFTcreateProgress(100);
        alert("NFT created successfully");
    };

    return (
      <Fragment>
        <h1>Create Art</h1>
        <Row style={{ padding: "20px" }}>
          <Col xs="12" md="12" lg="6">
            <Row style={{ marginTop: "10px" }}>
              <Col>
                {isFilePicked && (
                  <img
                    height={300}
                    width={300}
                    src={selectedFile}
                    alt="Hello"
                  />
                )}
              </Col>
            </Row>
            <br />
            <input type="file" name="file" onChange={changeHandler} />
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  ref={titleRef}
                  placeholder="Max 50 characters"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Symbol</Form.Label>
                <Form.Control
                  type="text"
                  ref={symbolRef}
                  placeholder="Max 10 characters"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  type="text"
                  ref={descriptionRef}
                  placeholder="Max 500 characters"
                  as="textarea"
                  rows={3}
                />
              </Form.Group>
            </Form>
            <Col style={{ display: "flex", justifyContent: "space-between" }}>
              <Form>
                {attributes.map((data, i) => {
                  return (
                    <Row className="mt-3" key={i}>
                      <Col xs={12} md={6}>
                        <Form.Group controlId="forTrair">
                          <Form.Label>Trait</Form.Label>
                          <Form.Control
                            onChange={(e) => handleChange(i, e)}
                            type="text"
                            name="trait"
                            placeholder="Add trait"
                            value={data.trait}
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Group controlId="forValue">
                          <Form.Label>Value</Form.Label>
                          <Form.Control
                            onChange={(e) => handleChange(i, e)}
                            type="text"
                            name="value"
                            placeholder="value"
                            value={data.value}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  );
                })}
              </Form>
            </Col>
            <br />
            <Col style={{ display: "flex", justifyContent: "space-between" }}>
              <Button
                style={{ width: "40%" }}
                variant="primary"
                type="submit"
                onClick={handleAddFields}
              >
                Add another attribute
              </Button>
              <Button
                style={{ width: "40%" }}
                variant="primary"
                type="submit"
                onClick={handleSubmission}
              >
                Submit
              </Button>
            </Col>
          </Col>

          <Col xs="12" md="12" lg="6">
            <Row>
              <Col>
                <ProgressBar now={nftCreateProgress} />
              </Col>
            </Row>
          </Col>
        </Row>
        <br />
        <br />
      </Fragment>
    );
}
export default CreateArt;