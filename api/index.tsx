import { Button, Frog } from 'frog'
import { neynar } from 'frog/hubs'
import { handle } from 'frog/vercel'
import { storageRegistry } from "../lib/contracts.js";
import fetch from 'node-fetch';

// Uncomment this packages to tested on local server
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';

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

const baseUrl = 'https://api.neynar.com/v2/farcaster';

app.frame('/', (c) => {
  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(to right, #432889, #17101F)',
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
          fontSize: 35,
          fontStyle: 'normal',
          letterSpacing: '-0.025em',
          lineHeight: 1.4,
          marginTop: 0,
          padding: '0 120px',
          whiteSpace: 'pre-wrap',
        }}
      >
       Let's find people you follow low on storage and gift them storage.
      </div>
    ),
    intents: [
      <Button action="/dashboard">🖱️ Lets Get Started</Button>,
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
            src={userData.pfp_url}
            style={{
              width: 200,
              height: 200,
              borderRadius: 100,
              boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.5)",
            }}
          />
          <p>Hi {userData.display_name} ✋🏻</p>
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

// Looping user data frame
app.frame('/show/:fid', async (c) => {
  const { fid } = c.req.param();

  try {
    // Fetch relevant followers data
    const followersResponse = await fetch(`${baseUrl}/followers/relevant?target_fid=${fid}&viewer_fid=${fid}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': 'NEYNAR_FROG_FM',
      },
    });
    const followersData = await followersResponse.json();

    // Extract relevant fields from followers data
    const extractedData = followersData.top_relevant_followers_hydrated.map((item: { user: { fid: any; username: any; pfp_url: any; }; }) => ({
      fid: item.user.fid,
      username: item.user.username,
      pfp_url: item.user.pfp_url,
    }));

    console.log(extractedData);

    let minStorageData: { totalStorageLeft: any; fid?: any; storageData?: any; } | null = null; // Initialize minStorageData to null
    let toFid: any = null; // Initialize toFid variable

    // Iterate through each fid and fetch storage data
    await Promise.all(extractedData.map(async (user: { fid: any; }) => {
      const userFid = user.fid;

      try {
        const storageResponse = await fetch(`https://api.neynar.com/v2/farcaster/storage/usage?fid=${userFid}`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'api_key': 'NEYNAR_FROG_FM', // Replace with your actual API key
          },
        });
        const storageData = await storageResponse.json();

        // Calculate total storage left
        const totalStorageLeft = storageData.casts.capacity - storageData.casts.used +
          storageData.reactions.capacity - storageData.reactions.used +
          storageData.links.capacity - storageData.links.used;

        // Check if storage data for current fid is lower than others
        if (!minStorageData || totalStorageLeft < minStorageData.totalStorageLeft) {
          minStorageData = {
            fid: userFid,
            totalStorageLeft: totalStorageLeft,
            storageData: storageData
          };
        }
        // Assign value to toFid inside the loop
        toFid = minStorageData.fid;
      } catch (error) {
        console.error(`Error fetching storage data for FID: ${userFid}`, error);
      }
    }));

    // Now you can use toFid outside of the loop
    console.log("ToFid:", toFid); // Example usage



    return c.res({
      action: `/show/${fid}`, // Set action to stay on the same route
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
           {extractedData.map((follower: { pfp_url: string | undefined; username: any; fid: any; }, index: any) => (
            <div key={index} style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'black', display: 'flex', fontSize: 30, flexDirection: 'column', marginBottom: 20 }}>
              {/* Render the image only if follower.fid matches minStorageData.fid */}
              {minStorageData && minStorageData.fid === follower.fid && (
                <img
                  src={follower.pfp_url}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 100,
                    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.5)",
                  }}
                />
              )}
              {minStorageData && minStorageData.fid === follower.fid && (
                <p style={{ color: "#432C8D", justifyContent: 'center', textAlign: 'center', fontSize: 40}}>@{follower.username}</p>
              )}
              {minStorageData && minStorageData.fid === follower.fid && (
                <p>💾 Storage Left: {minStorageData.totalStorageLeft}</p>
              )}
            </div>
          ))}
        </div>
      ),
      intents: [
        // <Button value="back">⬅️ Back</Button>,
        <Button action={`/gift/${toFid}`}>◉ View</Button>,
        // <Button value="next">Next ➡️</Button>,
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


app.frame('/gift/:toFid', async (c) => {
  const { toFid } = c.req.param();

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
              background: 'linear-gradient(to right, #432889, #17101F)',
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
              fontSize: 35,
              fontStyle: 'normal',
              letterSpacing: '-0.025em',
              lineHeight: 1.4,
              marginTop: 0,
              padding: '0 120px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {/* <img
              src={userData.pfp_url}
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.5)",
              }}
            /> */}
            🎁 Give Storage to @{userData.username}?
          </div>
      ),
      intents: [
        <Button.Transaction target={`/tx-gift/${toFid}`}>🎁 Gift Storage</Button.Transaction>,
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
devtools(app, { serveStatic });

export const GET = handle(app)
export const POST = handle(app)
