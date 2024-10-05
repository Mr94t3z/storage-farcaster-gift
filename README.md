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
    LUM0X_API_KEY = "YOUR_LU0X_API_KEY"
    AIRSTACK_API_KEY = "YOUR_AIRSTACK_API_KEY"
   ```

## Usage
1. Start the application:
   ```bash
   npm run dev
   ```
2. Access the application in your browser at `http://localhost:5173/api/frame/dev`.

---

## Technologies Used
- **Node.js**: JavaScript runtime for building server-side applications.
- **Frog**: A minimal and lightweight framework for Farcaster Frames.
- **Lum0x**: A computation layer for Farcaster that empowers key contributors.
- **Neynar**: API service for interacting with Farcaster.
- **Glide**: Payment integration and API service.
- **Vercel**: Platform for deploying and hosting web applications.

## What is Lum0x?
Lum0x provides a robust computation layer for the Farcaster ecosystem, enabling developers and creators to build engaging content like Farcaster Frames. It supports key contributors in generating and managing content effectively.

### Additional Resources
- **Lum0x Website**: [lum0x.com](https://lum0x.com)
- **Lum0x SDK**: [sdk.lum0x.com](https://sdk.lum0x.com)
- **Lum0x Documentation**: [docs.lum0x.com](https://docs.lum0x.com)

### Getting Started with Lum0x
Sign up for an API key to start using Lum0x: [Get Lum0x API Key](https://buildathon.lum0x.com/)

### Getting Started with Glide
Sign up for an API key for Glide: [Get Glide API Key](https://paywithglide.xyz/)

### Neynar API Reference
Explore the Neynar API reference here: [Neynar API Documentation](https://docs.neynar.com/reference/neynar-farcaster-api-overview)

### About Frog
The Storage Farcaster Gift project utilizes Frog, a minimal and lightweight framework specifically designed for Farcaster Frames. Learn more about Frog: [Frog Framework](https://frog.fm/)

---

## Farcaster: Storage Registry Contract
The contract are deployed at the following address:

| Contract       | Address                                      |
|----------------|----------------------------------------------|
| StorageRegistry| [0x00000000fcCe7f938e7aE6D3c335bD6a1a7c593D](https://optimistic.etherscan.io/address/0x00000000fcce7f938e7ae6d3c335bd6a1a7c593d) |

## Demo
Watch the demo on YouTube: [Storage Farcaster Gift Demo](https://youtu.be/qrBpwwsNNHM)

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.