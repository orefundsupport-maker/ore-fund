import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          color: 'white',
          background: 'crimson',
          width: '100%',
          height: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ORE-FUND TEST
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}