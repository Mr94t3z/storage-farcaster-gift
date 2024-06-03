import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const main = async () => {
    const server = "https://hubs.airstack.xyz";
    const apiKey = process.env.AIRSTACK_API_KEY;
  
    try {
      const response = await fetch(`${server}/v1/storageLimitsByFid?fid=16098`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-airstack-hubs": apiKey,
        },
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const json = await response.json();
  
      console.log(json);
    } catch (e) {
      console.error(e);
    }
  }
  
  main();
  