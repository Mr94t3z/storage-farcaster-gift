import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { storageRegistry } from "../lib/contracts.js";
import fetch from 'node-fetch';
import { createGlideClient, Chains, CurrenciesByChain } from "@paywithglide/glide-js";
import { encodeFunctionData, hexToBigInt, toHex } from 'viem';
import dotenv from 'dotenv';

// Uncomment this packages to tested on local server
// import { devtools } from 'frog/dev';
// import { serveStatic } from 'frog/serve-static';

// Load environment variables from .env file
dotenv.config();

// Define an in-memory cache object
const cache: Record<string, any> = {};

// Function to retrieve data from cache
async function getFromCache(key: string) {
    return cache[key];
}

// Function to cache data
async function cacheData(key: string, data: any) {
    cache[key] = data;
}

export const glideClient = createGlideClient({
  projectId: process.env.GLIDE_PROJECT_ID,
 
  // Lists the chains where payments will be accepted
  chains: [Chains.Base, Chains.Optimism],
});

const CAST_INTENS = 
  "https://warpcast.com/~/compose?text=Storage%20Farcaster%20Gift%20by%20@0x94t3z.eth&embeds[]=https://storage-farcaster-gift.vercel.app/api/frame"

export const app = new Frog({
  assetsPath: '/',
  basePath: '/api/frame',
  browserLocation: CAST_INTENS,
  imageOptions: {
    /* Other default options */
    fonts: [
      {
        name: 'Space Mono',
        source: 'google',
      },
    ],    
  },
})

// Initialize total pages and current page
const itemsPerPage = 1;
let totalPages = 0;
let currentPage = 1;

// Neynar API base URL
const baseUrlNeynarV2 = process.env.BASE_URL_NEYNAR_V2;

app.frame('/', (c) => {
  currentPage = 1;
  return c.res({
    image: '/storage-farcaster-gift-with-glide.jpeg',
    intents: [
      <Button action="/dashboard">Start 🎯</Button>,
    ]
  })
})

app.frame('/dashboard', async (c) => {
  const { frameData } = c;
  const { fid } = frameData as unknown as { buttonIndex?: number; fid?: string };

  try {
    const response = await fetch(`${baseUrlNeynarV2}/user/bulk?fids=${fid}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY || '',
      },
    });

    const data = await response.json();
    const userData = data.users[0];
  

    return c.res({
      image: (
        <div
          style={{
            alignItems: 'center',
            background: '#11365D',
            backgroundSize: '100% 100%',
            display: 'flex',
            flexDirection: 'column',
            flexWrap: 'nowrap',
            height: '100%',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
            color: 'white',
            fontFamily: 'Space Mono',
            fontSize: 32,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 0,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
          }}
        >
          <img
            src={userData.pfp_url.toLowerCase().endsWith('.webp') ? '/images/no_avatar.png' : userData.pfp_url}
            style={{
              width: 180,
              height: 180,
              borderRadius: '50%',
              boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.5)",
              border: '5px solid #FD274A',
            }}
            width={200} 
            height={200} 
          />
          <p>
            <span style={{ color: 'white' }}>Hi, </span>
            <span style={{ color: 'orange', textDecoration: 'underline' }}>@{userData.username}</span>
            <span> 🙌🏻</span>
          </p>
          <p style={{ color: '#A7D2D2', margin: '0', justifyContent: 'center', textAlign: 'center', fontSize: 32 }}>Do you want to find them?</p>
        </div>
      ),
      intents: [
        <Button action={`/show/${fid}`}>Yes, please!</Button>,
        <Button.Reset>No</Button.Reset>
      ],
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return c.res({
      image: (
          <div
              style={{
                  alignItems: 'center',
                  background: '#11365D',
                  backgroundSize: '100% 100%',
                  display: 'flex',
                  flexDirection: 'column',
                  flexWrap: 'nowrap',
                  height: '100%',
                  justifyContent: 'center',
                  textAlign: 'center',
                  width: '100%',
                  color: '#FD274A',
                  fontFamily: 'Space Mono',
                  fontSize: 32,
                  fontStyle: 'normal',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.4,
                  marginTop: 0,
                  padding: '0 120px',
                  whiteSpace: 'pre-wrap',
              }}
          >
            Uh oh, you clicked the button too fast! Please try again.
          </div>
      ),
      intents: [
          <Button.Reset>Try Again ⏏︎</Button.Reset>,
      ],
  });
  }
});


app.frame('/show/:fid', async (c) => {
  const { fid } = c.req.param();

  const { buttonValue } = c;

  // Handle navigation logic
  if (buttonValue === 'next' && currentPage < totalPages) {
    currentPage++;
  } else if (buttonValue === 'back' && currentPage > 1) {
    currentPage--;
  }

  try {
    // Fetch relevant following data (because we are using public trial, so we set limit to 100 to avoid rate limit error)
    const followingResponse = await fetch(`${baseUrlNeynarV2}/following?fid=${fid}&limit=100`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY || '',
      },
    });
    const followingData = await followingResponse.json();

    // Batch processing
    const chunkSize = 15;
    const chunkedUsers = [];
    for (let i = 0; i < followingData.users.length; i += chunkSize) {
        chunkedUsers.push(followingData.users.slice(i, i + chunkSize));
    }

    // Array to store promises for storage requests
    const storagePromises = [];

    // Iterate over each chunk and make separate requests for storage data
    for (const chunk of chunkedUsers) {
        const chunkPromises = chunk.map(async (userData: { user: { fid: undefined; username: any; pfp_url: any; }; }) => {
            if (userData && userData.user && userData.user.fid !== undefined && userData.user.username && userData.user.pfp_url) {
                const followingFid = userData.user.fid;
                const username = userData.user.username;
                const pfp_url = userData.user.pfp_url;

                // Check if storage data is already cached
                let storageData = await getFromCache(followingFid);
                if (!storageData) {
                    const storageResponse = await fetch(`${baseUrlNeynarV2}/storage/usage?fid=${followingFid}`, {
                        method: 'GET',
                        headers: {
                            'accept': 'application/json',
                            'api_key': process.env.NEYNAR_API_KEY || '',
                        },
                    });
                    storageData = await storageResponse.json();

                    // Cache the storage data
                    await cacheData(followingFid, storageData);
                }

                if (storageData && storageData.casts && storageData.reactions && storageData.links) {

                    // const totalStorageCapacity = (storageData.casts.capacity + storageData.reactions.capacity + storageData.links.capacity) * storageData.total_active_units;
                    const totalStorageCapacity = storageData.casts.capacity + storageData.reactions.capacity + storageData.links.capacity;

                    const totalStorageUsed = storageData.casts.used + storageData.reactions.used + storageData.links.used;

                    const totalStorageLeft = totalStorageCapacity - totalStorageUsed;

                    return {
                        fid: followingFid,
                        username: username,
                        pfp_url: pfp_url,
                        totalStorageLeft: totalStorageLeft,
                    };
                }
            } else {
                console.log("User data is missing necessary properties.");
                return null; // Return null for users with missing properties
            }
        });

        // Add promises for storage requests in this chunk to the main array
        storagePromises.push(...chunkPromises);
    }

    // Wait for all storage requests to complete
    const extractedData = await Promise.all(storagePromises);

    // Filter out null values
    const validExtractedData = extractedData.filter(data => data !== null);

    // Sort the extracted data in ascending order based on total storage left
    validExtractedData.sort((a, b) => a.totalStorageLeft - b.totalStorageLeft);

    // Calculate index range to display data from API
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, validExtractedData.length);
    const displayData = validExtractedData.slice(startIndex, endIndex);

    // Update totalPages based on the current extracted data
    totalPages = Math.ceil(validExtractedData.length / itemsPerPage);
    // Limit totalPages to 5
    totalPages = Math.min(totalPages, 5);

    // Get the follower chosen to gift storage
    const toFid = displayData.length > 0 ? displayData[0].fid : null;

    const totalStorageLeft = displayData.length > 0 ? displayData[0].totalStorageLeft : null;

    return c.res({
      image: (
        <div style={{
            alignItems: 'center',
            background: '#11365D',
            backgroundSize: '100% 100%',
            display: 'flex',
            flexDirection: 'column',
            flexWrap: 'nowrap',
            height: '100%',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
            color: 'white',
            fontFamily: 'Space Mono',
            fontSize: 32,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 0,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
          }}>
           {displayData.map((follower, index) => (
            <div key={index} style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'white', display: 'flex', fontSize: 30, flexDirection: 'column', marginBottom: 20 }}>
              <img
                  src={follower.pfp_url.toLowerCase().endsWith('.webp') ? '/images/no_avatar.png' : follower.pfp_url}
                  style={{
                      width: 180,
                      height: 180,
                      borderRadius: '50%',
                      boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.5)",
                      border: '5px solid #FD274A',
                  }}
                  width={200}
                  height={200}
                  alt="Profile Picture"
              />
              <p style={{ marginTop: 30, marginBottom: 15, color: "orange", justifyContent: 'center', textAlign: 'center', fontSize: 42, textDecoration: 'underline' }}>@{follower.username}</p>
              <p>
              </p>
              {follower.totalStorageLeft <= 0 ? (
                <p style={{ margin: 0, color: '#FD274A' }}>💾 Out of storage!</p>
              ) : (
                <p style={{ margin: 0 }}>
                  <span style={{ color: 'white' }}>💾 Storage Left: </span>
                  <span style={{ color: '#FD274A' }}>{follower.totalStorageLeft}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      ),
      intents: [
          <Button action={`/gift/${toFid}/${totalStorageLeft}`}>View ◉</Button>,
          <Button.Reset>Cancel ⏏︎</Button.Reset>,
         currentPage > 1 && <Button value="back">← Back</Button>,
        currentPage < totalPages && <Button value="next">Next →</Button>,
      ],
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return c.res({
      image: (
          <div
              style={{
                  alignItems: 'center',
                  background: '#11365D',
                  backgroundSize: '100% 100%',
                  display: 'flex',
                  flexDirection: 'column',
                  flexWrap: 'nowrap',
                  height: '100%',
                  justifyContent: 'center',
                  textAlign: 'center',
                  width: '100%',
                  color: '#FD274A',
                  fontFamily: 'Space Mono',
                  fontSize: 32,
                  fontStyle: 'normal',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.4,
                  marginTop: 0,
                  padding: '0 120px',
                  whiteSpace: 'pre-wrap',
              }}
          >
            Uh oh, you clicked the button too fast! Please try again.
          </div>
      ),
      intents: [
          <Button.Reset>Try Again ⏏︎</Button.Reset>,
      ],
  });
  }
});


app.frame('/gift/:toFid/:totalStorageLeft', async (c) => {
  const { toFid, totalStorageLeft } = c.req.param();

  try {
    const response = await fetch(`${baseUrlNeynarV2}/user/bulk?fids=${toFid}&viewer_fid=${toFid}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY || '',
      },
    });

    const data = await response.json();
    const userData = data.users[0];

    return c.res({
      action: `/tx-status`,
      image: (
        <div
            style={{
              alignItems: 'center',
              background: '#11365D',
              backgroundSize: '100% 100%',
              display: 'flex',
              flexDirection: 'column',
              flexWrap: 'nowrap',
              height: '100%',
              justifyContent: 'center',
              textAlign: 'center',
              width: '100%',
              color: 'black',
              fontFamily: 'Space Mono',
              fontSize: 32,
              fontStyle: 'normal',
              letterSpacing: '-0.025em',
              lineHeight: 1.4,
              marginTop: 0,
              padding: '0 120px',
              whiteSpace: 'pre-wrap',
            }}
          >
            <img
              src={userData.pfp_url.toLowerCase().endsWith('.webp') ? '/images/no_avatar.png' : userData.pfp_url}
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.5)",
                border: '5px solid #FD274A',
              }}
            />

            <p style={{ marginTop: 50, fontSize: 42 }}>
              <span style={{ color: 'white' }}>Gift storage to </span>
              <span style={{ color: 'orange', textDecoration: 'underline' }}>@{userData.username}</span>
              <span style={{ color: 'white' }}> ?</span>
            </p>

            {Number(totalStorageLeft) <= 0 ? (
              <p style={{ marginTop: 30, color: '#FD274A'}}>💾 Out of storage!</p>
            ) : (
              <p style={{marginTop: 30 }}>
                <span style={{ color: 'white' }}>💾 Storage Left: </span>
                <span style={{ color: '#FD274A' }}>{totalStorageLeft}</span>
              </p>
            )}
          </div>
      ),
      intents: [
        <Button.Transaction target={`/tx-gift/${toFid}`}>Yes</Button.Transaction>,
         <Button.Reset>No</Button.Reset>,
      ]
    })
    } catch (error) {
      console.error('Error fetching user data:', error);
      return c.res({
        image: (
            <div
                style={{
                    alignItems: 'center',
                    background: '#11365D',
                    backgroundSize: '100% 100%',
                    display: 'flex',
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
                    height: '100%',
                    justifyContent: 'center',
                    textAlign: 'center',
                    width: '100%',
                    color: '#FD274A',
                    fontFamily: 'Space Mono',
                    fontSize: 32,
                    fontStyle: 'normal',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.4,
                    marginTop: 0,
                    padding: '0 120px',
                    whiteSpace: 'pre-wrap',
                }}
            >
              Uh oh, you clicked the button too fast! Please try again.
            </div>
        ),
        intents: [
            <Button.Reset>Try Again ⏏︎</Button.Reset>,
        ],
    });
    }
})

 
app.transaction('/tx-gift/:toFid', async (c, next) => {
  await next();
  const txParams = await c.res.json();
  txParams.attribution = false;
  console.log(txParams);
  c.res = new Response(JSON.stringify(txParams), {
    headers: {
      "Content-Type": "application/json",
    },
  });
},
async (c) => {
  const { address } = c;
  const { toFid } = c.req.param();

  // Get current storage price
  const units = 1n;
  const price = await storageRegistry.read.price([units]);

  const { unsignedTransaction } = await glideClient.createSession({
    payerWalletAddress: address,
   
    // Optional. Setting this restricts the user to only
    // pay with the specified currency.
    paymentCurrency: CurrenciesByChain.BaseMainnet.ETH,
    
    transaction: {
      chainId: Chains.Optimism.caip2,
      to: storageRegistry.address,
      value: toHex(price),
      input: encodeFunctionData({
        abi: storageRegistry.abi,
        functionName: "rent",
        args: [BigInt(toFid), units],
      }),
    },
  });

  if (!unsignedTransaction) {
    throw new Error("missing unsigned transaction");
  }

  return c.send({
    chainId: Chains.Base.caip2,
    to: unsignedTransaction.to,
    data: unsignedTransaction.input,
    value: hexToBigInt(unsignedTransaction.value),
  });
})


app.frame("/tx-status", async (c) => {
  const { transactionId, buttonValue } = c;
 
  // The payment transaction hash is passed with transactionId if the user just completed the payment. If the user hit the "Refresh" button, the transaction hash is passed with buttonValue.
  const txHash = transactionId || buttonValue;
 
  if (!txHash) {
    throw new Error("missing transaction hash");
  }
 
  try {
    let session = await glideClient.getSessionByPaymentTransaction({
      chainId: Chains.Base.caip2,
      txHash,
    });
 
    // Wait for the session to complete. It can take a few seconds
    session = await glideClient.waitForSession(session.sessionId);
 
    return c.res({
      image: (
        <div
          style={{
            alignItems: 'center',
            background: '#11365D',
            backgroundSize: '100% 100%',
            display: 'flex',
            flexDirection: 'column',
            flexWrap: 'nowrap',
            height: '100%',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
            color: 'white',
            fontFamily: 'Space Mono',
            fontSize: 32,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 0,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
          }}
        >
          Storage gifted successfully!
        </div>
      ),
      intents: [
        <Button.Link
          href={`https://optimistic.etherscan.io/tx/${session.sponsoredTransactionHash}`}
        >
          View on Exploler
        </Button.Link>,
        <Button action="/">Home ⏏︎</Button>,
      ],
    });
  } catch (e) {
    // If the session is not found, it means the payment is still pending.
    // Let the user know that the payment is pending and show a button to refresh the status.
    return c.res({
      image: (
        <div
          style={{
            alignItems: 'center',
            background: '#11365D',
            backgroundSize: '100% 100%',
            display: 'flex',
            flexDirection: 'column',
            flexWrap: 'nowrap',
            height: '100%',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
            color: '#FD274A',
            fontFamily: 'Space Mono',
            fontSize: 32,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 0,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
          }}
        >
          Waiting for payment confirmation..
        </div>
      ),
 
      intents: [
        <Button value={txHash} action="/tx-status">
          Refresh
        </Button>,
      ],
    });
  }
});


// Uncomment for local server testing
// devtools(app, { serveStatic });

export const GET = handle(app)
export const POST = handle(app)
