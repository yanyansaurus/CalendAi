import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

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

    // Use Gemini vision to extract expense data
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
      {
        text: `Analyze this receipt/bill/invoice image and extract ALL line items as expenses.
Return a JSON array of objects with these fields:
- "description": what was purchased (string)
- "amount": the price as a number (no currency symbols)
- "category": one of: Food, Transport, Utilities, Entertainment, Shopping, Health, Education, Subscriptions, Housing, Other

If there's a total, include it as a separate item with description "Total" and category matching the main category.
If this is a utility bill, use "Utilities". If it's a grocery receipt, use "Food".

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation.
Example: [{"description": "Coffee", "amount": 4.50, "category": "Food"}]`
      }
    ])

    const responseText = result.response.text().trim()
    
    // Parse the JSON response (handle markdown code fences)
    let items: any[]
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      items = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ 
        error: 'Could not parse receipt data', 
        rawResponse: responseText 
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
