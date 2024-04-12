import { Button, Frog } from 'frog'
import { neynar } from 'frog/hubs'
import { handle } from 'frog/vercel'
import { storageRegistry } from "../lib/contracts.js";
import fetch from 'node-fetch';

// Uncomment this packages to tested on local server
// import { devtools } from 'frog/dev';
// import { serveStatic } from 'frog/serve-static';

// Uncomment to use Edge Runtime.
// export const config = {
//   runtime: 'edge',
// }

export const app = new Frog({
  assetsPath: '/',
  basePath: '/api/frame',
  hub: neynar({ apiKey: 'NEYNAR_FROG_FM' }),
  verify: 'silent',
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
    image: '/storage-farcaster-gift.jpeg',
    intents: [
      <Button action="/dashboard">📌 Lets Get Started</Button>,
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
        'api_key': 'NEYNAR_FROG_FM',
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
          <p>Hi {userData.username} ✋🏻</p>
          Let's find out who among the people you follow is low on storage.
        </div>
      ),
      intents: [
        <Button action={`/show/${fid}`}>💁🏻 Show User</Button>,
        <Button action="/">🙅🏻‍♂️ Cancel</Button>
      ],
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return c.res({
      image: <div style={{ color: 'red' }}>An error occurred.</div>,
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
              'api_key': 'NEYNAR_FROG_FM',
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
    const followersResponse = await fetch(`https://api.neynar.com/v1/farcaster/following?fid=${fid}&viewerFid=${fid}&limit=150`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': 'NEYNAR_FROG_FM',
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
         currentPage > 1 && <Button value="back">⬅️ Back</Button>,
         <Button action={`/gift/${toFid}/${casts_capacity}/${casts_used}/${reactions_capacity}/${reactions_used}/${links_capacity}/${links_used}`}>◉ View</Button>,
        currentPage < totalPages && <Button value="next">Next ➡️</Button>,
        <Button action="/">🙅🏻‍♂️ Cancel</Button>
      ],
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return c.res({
      image: <div style={{ color: 'red' }}>An error occurred.</div>,
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
        'api_key': 'NEYNAR_FROG_FM',
      },
    });

    const data = await response.json();
    const userData = data.users[0];

    return c.res({
      action: '/finish',
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
        <Button action="/">🙅🏻‍♂️ Cancel</Button>,
      ]
    })
    } catch (error) {
      console.error('Error fetching user data:', error);
      return c.res({
        image: <div style={{ color: 'red' }}>An error occurred.</div>,
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
  const { toFid } = c.req.param();

  // Get current storage price
  const units = 1n;
  const price = await storageRegistry.read.price([units]);

  return c.contract({
    abi: storageRegistry.abi,
    chainId: "eip155:10",
    functionName: "rent",
    args: [BigInt(toFid), units],
    to: storageRegistry.address,
    value: price,
  });
})


app.frame('/finish', (c) => {
  const { transactionId } = c;
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
          color: 'white',
          fontSize: 60,
          fontFamily: 'Space Mono',
          fontStyle: 'normal',
          letterSpacing: '-0.025em',
          lineHeight: 1.4,
          marginTop: 0,
          padding: '0 120px',
          whiteSpace: 'pre-wrap',
        }}
      >
        <div style={{ alignItems: 'center', color: 'black', display: 'flex', fontSize: 30, flexDirection: 'column', marginBottom: 60 }}>
            <p style={{ justifyContent: 'center', textAlign: 'center', fontSize: 40}}>🧾 Transaction ID:</p>
            <p>{transactionId}</p>
        </div>
      </div>
    ), 
    intents: [
      <Button.Link href="/">🏠 Home</Button.Link>,
      <Button.Link href={`https://optimistic.etherscan.io/tx/${transactionId}`}>
      View on Explorer
    </Button.Link>
    ]
  })
})


// Uncomment for local server testing
// devtools(app, { serveStatic });

export const GET = handle(app)
export const POST = handle(app)
