import ImageKit from "imagekit"

const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || ""
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || ""
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || ""

// Instantiate the ImageKit SDK client.
// Note: Private key should only be used on the server side.
export const imagekit = new ImageKit({
  publicKey,
  privateKey,
  urlEndpoint,
})
