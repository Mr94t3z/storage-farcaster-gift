import { Button, Frog, TextInput } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'
import { Box, Image, Text, VStack, Spacer, vars } from "../lib/ui.js";
import { storageRegistry } from "../lib/contracts.js";
import { createGlideConfig, chains, createSession, currencies, getSessionById, updatePaymentTransaction } from "@paywithglide/glide-js";
import { hexToBigInt, toHex } from 'viem';
import { Lum0x } from "lum0x-sdk";
import dotenv from 'dotenv';

// Uncomment this packages to tested on local server
// import { devtools } from 'frog/dev';
// import { serveStatic } from 'frog/serve-static';

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

export const glideConfig = createGlideConfig({
  projectId: process.env.GLIDE_PROJECT_ID || '',

  chains: [chains.base, chains.optimism],
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
  title: "FC Storage Gift - Powered by Base Network",
  headers: {
    'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate max-age=0, s-maxage=0',
  },
  hub: {
    apiUrl: "https://hubs.airstack.xyz",
    fetchOptions: {
      headers: {
        "x-airstack-hubs": process.env.AIRSTACK_API_KEY || '',
      }
    }
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
                  <Text color="black" align="left" size="20">
                    Hi, {user.display_name} 👋
                  </Text>
                  <Text color="grey" align="left" size="18">
                    @{user.username}
                  </Text>
                </Box>
            </Box>
            <Spacer size="22" />
            <Text align="center" color="purple" size="24">
              Do you want to find them?
            </Text>
            <Spacer size="22" />
            <Box flexDirection="row" justifyContent="center">
                <Text color="grey" align="center" size="18">created by</Text>
                <Spacer size="4" />
                <Text color="purple" decoration="underline" align="center" size="18"> @0x94t3z</Text>
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
                      <Text color="black" align="left" size="20">
                        {displayName}
                      </Text>
                      <Text color="grey" align="left" size="18">
                        @{username}
                      </Text>
                    </Box>
                  </Box>
                <Spacer size="22" />
                {Number(totalStorageLeft) <= 0 ? (
                  <Text align="center" color="red" size="24">
                    💾 Out of storage!
                  </Text>
                ) : (
                  <Box flexDirection="row" justifyContent="center">
                  <Text color="purple" align="center" size="24">💾 {totalStorageLeft}</Text>
                  <Spacer size="6" />
                  <Text color="black" align="center" size="24">storage left!</Text>
                </Box>
                )}
                <Spacer size="32" />
                <Box flexDirection="row" justifyContent="center">
                    <Text color="grey" align="center" size="18">created by</Text>
                    <Spacer size="6" />
                    <Text color="purple" decoration="underline" align="center" size="18"> @0x94t3z</Text>
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

app.frame('/search-by-username', async (c) => {
  const { inputText } = c;

  try {
    // Fetch by username using Lum0x SDK
    const usernameResponse = await Lum0x.farcasterUser.searchUser({
      q: `${inputText}`,
      limit: 1
    });

    const isUserFound = usernameResponse?.result?.users?.[0];

    if (!isUserFound) {
      return c.error({
        message: `@${inputText} not found!`,
      });
    }

    const toFid = isUserFound.fid;
    const pfpUrl = isUserFound.pfp_url;
    const displayName = isUserFound.display_name;
    const username = isUserFound.username;

    const storageResponse = await Lum0x.farcasterStorage.getStorageUsage({
      fid: toFid
    });

    let totalStorageLeft = 0

    if (storageResponse && storageResponse.casts && storageResponse.reactions && storageResponse.links) {

      const totalStorageCapacity = (storageResponse.casts.capacity + storageResponse.reactions.capacity + storageResponse.links.capacity);
    
      const totalStorageUsed = (storageResponse.casts.used + storageResponse.reactions.used + storageResponse.links.used);
    
      totalStorageLeft = totalStorageCapacity - totalStorageUsed;
    }

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
                      <Text color="black" align="left" size="20">
                        {displayName}
                      </Text>
                      <Text color="grey" align="left" size="18">
                        @{username}
                      </Text>
                    </Box>
                  </Box>
                <Spacer size="22" />
                {Number(totalStorageLeft) <= 0 ? (
                  <Text align="center" color="red" size="24">
                    💾 Out of storage!
                  </Text>
                ) : (
                  <Box flexDirection="row" justifyContent="center">
                  <Text color="purple" align="center" size="24">💾 {totalStorageLeft}</Text>
                  <Spacer size="6" />
                  <Text color="black" align="center" size="24">storage left!</Text>
                </Box>
                )}
                <Spacer size="32" />
                <Box flexDirection="row" justifyContent="center">
                    <Text color="grey" align="center" size="18">created by</Text>
                    <Spacer size="6" />
                    <Text color="purple" decoration="underline" align="center" size="18"> @0x94t3z</Text>
                </Box>
            </VStack>
        </Box>
      ),
      intents: [
        <Button action={`/gift/${toFid}`}>Gift</Button>,
        <Button.Reset>Cancel</Button.Reset>,
      ],
    });
  } catch (error) {
    console.error('Unhandled error:', error);
    return c.error({
      message: `${error}`,
    });
  }
});

app.frame('/gift/:toFid', async (c) => {
  const { toFid } = c.req.param();

  const units = 1n;
  const price = await storageRegistry.read.price([units]);
 
  // Create a Glide session for rent Farcaster Storage
  const { sessionId } = await createSession(glideConfig, {
    paymentCurrency: currencies.eth.on(chains.base),

    chainId: chains.optimism.id,
    abi: storageRegistry.abi,
    address: storageRegistry.address,
    functionName: "rent",
    args: [BigInt(toFid), units],
    value: BigInt(toHex(price)),
  });

  try {
    return c.res({
      image: `/gift-image/${toFid}`,
      intents: [
        <Button.Transaction target={`/tx-gift/${sessionId}`} action={`/tx-status/${sessionId}/${toFid}`}>Confirm</Button.Transaction>,
        <Button action='/'>Cancel</Button>,
      ]
    })
    } catch (error) {
      console.error('Unhandled error:', error);
      return c.error({
        message: `${error}`,
      });
    }
})

app.image('/gift-image/:toFid', async (c) => {
  const { toFid } = c.req.param();

  const user = await fetchUserData(toFid);

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
            <Spacer size="32" />
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
                  <Text color="black" align="left" size="20">
                    {user.display_name}
                  </Text>
                  <Text color="grey" align="left" size="18">
                    @{user.username}
                  </Text>
                </Box>
              </Box>
            <Spacer size="22" />
            <Box flexDirection="row" justifyContent="center">
              <Text color="black" align="center" size="24">Do you want to gift</Text>
              <Spacer size="6" />
              <Text color="purple" align="center" size="24">@{user.username}</Text>
              <Spacer size="6" />
              <Text color="black" align="center" size="24">?</Text>
            </Box>
            <Spacer size="32" />
            <Box flexDirection="row" justifyContent="center">
                <Text color="grey" align="center" size="18">created by</Text>
                <Spacer size="6" />
                <Text color="purple" decoration="underline" align="center" size="18"> @0x94t3z</Text>
            </Box>
        </VStack>
    </Box>
    ),
  })
})

app.transaction('/tx-gift/:sessionId', async (c, next) => {
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
  const { sessionId } = c.req.param();
 
  const { unsignedTransaction } = await getSessionById(
    glideConfig,
    sessionId,
  );

  if (!unsignedTransaction) {
    throw new Error("missing unsigned transaction");
  }

  console.log("unsignedTransaction: ", unsignedTransaction);

  return c.send({
    chainId: `eip155:${chains.base.id}`,
    to: unsignedTransaction.to,
    data: unsignedTransaction.input || undefined,
    value: hexToBigInt(unsignedTransaction.value),
  });
})

app.frame("/tx-status/:sessionId/:toFid", async (c) => {
    const { transactionId, buttonValue } = c;
    const { sessionId, toFid } = c.req.param();

    // The payment transaction hash is passed with transactionId if the user just completed the payment. If the user hit the "Refresh" button, the transaction hash is passed with buttonValue.
    const txHash = transactionId || buttonValue;

    if (!txHash) {
      return c.error({
        message: "Missing transaction hash, please try again.",
      });
    }

    // Check if the session is already completed
    const { success } = await updatePaymentTransaction(glideConfig, {
      sessionId: sessionId,
      hash: txHash as `0x${string}`,
    });

    if (!success) {
      throw new Error("failed to update payment transaction");
    }

    // Get the current session state
    const session = await getSessionById(glideConfig, sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    console.log("Session: ", session);

    // If the session has a sponsoredTransactionHash, it means the transaction is complete
    if (session.sponsoredTransactionHash) {
      const user = await fetchUserData(toFid);

      const completeTxHash = session.sponsoredTransactionHash;
      const shareText = `I just gifted 1 unit of storage to @${user.username} on @base !\n\nFrame by @0x94t3z.eth`;
      const embedUrlByUser = `${embedUrl}/share-by-user/${toFid}/${completeTxHash}`;
      const SHARE_BY_USER = `${baseUrl}?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(embedUrlByUser)}`;

      return c.res({
        image: `/image-share-by-user/${toFid}`,
        intents: [
          <Button.Link href={`https://optimistic.etherscan.io/tx/${completeTxHash}`}>View on Explorer</Button.Link>,
          <Button.Link href={SHARE_BY_USER}>Share</Button.Link>,
        ],
      });
    } else {
      // If the session does not have a sponsoredTransactionHash, the payment is still pending
      return c.res({
        image: '/waiting.gif',
        intents: [
          <Button value={txHash} action={`/tx-status/${toFid}`}>
            Refresh
          </Button>,
        ],
      });
    }
  }
);

app.frame("/share-by-user/:toFid/:completeTxHash", async (c) => {
  const { toFid, completeTxHash } = c.req.param();

  return c.res({
    image: `/image-share-by-user/${toFid}`,
    intents: [
      <Button.Link href={`https://optimistic.etherscan.io/tx/${completeTxHash}`}>View on Explorer</Button.Link>,
      <Button action='/'>Give it a try!</Button>,
    ],
  });
});

app.image("/image-share-by-user/:toFid", async (c) => {
  const { toFid } = c.req.param();

  const user = await fetchUserData(toFid);
 
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
            <Spacer size="32" />
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
                  <Text color="black" align="left" size="20">
                    {user.display_name}
                  </Text>
                  <Text color="grey" align="left" size="18">
                    @{user.username}
                  </Text>
                </Box>
              </Box>
            <Spacer size="22" />
            <Box flexDirection="row" justifyContent="center">
              <Text color="black" align="center" size="24">Successfully gifted to</Text>
              <Spacer size="6" />
              <Text color="purple" align="center" size="24">@{user.username}</Text>
              <Spacer size="6" />
              <Text color="black" align="center" size="24">!</Text>
            </Box>
            <Spacer size="32" />
            <Box flexDirection="row" justifyContent="center">
                <Text color="grey" align="center" size="18">created by</Text>
                <Spacer size="6" />
                <Text color="purple" decoration="underline" align="center" size="18"> @0x94t3z</Text>
            </Box>
        </VStack>
    </Box>
    ),
  });
});

// Uncomment for local server testing
// devtools(app, { serveStatic });

export const GET = handle(app)
export const POST = handle(app)
