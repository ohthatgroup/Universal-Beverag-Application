import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Orders API' })
}

export async function POST() {
  return NextResponse.json({ message: 'Create order' })
}
