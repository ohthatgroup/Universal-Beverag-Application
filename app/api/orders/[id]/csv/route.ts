import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: `CSV export for order ${params.id}` })
}
