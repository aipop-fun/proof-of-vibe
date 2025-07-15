import { ImageResponse } from "next/og";

export const alt = process.env.NEXT_PUBLIC_FRAME_NAME || "Timbra";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div tw="h-full w-full flex justify-center items-center relative" style={{ backgroundColor: '#5D3FD3' }}>
        <div tw="flex items-center">
          <div tw="flex mr-8">
            <svg width="110" height="110" viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg">
              <rect width="110" height="110" rx="25" ry="25" fill="#F5F5F5" />
              <g transform="translate(55, 55)">
                <path d="M-35 0 
                         L-20 0 
                         L-15 -8 
                         L-10 0 
                         L-5 35 
                         L0 -25 
                         L5 0 
                         L10 8 
                         L15 0 
                         L35 0"
                  fill="none" stroke="#5D3FD3" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
              </g>
            </svg>
          </div>

          <div tw="flex">
            <h1 tw="text-white text-8xl font-bold"
              style={{
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                fontWeight: 700,
                fontSize: '110px',
                lineHeight: '1',
                margin: 0
              }}>
              Timbra
            </h1>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}