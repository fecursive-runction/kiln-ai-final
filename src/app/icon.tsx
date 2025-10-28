import { ImageResponse } from 'next/og'
import { Factory } from 'lucide-react'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1E3A8A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px'
        }}
      >
        <Factory
          style={{
            color: 'white'
          }}
          size={20}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
