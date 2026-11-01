const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || '';
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud';

const PINATA_API_URL = 'https://api.pinata.cloud';

/**
 * Upload content to IPFS via Pinata and return the CID (IPFS hash).
 * Requires NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET_KEY env vars.
 */
export async function uploadToIPFS(
  content: string,
  name: string
): Promise<string | null> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    console.warn('Pinata API keys not configured. Skipping IPFS upload.');
    return null;
  }

  try {
    const body = JSON.stringify({
      pinataContent: { content },
      pinataMetadata: { name },
    });

    const res = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body,
    });

    if (!res.ok) {
      console.error('Pinata upload failed:', res.status);
      return null;
    }

    const data = await res.json();
    return data.IpfsHash as string;
  } catch (e) {
    console.error('IPFS upload error:', e);
    return null;
  }
}

/**
 * Fetch content from IPFS by CID.
 * Falls back to the Pinata gateway.
 */
export async function fetchFromIPFS(cid: string): Promise<string | null> {
  try {
    const res = await fetch(`${PINATA_GATEWAY}/ipfs/${cid}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data === 'string' ? data : data.content || null;
  } catch (e) {
    console.error('IPFS fetch error:', e);
    return null;
  }
}

/**
 * Get the full gateway URL for an IPFS CID.
 */
export function getIPFSUrl(cid: string): string {
  return `${PINATA_GATEWAY}/ipfs/${cid}`;
}
