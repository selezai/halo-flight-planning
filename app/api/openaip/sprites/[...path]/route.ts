import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const SPRITE_RE = /^openaip(@2x)?(\.(json|png))?$/;

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Reconstruct sprite path: openaip.json, openaip.png, openaip@2x.json, etc.
    const spritePath = params.path.join('/');
    if (!SPRITE_RE.test(spritePath)) {
      return NextResponse.json(
        { error: 'Invalid sprite path' },
        { status: 400 }
      );
    }
    
    // Determine file extension and content type
    const ext = path.extname(spritePath);
    let contentType: string;
    
    switch (ext) {
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      default:
        // MapLibre requests sprites without extension, try both
        // First try .json, then .png based on Accept header
        const acceptHeader = request.headers.get('accept') || '';
        if (acceptHeader.includes('image')) {
          return await serveSprite(`${spritePath}.png`, 'image/png');
        }
        return await serveSprite(`${spritePath}.json`, 'application/json');
    }

    return await serveSprite(spritePath, contentType);
  } catch (error) {
    console.error('Sprite serve error:', error);
    return NextResponse.json(
      { error: 'Sprite not found' },
      { status: 404 }
    );
  }
}

async function serveSprite(spritePath: string, contentType: string): Promise<NextResponse> {
  // Sprites are stored in public/sprites/
  const filePath = path.join(process.cwd(), 'public', 'sprites', spritePath);
  
  try {
    const fileContent = await readFile(filePath);
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800', // Cache for 1 week
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    // If file not found, return 404
    throw new Error(`Sprite not found: ${spritePath}`);
  }
}
