import { Button, Frog, TextInput } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'
import { Box, Image, Text, VStack, Spacer, vars } from "../lib/ui.js";
import { storageRegistry } from "../lib/contracts.js";
import { createGlideClient, Chains, CurrenciesByChain } from "@paywithglide/glide-js";
import { encodeFunctionData, hexToBigInt, toHex } from 'viem';
import { Lum0x } from "lum0x-sdk";
import dotenv from 'dotenv';

// Uncomment this packages to tested on local server
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';

// Load environment variables from .env file
dotenv.config();

// Initialize Lum0x SDK with API key
Lum0x.init(process.env.LUM0X_API_KEY || '');

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

// Cache to store user data
const cacheUser = new Map();

// Function to fetch user data by fid
async function fetchUserData(fid: string) {
  if (cacheUser.has(fid)) {
    return cacheUser.get(fid);
  }

  // Fetch user data using Lum0x.farcasterUser.getUserByFids
  const res = await Lum0x.farcasterUser.getUserByFids({
    fids: fid,  // Pass the FID directly
  });

  // Ensure the response contains the necessary user data
  if (!res || !res.users || res.users.length === 0) {
    throw new Error('User not found!');
  }

  const user = res.users[0];
  cacheUser.set(fid, user);
  return user;
}

export const glideClient = createGlideClient({
  projectId: process.env.GLIDE_PROJECT_ID,
 
  // Lists the chains where payments will be accepted
  chains: [Chains.Base, Chains.Optimism],
});


const baseUrl = "https://warpcast.com/~/compose";
const text = "FC Storage Gift 💾\n\nFrame by @0x94t3z.eth";
const embedUrl = "https://base.0x94t3z.tech/api/frame";

const CAST_INTENS = `${baseUrl}?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embedUrl)}`;

export const app = new Frog({
  assetsPath: '/',
  basePath: '/api/frame',
  ui: { vars },
  browserLocation: CAST_INTENS,
  title: "FC Storage Gift - Base",
  headers: {
    'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate max-age=0, s-maxage=0',
  },
}).use(
  neynar({
    apiKey: process.env.NEYNAR_API_KEY || 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  }),
)


// Initialize total pages and current page
const itemsPerPage = 1;
let totalPages = 0;
let currentPage = 1;

// Neynar API base URL
const baseUrlNeynarV2 = process.env.BASE_URL_NEYNAR_V2;

app.frame('/', (c) => {
  return c.res({
    image: '/fc_storage_gift_on_base.png',
    intents: [
      <Button action="/dashboard">Start</Button>,
    ]
  })
})

app.frame('/dashboard', async (c) => {
  const { fid } = c.var.interactor || {}

  try {
    return c.res({
      image: `/dashboard-image/${fid}`,
      intents: [
        <TextInput placeholder="Search by username" />,
        <Button action={`/show/${fid}`}>Let's go!</Button>,
        <Button action='/search-by-username'>Search 🔎</Button>,
        <Button.Reset>Cancel</Button.Reset>
      ],
    });
  } catch (error) {
    console.error('Unhandled error:', error);
    return c.error({
      message: `${error}`,
    });
  }
});

app.image('/dashboard-image/:fid', async (c) => {
  const { fid } = c.req.param();

  const user = await fetchUserData(fid);

  return c.res({
    image: (
      <Box
        grow
        alignVertical="center"
        backgroundColor="white"
        padding="48"
        textAlign="center"
        height="100%"
      >
        <VStack gap="4">
            <Image
                height="24"
                objectFit="cover"
                src="/images/base.png"
              />
            <Spacer size="24" />
            <Box flexDirection="row" alignHorizontal="center" alignVertical="center">

              <img
                  height="128"
                  width="128"
                  src={user.pfp_url}
                  style={{
                    borderRadius: "38%",
                    border: "3.5px solid #6212EC",
                  }}
                />
              
              <Spacer size="12" />
                <Box flexDirection="column" alignHorizontal="left">
                  <Text color="black" align="left" size="16">
                    Hi, {user.display_name} 👋
                  </Text>
                  <Text color="grey" align="left" size="14">
                    @{user.username}
                  </Text>
                </Box>
            </Box>
            <Spacer size="22" />
            <Text align="center" color="purple" size="20">
              Do you want to find them?
            </Text>
            <Spacer size="22" />
            <Box flexDirection="row" justifyContent="center">
                <Text color="grey" align="center" size="16">created by</Text>
                <Spacer size="4" />
                <Text color="purple" decoration="underline" align="center" size="16"> @0x94t3z</Text>
            </Box>
        </VStack>
    </Box>
    ),
  })
})

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
    // Fetch following users using Lum0x SDK
    let followingResponse = await Lum0x.farcasterFollowers.getUsersFollowedByFid({
      fid: Number(fid),
      limit: 100
    });
    
    // Ensure followingResponse.users exists and is an array
    if (!followingResponse || !Array.isArray(followingResponse.users)) {
        throw new Error('Invalid following response structure');
    }
    
    // Batch processing
    const chunkSize = 15;
    const chunkedUsers = [];
    for (let i = 0; i < followingResponse.users.length; i += chunkSize) {
        chunkedUsers.push(followingResponse.users.slice(i, i + chunkSize));
    }
    
    const storagePromises = [];
    
    // Iterate over each chunk and make separate requests for storage data
    for (const chunk of chunkedUsers) {
        const chunkPromises = chunk.map(async (userData: { user: { fid: any; username: any; pfp_url: any; }; }) => {
            if (userData && userData.user && typeof userData.user.fid !== 'undefined' && userData.user.username && userData.user.pfp_url) {
                const followingFid = userData.user.fid;
                const username = userData.user.username;
                const pfp_url = userData.user.pfp_url;
    
                // Check if storage data is already cached
                let storageResponse = await getFromCache(followingFid);
                if (!storageResponse) {
                    storageResponse = await Lum0x.farcasterStorage.getStorageUsage({
                        fid: followingFid
                    });
    
                    // Cache the storage data
                    await cacheData(followingFid, storageResponse);
                }
    
                if (storageResponse && storageResponse.casts && storageResponse.reactions && storageResponse.links) {
                    const totalStorageCapacity = (storageResponse.casts.capacity + storageResponse.reactions.capacity + storageResponse.links.capacity);
                    const totalStorageUsed = (storageResponse.casts.used + storageResponse.reactions.used + storageResponse.links.used);
                    const totalStorageLeft = totalStorageCapacity - totalStorageUsed;
    
                    return {
                        fid: followingFid,
                        username: username,
                        pfp_url: pfp_url,
                        totalStorageLeft: totalStorageLeft,
                    };
                }
            } else {
                console.log("User data is missing necessary properties or user object is undefined.");
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
    const pfpUrl = displayData.length > 0 ? displayData[0].pfp_url : null;
    const displayName = displayData.length > 0 ? displayData[0].display_name : null;
    const username = displayData.length > 0 ? displayData[0].username : null;
    const totalStorageLeft = displayData.length > 0 ? displayData[0].totalStorageLeft : null;

    return c.res({
        image: (
          <Box
            grow
            alignVertical="center"
            backgroundColor="black"
            padding="48"
            textAlign="center"
            height="100%"
          >
            <VStack gap="4">
                <Image
                    height="24"
                    objectFit="cover"
                    src="/images/base.png"
                  />
                <Spacer size="32" />
                <Box flexDirection="row" alignHorizontal="center" alignVertical="center">
                  
                  <img
                      height="96"
                      width="96"
                      src={pfpUrl}
                      style={{
                        borderRadius: "38%",
                        border: "3.5px solid #6212EC",
                      }}
                    />

                  <Spacer size="12" />
                    <Box flexDirection="column" alignHorizontal="left">
                      <Text color="white" align="left" size="16">
                        {displayName}
                      </Text>
                      <Text color="grey" align="left" size="14">
                        @{username}
                      </Text>
                    </Box>
                  </Box>
                <Spacer size="22" />
                {Number(totalStorageLeft) <= 0 ? (
                  <Text align="center" color="red" size="20">
                    💾 Out of storage!
                  </Text>
                ) : (
                  <Box flexDirection="row" justifyContent="center">
                  <Text color="purple" align="center" size="20">💾 {totalStorageLeft}</Text>
                  <Spacer size="6" />
                  <Text color="white" align="center" size="20">storage left!</Text>
                </Box>
                )}
                <Spacer size="32" />
                <Box flexDirection="row" justifyContent="center">
                    <Text color="white" align="center" size="16">created by</Text>
                    <Spacer size="6" />
                    <Text color="purple" decoration="underline" align="center" size="16"> @0x94t3z</Text>
                </Box>
            </VStack>
        </Box>
      ),
      intents: [
        <Button action={`/gift/${toFid}`}>Gift</Button>,
        <Button.Reset>Cancel</Button.Reset>,
        currentPage > 1 && <Button value="back">← Back</Button>,
        currentPage < totalPages && <Button value="next">Next →</Button>,
      ],
    });
  } catch (error) {
    console.error('Unhandled error:', error);
    return c.error({
      message: `${error}`,
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
    data: unsignedTransaction.input || undefined,
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
devtools(app, { serveStatic });

export const GET = handle(app)
export const POST = handle(app)
