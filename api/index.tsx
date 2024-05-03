import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
// import { storageRegistry } from "../lib/contracts.js";
import { abi } from "../lib/storageAbiBot.js";
import fetch from 'node-fetch';
import { createGlideClient, Chains, CurrenciesByChain } from "@paywithglide/glide-js";
import { encodeFunctionData, hexToBigInt, toHex } from 'viem';
import dotenv from 'dotenv';

// Uncomment this packages to tested on local server
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';

// Uncomment to use Edge Runtime.
// export const config = {
//   runtime: 'edge',
// }

// Load environment variables from .env file
dotenv.config();

export const glideClient = createGlideClient({
  projectId: process.env.GLIDE_PROJECT_ID,
 
  // Lists the chains where payments will be accepted
  chains: [Chains.Base],
  // chains: [base, optimism],
});

export const app = new Frog({
  assetsPath: '/',
  basePath: '/api/frame',
  imageOptions: {
    /* Other default options */
    fonts: [
      {
        name: 'Montserrat',
        source: 'google',
      },
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
const baseUrl = 'https://api.neynar.com/v2/farcaster';

app.frame('/', (c) => {
  currentPage = 1;
  return c.res({
    image: '/storage-farcaster-gift-with-glide.jpeg',
    intents: [
      <Button action="/dashboard">⎋ Lets Get Started</Button>,
    ]
  })
})

app.frame('/dashboard', async (c) => {
  const { frameData } = c;
  const { fid } = frameData as unknown as { buttonIndex?: number; fid?: string };

  try {
    const response = await fetch(`${baseUrl}/user/bulk?fids=${fid}&viewer_fid=${fid}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': 'NEYNAR_API_DOCS',
      },
    });

    const data = await response.json();
    const userData = data.users[0];
  

    return c.res({
      image: (
        <div
          style={{
            alignItems: 'center',
            background: 'white',
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
            fontSize: 35,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 0,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
            border: '1em solid rgb(136,99,208)'
          }}
        >
          <img
            src={userData.pfp_url.toLowerCase().endsWith('.webp') ? '/images/no_avatar.png' : userData.pfp_url}
            style={{
              width: 200,
              height: 200,
              borderRadius: 100,
              boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.5)",
            }}
            width={200} 
            height={200} 
          />
          <p>Hi {userData.display_name} ✋🏻</p>
          Let's find out who among the people you follow is low on storage.
        </div>
      ),
      intents: [
        <Button action={`/show/${fid}`}>⇧ Show User</Button>,
        <Button action="/dashboard">🔄 Refresh</Button>,
        <Button action="/">⏏︎ Cancel</Button>
      ],
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return c.res({
      image: (
          <div
              style={{
                  alignItems: 'center',
                  background: 'rgb(136,99,208)',
                  backgroundSize: '100% 100%',
                  display: 'flex',
                  flexDirection: 'column',
                  flexWrap: 'nowrap',
                  height: '100%',
                  justifyContent: 'center',
                  textAlign: 'center',
                  width: '100%',
                  color: '#432C8D',
                  fontFamily: 'Space Mono',
                  fontSize: 35,
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
          <Button action='/'>⏏︎ Try Again</Button>,
      ],
  });
  }
});

// Handle rate limiting for storage data API
const storageCache = new Map();

async function getStorageData(fid: any) {
  if (storageCache.has(fid)) {
      return storageCache.get(fid);
  } else {
      const response = await fetch(`${baseUrl}/storage/usage?fid=${fid}`, {
          method: 'GET',
          headers: {
              'accept': 'application/json',
              'api_key': 'NEYNAR_API_DOCS',
          },
      });
      if (!response.ok) {
          console.error('API Error:', response.status, await response.text()); // Log the status and text of the error response
          throw new Error(`Failed to fetch storage data: ${response.status}`);
      }
      const storageData = await response.json();
      storageCache.set(fid, storageData); // Cache the data
      return storageData;
  }
}


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
    // Fetch relevant followers data
    const followersResponse = await fetch(`https://api.neynar.com/v1/farcaster/following?fid=${fid}&viewerFid=${fid}&limit=15`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': 'NEYNAR_API_DOCS',
      },
    });
    const followersData = await followersResponse.json();

    // Extract relevant fields from followers data and add total storage left
    const extractedData = await Promise.all(followersData.result.users.map(async (user: { fid: any; username: any; pfp: { url: any; }; }) => {
        const storageData = await getStorageData(user.fid);

        // Calculate total storage left
        const totalStorageLeft = storageData.casts.capacity - storageData.casts.used +
          storageData.reactions.capacity - storageData.reactions.used +
          storageData.links.capacity - storageData.links.used;

        return {
          fid: user.fid,
          username: user.username,
          pfp_url: user.pfp.url,
          totalStorageLeft: totalStorageLeft,
          casts_capacity: storageData.casts.capacity,
          casts_used: storageData.casts.used,
          reactions_capacity: storageData.reactions.capacity,
          reactions_used: storageData.reactions.used,
          links_capacity: storageData.links.capacity,
          links_used: storageData.links.used,
        };
    }));

    // Sort the extracted data in ascending order based on total storage left
    extractedData.sort((a, b) => a.totalStorageLeft - b.totalStorageLeft);

    // Calculate index range to display data from API
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, extractedData.length);
    const displayData = extractedData.slice(startIndex, endIndex);

    // Update totalPages based on the current extracted data
    totalPages = Math.ceil(extractedData.length / itemsPerPage);
    // Limit totalPages to 5
    totalPages = Math.min(totalPages, 5);

    // Get the follower choosen to gift storage
    const toFid = displayData.length > 0 ? displayData[0].fid : null;
    const casts_capacity = displayData.length > 0 ? displayData[0].casts_capacity : 0;
    const casts_used = displayData.length > 0 ? displayData[0].casts_used : 0;
    const reactions_capacity = displayData.length > 0 ? displayData[0].reactions_capacity : 0;
    const reactions_used = displayData.length > 0 ? displayData[0].reactions_used : 0;
    const links_capacity = displayData.length > 0 ? displayData[0].links_capacity : 0;
    const links_used = displayData.length > 0 ? displayData[0].links_used : 0;

    return c.res({
      action: `/show/${fid}`, // Set action to stay on the same route
      image: (
        <div style={{
            alignItems: 'center',
            background: 'white',
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
            fontSize: 35,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 0,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
            border: '1em solid rgb(136,99,208)'
          }}>
           {displayData.map((follower, index) => (
            <div key={index} style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'black', display: 'flex', fontSize: 30, flexDirection: 'column', marginBottom: 20 }}>
              <img
                  src={follower.pfp_url.toLowerCase().endsWith('.webp') ? '/images/no_avatar.png' : follower.pfp_url}
                  style={{
                      width: 200,
                      height: 200,
                      borderRadius: 100,
                      boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.5)",
                  }}
                  width={200}
                  height={200}
                  alt="Profile Picture"
              />
              <p style={{ color: "#432C8D", justifyContent: 'center', textAlign: 'center', fontSize: 40}}>@{follower.username}</p>
              {follower.totalStorageLeft <= 0 ? (
                <p>💾 Out of storage!</p>
              ) : (
                <p>💾 Storage Left: {follower.totalStorageLeft}</p>
              )}
            </div>
          ))}
        </div>
      ),
      intents: [
         <Button action={`/gift/${toFid}/${casts_capacity}/${casts_used}/${reactions_capacity}/${reactions_used}/${links_capacity}/${links_used}`}>◉ View</Button>,
         <Button action="/">⏏︎ Cancel</Button>,
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
                  background: 'rgb(136,99,208)',
                  backgroundSize: '100% 100%',
                  display: 'flex',
                  flexDirection: 'column',
                  flexWrap: 'nowrap',
                  height: '100%',
                  justifyContent: 'center',
                  textAlign: 'center',
                  width: '100%',
                  color: '#432C8D',
                  fontFamily: 'Space Mono',
                  fontSize: 35,
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
          <Button action='/'>⏏︎ Try Again</Button>,
      ],
  });
  }
});


app.frame('/gift/:toFid/:casts_capacity/:casts_used/:reactions_capacity/:reactions_used/:links_capacity/:links_used', async (c) => {
  const { toFid, casts_capacity, casts_used, reactions_capacity, reactions_used, links_capacity, links_used } = c.req.param();

  try {
    const response = await fetch(`${baseUrl}/user/bulk?fids=${toFid}&viewer_fid=${toFid}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': 'NEYNAR_API_DOCS',
      },
    });

    const data = await response.json();
    const userData = data.users[0];

    return c.res({
      action: '/tx-status',
      image: (
        <div
            style={{
              alignItems: 'center',
              background: 'white',
              backgroundSize: '100% 100%',
              display: 'flex',
              flexDirection: 'column',
              flexWrap: 'nowrap',
              height: '100%',
              justifyContent: 'center',
              textAlign: 'center',
              width: '100%',
              color: '#432C8D',
              fontFamily: 'Space Mono',
              fontSize: 35,
              fontStyle: 'normal',
              letterSpacing: '-0.025em',
              lineHeight: 1.4,
              marginTop: 0,
              padding: '0 120px',
              whiteSpace: 'pre-wrap',
              border: '1em solid rgb(136,99,208)'
            }}
          >
            <img
              src={userData.pfp_url.toLowerCase().endsWith('.webp') ? '/images/no_avatar.png' : userData.pfp_url}
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.5)",
              }}
            />
            <p style={{ margin: 15 }}>💾 Capacity</p>
            <p style={{ color: "#432C8D", justifyContent: 'center', textAlign: 'center', fontSize: 24, margin: 0 }}>
              Casts {casts_used} of {casts_capacity}
            </p>

            <p style={{ color: "#432C8D", justifyContent: 'center', textAlign: 'center', fontSize: 24, margin: 0 }}>
              Reactions {reactions_used} of {reactions_capacity}
            </p>

            <p style={{ color: "#432C8D", justifyContent: 'center', textAlign: 'center', fontSize: 24, margin: 0 }}>
              Follows {links_used} of {links_capacity}
            </p>

            <p style={{ margin: 15 }}>🎁 Gift Storage to @{userData.username}?</p>
          </div>
      ),
      intents: [
        <Button.Transaction target={`/tx-gift/${toFid}`}>💰 Gift Storage</Button.Transaction>,
        <Button action="/">⏏︎ Cancel</Button>,
      ]
    })
    } catch (error) {
      console.error('Error fetching user data:', error);
      return c.res({
        image: (
            <div
                style={{
                    alignItems: 'center',
                    background: 'rgb(136,99,208)',
                    backgroundSize: '100% 100%',
                    display: 'flex',
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
                    height: '100%',
                    justifyContent: 'center',
                    textAlign: 'center',
                    width: '100%',
                    color: '#432C8D',
                    fontFamily: 'Space Mono',
                    fontSize: 35,
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
            <Button action='/'>⏏︎ Try Again</Button>,
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

  const { unsignedTransaction } = await glideClient.createSession({
    payerWalletAddress: address,
   
    // Optional. Setting this restricts the user to only
    // pay with the specified currency.
    paymentCurrency: CurrenciesByChain.OptimismMainnet.ETH,
    
    transaction: {
      chainId: Chains.Optimism.caip2,
      to: "0x511372B44231a31527025a3D273C1dc0a83D77aF",
      value: toHex(1313000000000000n),
      input: encodeFunctionData({
        abi: abi,
        functionName: "subscribe",
        args: [BigInt(toFid), 1n],
      }),
    },
  });

  if (!unsignedTransaction) {
    throw new Error("missing unsigned transaction");
  }

  return c.send({
    chainId: Chains.Base.caip2,
    to: unsignedTransaction.address,
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
            display: "flex",
            justifyContent: "center",
            fontSize: 64,
            marginTop: "200px",
          }}
        >
          Gifted storage successfully!
        </div>
      ),
      intents: [
        <Button.Link
          href={`https://basescan.org/tx/${session.sponsoredTransactionHash}`}
        >
          View on Basescan
        </Button.Link>,
      ],
    });
  } catch (e) {
    // If the session is not found, it means the payment is still pending.
    // Let the user know that the payment is pending and show a button to refresh the status.
    return c.res({
      image: (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: 44,
            marginTop: "200px",
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
