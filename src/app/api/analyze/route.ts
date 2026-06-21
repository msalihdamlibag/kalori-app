import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API anahtarı yapılandırılmamış" },
        { status: 500 }
      );
    }

    const client = new Anthropic();
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Görsel gerekli" }, { status: 400 });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const mediaType = image.match(/^data:(image\/\w+);/)?.[1] || "image/jpeg";

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `Bu görseldeki yiyeceği/yiyecekleri analiz et ve kalori hesapla.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma:
{
  "items": [
    {
      "name": "yiyecek adı",
      "portion": "porsiyon/miktar tahmini",
      "calories": sayı,
      "protein": sayı (gram),
      "carbs": sayı (gram),
      "fat": sayı (gram)
    }
  ],
  "totalCalories": toplam kalori sayısı,
  "confidence": "high" | "medium" | "low",
  "notes": "varsa ek notlar"
}

Porsiyon tahmininde tabaktaki miktarı dikkate al. Paketli gıdaysa ambalaj bilgilerini oku. Meyve/sebzeyse boyutunu tahmin et.`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Analiz yapılamadı" },
        { status: 500 }
      );
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analiz hatası:", error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "API anahtarı geçersiz. Lütfen ayarları kontrol edin." },
          { status: 500 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin." },
          { status: 429 }
        );
      }
      if (error.status === 400) {
        return NextResponse.json(
          { error: "Görsel işlenemedi. Lütfen farklı bir fotoğraf çekmeyi deneyin." },
          { status: 400 }
        );
      }
      if (error.status === 529) {
        return NextResponse.json(
          { error: "AI servisi şu anda meşgul. Lütfen birkaç dakika sonra tekrar deneyin." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: `AI servisi hatası (${error.status}). Lütfen daha sonra tekrar deneyin.` },
        { status: error.status || 500 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI yanıtı işlenemedi. Lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
