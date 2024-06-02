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
   BASE_URL_NEYNAR_V1=<Neynar API V1 base URL>
   BASE_URL_NEYNAR_V2=<Neynar API V2 base URL>
   NEYNAR_API_KEY=<Your Neynar API key>
   GLIDE_PROJECT_ID=<Your Glide project ID>
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
- Neynar API
- Glide
- Vercel

## Demo
Watch the demo on YouTube: [Storage Farcaster Gift Demo](https://www.youtube.com/watch?v=VBQbbLt75l8)

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.