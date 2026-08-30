import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { renderMarkdown } from '@/lib/markdown'

const schema = z.object({ contentMd: z.string().max(500_000) })
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { const { contentMd } = schema.parse(await request.json()); return NextResponse.json({ html: await renderMarkdown(contentMd) }) }
  catch (error) { if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid Markdown', details: error.errors }, { status: 400 }); return NextResponse.json({ error: 'Preview failed' }, { status: 500 }) }
}
