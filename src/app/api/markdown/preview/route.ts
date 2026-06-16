import { NextRequest, NextResponse } from 'next/server';
import { renderMarkdown } from '@/lib/markdown';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const html = await renderMarkdown(content);

    return NextResponse.json({ html });
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return NextResponse.json(
      { error: 'Failed to render markdown' },
      { status: 500 }
    );
  }
}
