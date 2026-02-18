import { NextResponse } from 'next/server'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ message: `Update status for order ${params.id}` })
}
