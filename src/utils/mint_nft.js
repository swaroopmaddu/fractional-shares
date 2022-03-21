import { nanoid } from "nanoid";
import { create } from "ipfs-http-client";


async function   addImageToIPFS (image) {

  const client = create("https://ipfs.infura.io:5001/api/v0");

  try {
    const added = await client.add(image);
    const url = `https://ipfs.infura.io/ipfs/${added.path}`;
    return url;
  } catch (error) {
    console.log("Error uploading file: ", error);
  }  
}

export async function addObjectToIPFS(metadata,imageFile){

  const uri = await addImageToIPFS(imageFile);

  // add image ipfs address to metadata
  metadata.image = uri;
  metadata.properties.files[0].uri = uri;
  
  //ipfs client 
  const client = create("https://ipfs.infura.io:5001/api/v0");

  // prepare metadata for Solana NFT
  const metadataContent = {
    name: metadata.name,
    symbol: metadata.symbol,
    description: metadata.description,
    seller_fee_basis_points: metadata.sellerFeeBasisPoints,
    image: metadata.image,
    animation_url: metadata.animation_url,
    attributes: metadata.attributes,
    external_url: metadata.external_url,
    properties: {
      ...metadata.properties,
      creators: metadata.creators?.map((creator) => {
        return {
          address: creator.address,
          share: creator.share,
        };
      }),
    },
  };
  
  //create json file with metadata
  const code = nanoid(4).toString("hex");
  var formdata = new FormData();
  const str = JSON.stringify(metadataContent);
  const bytes = new TextEncoder().encode(str);
  const blob = new Blob([bytes], {
    type: "application/json;charset=utf-8",
  });
  formdata.append("", blob, `metadata_${code}.json`);

  try {
    //add json to ipfs
    const added = await client.add(blob);
    const url = `https://ipfs.infura.io/ipfs/${added.path}`;
    return url;
  } catch (error) {
    console.log("Error uploading file: ", error);
  }  
};



