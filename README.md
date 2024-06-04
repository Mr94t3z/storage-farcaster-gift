# Storage Farcaster Gift

## Description
A Farcaster Frame is used to locate the people you follow on Farcaster who have low storage capacity, allowing you to gift them additional Farcaster Storage.

## Features
- Fetch followers' storage data from the Neynar API.
- Display followers' profiles and their remaining storage capacity.
- Allow users to gift storage to selected followers.
- Track the status of storage gifting transactions.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Mr94t3z/storage-farcaster-gift
   ```
2. Navigate to the project directory:
   ```bash
   cd storage-farcaster-gift
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root directory and add the following environment variables:
   ```plaintext
    GLIDE_PROJECT_ID = "YOUR_GLIDE_PROJECT_ID"
    NEYNAR_API_KEY = "YOUR_NEYNAR_API_KEY"
    BASE_URL_NEYNAR_V2 = "https://api.neynar.com/v2/farcaster"
   ```

## Usage
1. Start the application:
   ```bash
   npm run dev
   ```
2. Access the application in your browser at `http://localhost:5173/api/frame/dev`.

## Technologies Used
- Node.js
- Frog
- Neynar
- Glide
- Vercel

## Sign Up for Glide API Key
Sign up to get your API key for Glide [here](https://paywithglide.xyz/).

## Neynar API Reference
Explore the Neynar API reference [here](https://docs.neynar.com/reference/neynar-farcaster-api-overview).

## Frog Framework
Storage Farcaster Gift is built using the minimal & lightweight framework for Farcaster Frames called [Frog](https://frog.fm/).

## Contract Addresses
The contracts are deployed at the following addresses:

| Contract       | Address                                      |
|----------------|----------------------------------------------|
| StorageRegistry| [0x00000000fcce7f938e7ae6d3c335bd6a1a7c593d](https://optimistic.etherscan.io/address/0x00000000fcce7f938e7ae6d3c335bd6a1a7c593d) |

## Demo
Watch the demo on YouTube: [Storage Farcaster Gift Demo](https://youtu.be/qrBpwwsNNHM)

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.