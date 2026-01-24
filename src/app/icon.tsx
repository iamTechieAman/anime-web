import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
    width: 32,
    height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 24,
                    background: '#09090b',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '20%',
                    position: 'relative',
                }}
            >
                {/* Play Button Triangle with Gradient */}
                <div
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: '14px solid #a855f7', // Purple base
                        borderTop: '9px solid transparent',
                        borderBottom: '9px solid transparent',
                        marginLeft: '4px', // Visual centering adjustment
                        filter: 'drop-shadow(0 0 2px #06b6d4)', // Cyan glow
                    }}
                />
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    );
}
