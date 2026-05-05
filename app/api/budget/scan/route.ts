import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getAIResponse } from '@/lib/ai'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const text = await getAIResponse([
      {
        role: "system",
        content: "You are a specialized JSON generator for receipt scanning. Respond ONLY with valid JSON."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this receipt/bill/invoice image and extract ALL line items as expenses.
Return a JSON array of objects with these fields:
- "description": what was purchased (string)
- "amount": the price as a number (no currency symbols)
- "category": one of: Food, Transport, Utilities, Entertainment, Shopping, Health, Education, Subscriptions, Housing, Other

Rules:
- If utility bill, use "Utilities".
- If grocery receipt, use "Food".
- Return ONLY the JSON array.`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`
            }
          }
        ]
      }
    ], { 
      jsonMode: true, 
      provider: "groq" 
    });

    // Parse the JSON response
    let items: any[]
    try {
      items = JSON.parse(text)
    } catch {
      return NextResponse.json({ 
        error: 'Could not parse receipt data', 
        rawResponse: text 
      }, { status: 422 })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items found in receipt' }, { status: 422 })
    }

    // Return extracted items for user review — do NOT save yet
    return NextResponse.json({
      success: true,
      itemsExtracted: items.length,
      items: items.map((item: any) => ({
        description: item.description || 'Receipt item',
        amount: Math.abs(Number(item.amount) || 0),
        category: item.category || 'Other',
      })),
    })
  } catch (err: any) {
    console.error('Receipt scan error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to process receipt' },
      { status: 500 }
    )
  }
}
